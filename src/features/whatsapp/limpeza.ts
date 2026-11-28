import "server-only";
import type { criarClienteAdmin } from "@/lib/supabase/admin";
import { apagarArquivosDoContato } from "./midia";
import { DIAS_APAGAR_TESTE_ACABOU, DIAS_PARA_APAGAR } from "./prazos";
import { hojeISO, somarDias } from "@/lib/datas";

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

/*
 * "Teste acabou" (28/11/2026, pedido do Diego): o cartão de quem terminou o teste sem assinar e NUNCA escreveu
 * nada no WhatsApp sai da Central 7 dias depois do fim do teste. Apaga só a conversa (contato, mensagens e
 * arquivos); a conta continua no admin (quem cuida dela é limpeza-contas.ts). Só pega o cartão que o robô cuida
 * em "Cadastrou": quem você assumiu, "Precisa de você", bloqueados e spam ficam. Roda junto com a limpeza acima.
 */
export async function limparTesteAcabou(admin: ReturnType<typeof criarClienteAdmin>) {
  const { data: contatos, error } = await admin
    .from("whatsapp_contatos")
    .select("telefone, profissional_id")
    .eq("etapa", "cadastrou")
    .eq("atendimento", "robo")
    .eq("bloqueado", false)
    .is("ultima_do_contato_em", null)
    .not("profissional_id", "is", null)
    .limit(300);
  if (error || !contatos?.length) return { apagadas: 0 };

  // conta no teste, que acabou há pelo menos 7 dias
  const limite = somarDias(hojeISO(), -DIAS_APAGAR_TESTE_ACABOU);
  const ids = [...new Set(contatos.map((c) => c.profissional_id as string))];
  const { data: perfis } = await admin.from("profiles").select("id").in("id", ids).eq("plano", "teste").not("ativa_ate", "is", null).lte("ativa_ate", limite);
  const vencidas = new Set((perfis ?? []).map((p) => p.id));
  let telefones = contatos.filter((c) => vencidas.has(c.profissional_id as string)).map((c) => c.telefone);
  if (!telefones.length) return { apagadas: 0 };

  // garantia: se alguma mensagem dela estiver na conversa, fica
  const { data: escreveram } = await admin.from("whatsapp_mensagens").select("telefone").in("telefone", telefones).eq("de", "contato");
  const comResposta = new Set((escreveram ?? []).map((m) => m.telefone));
  telefones = telefones.filter((t) => !comResposta.has(t));
  if (!telefones.length) return { apagadas: 0 };

  for (const telefone of telefones) await apagarArquivosDoContato(admin, telefone).catch(() => null);
  const { error: erroApagar } = await admin.from("whatsapp_contatos").delete().in("telefone", telefones);
  return { apagadas: erroApagar ? 0 : telefones.length };
}
