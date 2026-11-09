import { linkWhatsApp } from "@/lib/telefone";
import { montarMensagemDoAtendimento, type ContextoMensagem, type DadosAtendimento } from "@/features/mensagens/modelos";

export { descreverDia } from "@/features/mensagens/modelos";

/** Link wa.me pronto com a mensagem (lembrete ou qualquer outro modelo) do atendimento. */
export function linkMensagem(telefone: string, modelo: string, a: DadosAtendimento, ctx: ContextoMensagem) {
  return linkWhatsApp(telefone, montarMensagemDoAtendimento(modelo, a, ctx));
}
