import "server-only";
import type { criarClienteAdmin } from "@/lib/supabase/admin";
import { apagarArquivosDoContato } from "./midia";
import { DIAS_PARA_APAGAR } from "./prazos";

/*
 * Limpeza automática da Central (16/11/2026): conversa parada há 5 dias é apagada (contato, mensagens e arquivos),
 * para o painel não encher de quem nunca respondeu. "Parada" = nenhuma mensagem, de nenhum dos lados, nesse tempo
 * (reenviar uma mensagem pronta conta: a pessoa ganha mais 5 dias para responder).
 * Ficam de fora:
 *   - quem está em "Precisa de você" (a IA chamou o Diego e ele ainda não resolveu);
 *   - quem assinou (cliente pagante: o histórico serve para o suporte);
 *   - "Robôs e spam" e bloqueados (apagados, voltariam como contato novo e a IA responderia de novo).
 * Se a pessoa escrever depois de apagada, vira um cartão novo. Chamada uma vez por dia pela tarefa automática.
 */
export async function limparConversasParadas(admin: ReturnType<typeof criarClienteAdmin>) {
  const limite = new Date(Date.now() - DIAS_PARA_APAGAR * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("whatsapp_contatos")
    .select("telefone")
    .lt("ultima_msg_em", limite)
    .eq("bloqueado", false)
    .neq("atendimento", "precisa")
    .not("etapa", "in", "(spam,assinou)")
    .limit(300);
  if (error || !data?.length) return { apagadas: 0 };

  const telefones = data.map((c) => c.telefone);
  for (const telefone of telefones) await apagarArquivosDoContato(admin, telefone).catch(() => null);
  // as mensagens saem junto (cascade)
  const { error: erroApagar } = await admin.from("whatsapp_contatos").delete().in("telefone", telefones);
  return { apagadas: erroApagar ? 0 : telefones.length };
}
