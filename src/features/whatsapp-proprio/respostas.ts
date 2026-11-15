import "server-only";
import type { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";
import { dataDe, horaDe, rotuloRelativo } from "@/lib/datas";
import { primeiroNome } from "@/lib/texto";
import { normalizarTelefone, variacoesCelular } from "@/lib/telefone";
import { entenderResposta } from "./resposta";

/*
 * Mensagens recebidas no WhatsApp da profissional (fase 3, 15/11/2026).
 * PRIVACIDADE: a Evolution manda todas, mas aqui só interessa a resposta de quem recebeu um lembrete automático
 * nas últimas 48 h. Qualquer outra mensagem é descartada na hora: não é gravada nem escrita no log.
 * Da resposta ao lembrete, guardamos só ela (até 300 letras) no atendimento, para a profissional ver.
 */

type Admin = ReturnType<typeof criarClienteAdmin>;

export type MensagemEvolution = {
  key?: { remoteJid?: string; remoteJidAlt?: string; senderPn?: string; fromMe?: boolean };
  pushName?: string;
  messageType?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
    audioMessage?: unknown;
    reactionMessage?: { text?: string };
  };
};

const JANELA_RESPOSTA_H = 48;
/** Novas respostas da mesma cliente avisam de novo só depois disso (evita uma notificação por mensagem picada). */
const INTERVALO_AVISO_MIN = 10;

function numerosDe(key: NonNullable<MensagemEvolution["key"]>): string[] {
  const jids = [key.remoteJid, key.remoteJidAlt, key.senderPn].filter((j): j is string => Boolean(j));
  const nums = jids.filter((j) => j.endsWith("@s.whatsapp.net") || /^\d+$/.test(j)).map((j) => j.split("@")[0].replace(/\D/g, ""));
  return [...new Set(nums.flatMap((n) => variacoesCelular(n)))];
}

function textoDe(m: MensagemEvolution): string | null {
  const msg = m.message;
  if (!msg) return null;
  const t = msg.conversation ?? msg.extendedTextMessage?.text ?? msg.imageMessage?.caption ?? msg.videoMessage?.caption ?? msg.reactionMessage?.text;
  if (t?.trim()) return t.trim();
  if (msg.audioMessage) return "🎤 (mandou um áudio)";
  if (msg.imageMessage) return "📷 (mandou uma foto)";
  return null;
}

export async function tratarMensagemRecebida(admin: Admin, instancia: string, m: MensagemEvolution) {
  const key = m.key;
  if (!key || key.fromMe || key.remoteJid?.endsWith("@g.us") || key.remoteJid === "status@broadcast") return;

  const { data: conexao } = await admin.from("whatsapp_conexoes").select("profissional_id").eq("instancia", instancia).maybeSingle();
  if (!conexao) return;
  const pid = conexao.profissional_id;

  // só serve resposta de quem recebeu lembrete automático nas últimas 48 h (e cujo horário não passou há muito)
  const agora = Date.now();
  const { data: avisados } = await admin
    .from("agendamentos")
    .select("id, cliente_id, cliente_nome, servico_nome, inicio, cliente_confirmou_em, resposta_cliente_em")
    .eq("profissional_id", pid)
    .eq("tipo", "atendimento")
    .eq("status", "agendado")
    .is("lembrete_auto_erro", null)
    .gte("lembrete_auto_em", new Date(agora - JANELA_RESPOSTA_H * 3_600_000).toISOString())
    .gte("inicio", new Date(agora - 2 * 3_600_000).toISOString())
    .order("inicio", { ascending: true });
  if (!avisados?.length) return;

  const remetente = new Set(numerosDe(key));
  if (!remetente.size) return;
  const idsClientes = [...new Set(avisados.map((a) => a.cliente_id).filter(Boolean))] as string[];
  const { data: clientes } = await admin.from("clientes").select("id, telefone").in("id", idsClientes);
  const doRemetente = new Set((clientes ?? []).filter((c) => remetente.has(normalizarTelefone(c.telefone) ?? "")).map((c) => c.id));
  const a = avisados.find((x) => x.cliente_id && doRemetente.has(x.cliente_id));
  if (!a) return; // não é resposta a lembrete: descarta

  const texto = textoDe(m);
  if (!texto) return;
  const tipo = entenderResposta(texto);
  const quando = new Date().toISOString();

  await admin
    .from("agendamentos")
    .update({
      resposta_cliente: texto.slice(0, 300),
      resposta_cliente_em: quando,
      ...(tipo === "confirmou" && !a.cliente_confirmou_em ? { cliente_confirmou_em: quando } : {}),
    })
    .eq("id", a.id);
  if (tipo === "parar" && a.cliente_id) await admin.from("clientes").update({ sem_lembrete_auto: true }).eq("id", a.cliente_id);

  // avisa a profissional (confirmação só a primeira vez; outras respostas no máximo a cada 10 min)
  const recente = a.resposta_cliente_em && agora - new Date(a.resposta_cliente_em).getTime() < INTERVALO_AVISO_MIN * 60_000;
  if ((tipo === "confirmou" && a.cliente_confirmou_em) || (tipo !== "confirmou" && recente)) return;

  const nome = primeiroNome(a.cliente_nome ?? "") || "Sua cliente";
  const horario = `${a.servico_nome ? `${a.servico_nome}, ` : ""}${rotuloRelativo(dataDe(a.inicio))} às ${horaDe(a.inicio)}`;
  const aviso =
    tipo === "confirmou"
      ? { title: `✅ ${nome} confirmou`, body: horario }
      : tipo === "parar"
        ? { title: `${nome} pediu para não receber lembretes`, body: "Os próximos lembretes dela ficam para você mandar pelo botão." }
        : { title: `💬 ${nome} respondeu o lembrete`, body: `"${texto.slice(0, 120)}" (${horario})` };

  const { data: inscricoes } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("profissional_id", pid);
  if (!inscricoes?.length) return;
  const r = await enviarPush(inscricoes, { ...aviso, url: `/lembretes?agendamento=${a.id}`, tag: `resposta-${a.id}` });
  if (r.endpointsMortos.length) await admin.from("push_subscriptions").delete().in("endpoint", r.endpointsMortos);
}
