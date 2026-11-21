import "server-only";
import type { criarClienteAdmin } from "@/lib/supabase/admin";
import { hojeISO, somarDias } from "@/lib/datas";
import { apagarArquivosDoContato } from "@/features/whatsapp/midia";

/*
 * Limpeza automática de contas abandonadas (21/11/2026, pedido do Diego).
 * Apaga DE VEZ (login, cadastro e conversa da Central) a conta que:
 *   - estava no teste grátis e o teste acabou há pelo menos DIAS_DEPOIS_DO_FIM dias (tempo para responder);
 *   - recebeu alguma mensagem nossa (oferta de ajuda, pedido de feedback ou "parou", por WhatsApp ou e-mail),
 *     a última há pelo menos DIAS_DEPOIS_DO_FIM dias;
 *   - não respondeu nada no WhatsApp depois disso;
 *   - não cadastrou nenhum serviço, nenhum cliente e nenhum horário;
 *   - não tem cobrança nem assinatura no Asaas e não é conta de admin.
 * Roda uma vez por dia, às 4h de Brasília (api/cron/lembretes). Não tem volta: se a pessoa voltar, faz cadastro novo.
 */

/** Espera depois do fim do teste antes de apagar: o pedido de feedback sai no último dia e ela pode responder. */
export const DIAS_DEPOIS_DO_FIM = 2;
const MAXIMO_POR_DIA = 50;

type Admin = ReturnType<typeof criarClienteAdmin>;

/** Contas que entram na limpeza hoje (sem apagar nada). Usado também para mostrar quem sairia. */
export async function contasAbandonadas(admin: Admin) {
  const limite = somarDias(hojeISO(), -DIAS_DEPOIS_DO_FIM);
  const { data: perfis } = await admin
    .from("profiles")
    .select("id, nome, ativa_ate")
    .eq("plano", "teste")
    .eq("status", "aprovada")
    .is("asaas_subscription_id", null)
    .not("ativa_ate", "is", null)
    .lte("ativa_ate", limite)
    .limit(MAXIMO_POR_DIA * 2);
  const alvo: { id: string; nome: string }[] = [];
  for (const p of perfis ?? []) {
    if (alvo.length >= MAXIMO_POR_DIA) break;
    // nada cadastrado (um registro de qualquer um já basta para ficar de fora)
    const contagens = await Promise.all(
      (["servicos", "clientes", "agendamentos", "cobrancas"] as const).map((t) =>
        admin.from(t).select("id", { count: "exact", head: true }).eq("profissional_id", p.id),
      ),
    );
    if (contagens.some((r) => r.error || (r.count ?? 0) > 0)) continue;

    // recebeu alguma mensagem nossa, e a última foi há pelo menos 2 dias (tempo para responder)
    const { data: envios } = await admin
      .from("ativacao_envios")
      .select("enviado_em")
      .eq("profissional_id", p.id)
      .eq("ok", true)
      .order("enviado_em", { ascending: true });
    const primeiroEnvio = envios?.[0]?.enviado_em;
    const ultimoEnvio = envios?.[envios.length - 1]?.enviado_em;
    if (!primeiroEnvio || !ultimoEnvio) continue;
    if (Date.now() - new Date(ultimoEnvio).getTime() < DIAS_DEPOIS_DO_FIM * 86_400_000) continue;

    // e não respondeu no WhatsApp depois disso
    const { data: contatos } = await admin.from("whatsapp_contatos").select("telefone").eq("profissional_id", p.id);
    const telefones = (contatos ?? []).map((c) => c.telefone);
    if (telefones.length) {
      const { count: respostas } = await admin
        .from("whatsapp_mensagens")
        .select("id", { count: "exact", head: true })
        .in("telefone", telefones)
        .eq("de", "contato")
        .gt("criado_em", primeiroEnvio);
      if ((respostas ?? 0) > 0) continue;
    }

    // nunca conta de admin
    const { data: usuario } = await admin.auth.admin.getUserById(p.id);
    if ((usuario.user?.app_metadata as { role?: string } | undefined)?.role === "admin") continue;

    alvo.push({ id: p.id, nome: p.nome });
  }
  return alvo;
}

/** Apaga as contas abandonadas e as conversas delas na Central. Devolve quantas apagou. */
export async function limparContasAbandonadas(admin: Admin) {
  const alvo = await contasAbandonadas(admin);
  let apagadas = 0;
  for (const c of alvo) {
    const { data: contatos } = await admin.from("whatsapp_contatos").select("telefone").eq("profissional_id", c.id);
    for (const { telefone } of contatos ?? []) {
      await apagarArquivosDoContato(admin, telefone).catch(() => null);
      await admin.from("whatsapp_contatos").delete().eq("telefone", telefone); // as mensagens saem junto
    }
    // apagar o login apaga o cadastro e o resto em cascata
    const { error } = await admin.auth.admin.deleteUser(c.id);
    if (error) console.error("[limpeza de contas]", c.nome, error.message);
    else apagadas++;
  }
  if (apagadas) console.log("[limpeza de contas] apagadas:", apagadas, alvo.map((c) => c.nome).join(", "));
  return { apagadas };
}
