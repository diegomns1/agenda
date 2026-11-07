"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterUsuario } from "@/lib/auth";
import { enviarPush, pushConfigurado } from "@/lib/push";
import type { EstadoForm } from "@/components/formulario/tipos";

function revalidar() {
  revalidatePath("/lembretes");
  revalidatePath("/agenda");
  revalidatePath("/", "layout");
}

async function sessao() {
  const usuario = await obterUsuario();
  if (!usuario) throw new Error("Sessão expirada. Entre de novo.");
  return { usuario, supabase: await criarClienteServidor() };
}

/** Marca (ou desmarca) que a cliente já foi avisada do atendimento. */
export async function marcarClienteAvisada(agendamentoId: string, avisada: boolean): Promise<EstadoForm> {
  const { supabase } = await sessao();
  const { error } = await supabase
    .from("agendamentos")
    .update({ cliente_avisada_em: avisada ? new Date().toISOString() : null })
    .eq("id", agendamentoId);
  if (error) return { erro: `Não foi possível salvar: ${error.message}` };
  revalidar();
  return { ok: true, mensagem: avisada ? "Marcado como avisada." : "Desmarcado." };
}

const esquemaInscricao = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Guarda a inscrição de push deste aparelho. */
export async function salvarInscricaoPush(inscricao: unknown): Promise<EstadoForm> {
  const r = esquemaInscricao.safeParse(inscricao);
  if (!r.success) return { erro: "Inscrição inválida." };

  const { usuario, supabase } = await sessao();
  const h = await headers();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      profissional_id: usuario.id,
      endpoint: r.data.endpoint,
      p256dh: r.data.keys.p256dh,
      auth: r.data.keys.auth,
      user_agent: h.get("user-agent")?.slice(0, 200) ?? null,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { erro: `Não foi possível ativar: ${error.message}` };
  revalidar();
  return { ok: true, mensagem: "Notificações ativadas neste aparelho." };
}

export async function removerInscricaoPush(endpoint: string): Promise<EstadoForm> {
  const { supabase } = await sessao();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { erro: `Não foi possível desativar: ${error.message}` };
  revalidar();
  return { ok: true, mensagem: "Notificações desativadas neste aparelho." };
}

/**
 * Remove as inscrições de todos os outros aparelhos/navegadores, mantendo só a atual.
 * Útil quando a mesma pessoa ativou no Chrome e no app instalado (ou em um domínio antigo)
 * e passou a receber cada aviso duas vezes.
 */
export async function manterSoEsteAparelho(endpointAtual: string): Promise<EstadoForm> {
  const { usuario, supabase } = await sessao();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("profissional_id", usuario.id)
    .neq("endpoint", endpointAtual)
    .select("id");
  if (error) return { erro: `Não foi possível remover: ${error.message}` };
  revalidar();
  const n = data?.length ?? 0;
  return { ok: true, mensagem: n === 0 ? "Só este aparelho já estava cadastrado." : `${n} outro${n === 1 ? "" : "s"} aparelho${n === 1 ? "" : "s"} removido${n === 1 ? "" : "s"}. Agora só este recebe os avisos.` };
}

/** Envia uma notificação de teste para todos os aparelhos da profissional. */
export async function enviarPushTeste(): Promise<EstadoForm> {
  if (!pushConfigurado()) return { erro: "Notificações não configuradas no servidor (chaves VAPID)." };

  const { usuario, supabase } = await sessao();
  const { data: inscricoes } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("profissional_id", usuario.id);
  if (!inscricoes?.length) return { erro: "Nenhum aparelho com notificações ativadas." };

  const r = await enviarPush(inscricoes, {
    title: "Teste de notificação ✅",
    body: "Se você está vendo isto, os lembretes vão chegar aqui.",
    url: "/lembretes",
    tag: "teste",
  });

  if (r.endpointsMortos.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", r.endpointsMortos);
  }

  if (r.enviados === 0) return { erro: "Não foi possível entregar. Tente desativar e ativar de novo." };
  return { ok: true, mensagem: `Enviada para ${r.enviados} aparelho${r.enviados === 1 ? "" : "s"}.` };
}
