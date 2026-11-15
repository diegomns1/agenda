import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/*
 * A mensagem chegou mesmo? (15/11/2026)
 * A Meta aceita o envio na hora (devolve o id) e só depois avisa, pelo mesmo webhook, o que aconteceu:
 * sent → delivered → read, ou failed com o motivo. Antes estes avisos eram ignorados e o painel dizia
 * "enviada" mesmo quando a Meta barrava (ex.: problema na forma de pagamento da conta do WhatsApp).
 * Só as mensagens gravadas com o id da Meta (as mensagens prontas / modelos) são acompanhadas.
 */

export type SituacaoEntrega = "enviada" | "entregue" | "lida" | "falhou";
export type AvisoEntrega = { wamid: string; situacao: SituacaoEntrega; codigo?: number; detalhe?: string };

const DA_META: Record<string, SituacaoEntrega> = { sent: "enviada", delivered: "entregue", read: "lida", failed: "falhou" };
const ORDEM: Record<SituacaoEntrega, number> = { enviada: 1, entregue: 2, lida: 3, falhou: 0 };

/** Falha que é da conta inteira (não desta pessoa): não conta como tentativa para o envio automático. */
export const PREFIXO_BLOQUEIO = "bloqueio da Meta";

/** Lê os avisos de entrega do corpo do webhook da Meta. */
export function lerAvisosDeEntrega(corpo: unknown): AvisoEntrega[] {
  const saida: AvisoEntrega[] = [];
  const entradas = (corpo as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entradas)) return saida;
  for (const entrada of entradas) {
    for (const mudanca of (entrada as { changes?: unknown[] })?.changes ?? []) {
      const avisos = (mudanca as { value?: { statuses?: unknown[] } })?.value?.statuses;
      for (const bruto of avisos ?? []) {
        const a = bruto as {
          id?: string;
          status?: string;
          errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[];
        };
        const situacao = a.status ? DA_META[a.status] : undefined;
        if (!a.id || !situacao) continue;
        const erro = a.errors?.[0];
        saida.push({
          wamid: a.id,
          situacao,
          codigo: erro?.code,
          detalhe: erro?.error_data?.details ?? erro?.message ?? erro?.title,
        });
      }
    }
  }
  return saida;
}

/** O motivo da falha em português simples (os códigos são os da Meta). */
export function motivoDaFalha(codigo?: number, detalhe?: string): string {
  switch (codigo) {
    case 131042:
      return `${PREFIXO_BLOQUEIO}: problema na forma de pagamento da conta do WhatsApp`;
    case 131049:
      return "a Meta segurou a mensagem (limite de mensagens de divulgação para esta pessoa); tente de novo em 24 h";
    case 131050:
      return "a pessoa pediu para não receber mensagens de divulgação";
    case 131026:
      return "o número não pode receber (não tem WhatsApp, está com versão antiga ou bloqueou o número)";
    case 131047:
      return "passaram 24 h sem a pessoa escrever: só mensagem pronta";
    case 130472:
      return "a Meta não entregou (o número está num teste da própria Meta)";
    case 131048:
    case 131056:
    case 130429:
      return "limite de envios atingido; tente de novo mais tarde";
    default:
      return `${detalhe?.slice(0, 160) || "a Meta não entregou"}${codigo ? ` (código ${codigo})` : ""}`;
  }
}

/** Grava os avisos: atualiza a mensagem na Central e, se falhou, marca o envio de ativação como "não foi". */
export async function registrarAvisosDeEntrega(avisos: AvisoEntrega[]) {
  if (!avisos.length) return;
  const admin = criarClienteAdmin();
  const { data: mensagens } = await admin
    .from("whatsapp_mensagens")
    .select("id, wamid, status")
    .in("wamid", [...new Set(avisos.map((a) => a.wamid))]);
  const porWamid = new Map((mensagens ?? []).map((m) => [m.wamid, m]));

  for (const a of avisos) {
    const m = porWamid.get(a.wamid);
    const motivo = a.situacao === "falhou" ? motivoDaFalha(a.codigo, a.detalhe) : null;
    if (motivo) console.error("[whatsapp] não entregue", a.wamid.slice(-12), a.codigo ?? "", motivo);
    if (!m) continue; // resposta livre do robô (não guarda o id): só o log acima

    const atual = (m.status ?? "enviada") as SituacaoEntrega;
    // os avisos podem chegar fora de ordem: "lida" não volta para "entregue"; falha não apaga uma entrega
    if (a.situacao === "falhou" ? ORDEM[atual] >= ORDEM.entregue : ORDEM[a.situacao] <= ORDEM[atual]) continue;
    m.status = a.situacao;

    const { error } = await admin.from("whatsapp_mensagens").update({ status: a.situacao, erro: motivo }).eq("id", m.id);
    // sem a migração 0031 a coluna "erro" não existe: grava só a situação
    if (error) await admin.from("whatsapp_mensagens").update({ status: a.situacao }).eq("id", m.id);

    if (motivo) {
      // o envio de ativação deixa de contar como recebido (o automático tenta de novo; o admin vê o motivo)
      await admin.from("ativacao_envios").update({ ok: false, erro: motivo }).eq("wamid", a.wamid);
    }
  }
}
