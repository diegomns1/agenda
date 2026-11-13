import "server-only";
import type { criarClienteAdmin } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof criarClienteAdmin>;

/**
 * A Meta só deixa mandar mensagem livre (texto, foto, áudio) até 24 h depois da última mensagem da pessoa
 * (72 h se ela veio de anúncio). Devolve o erro em português, ou null se pode mandar.
 */
export async function erroDeJanela(admin: Admin, telefone: string): Promise<string | null> {
  const { data: c } = await admin.from("whatsapp_contatos").select("ultima_do_contato_em, origem, bloqueado").eq("telefone", telefone).maybeSingle();
  if (!c) return "Contato não encontrado.";
  if (c.bloqueado) return "Este contato está bloqueado. Desbloqueie para mandar mensagem.";
  const janelaH = c.origem ? 72 : 24;
  const ultima = c.ultima_do_contato_em ? new Date(c.ultima_do_contato_em).getTime() : 0;
  if (Date.now() - ultima > janelaH * 3_600_000) {
    return `Passaram mais de ${janelaH} h desde a última mensagem dessa pessoa: a Meta só deixa responder depois que ela escrever de novo.`;
  }
  return null;
}
