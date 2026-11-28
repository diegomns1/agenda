import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { hojeISO } from "@/lib/datas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { usaDeVerdade, usoDasContas } from "@/features/admin/uso";
import { statusDoModelo } from "@/features/whatsapp/meta";
import { enviarAtivacao, MODELO_WHATSAPP, precisaReceber, type TipoAtivacao } from "./enviar";

/*
 * Ativação automática (13/11/2026), chamada pela tarefa de 5 em 5 min (api/cron/lembretes), mas só age
 * uma vez por hora (minutos 0 a 4) e entre 9h e 20h de Brasília, para ninguém receber mensagem de madrugada.
 *   ajuda_inicio   — conta liberada no teste há 20 h a 4 dias e que não cadastrou nada ("Só entrou").
 *   feedback_teste — último dia do teste (ativa_ate = hoje) e não está "Usando".
 *   parou          — estava em "Configurando" e ficou 2 dias sem fazer nada (cai em "Parou"): uma vez por conta,
 *                    só pelo WhatsApp (19/11/2026). Ver rodarParou.
 */

const FUSO = "America/Sao_Paulo";
const MAXIMO_POR_RODADA = 30;

export function horaDeAtivar(agora = new Date()) {
  const hora = Number(formatInTimeZone(agora, FUSO, "H"));
  const minuto = Number(formatInTimeZone(agora, FUSO, "m"));
  return hora >= 9 && hora < 20 && minuto < 5;
}

export async function rodarAtivacao(admin: ReturnType<typeof criarClienteAdmin>, forcar = false) {
  if (!forcar && !horaDeAtivar()) return { enviados: 0, motivo: "fora do horário" };

  const agora = Date.now();
  const hoje = hojeISO();
  const uso = await usoDasContas();
  const parou = await rodarParou(admin, uso).catch((e) => {
    console.error("[ativação] parou", e instanceof Error ? e.message : e);
    return { enviados: 0 };
  });

  const { data: contas } = await admin
    .from("profiles")
    .select("id, nome, email, telefone, plano, status, ativa_ate, created_at")
    .eq("status", "aprovada")
    .eq("plano", "teste");
  if (!contas?.length) return { enviados: parou.enviados };

  const fila: { conta: (typeof contas)[number]; tipo: TipoAtivacao }[] = [];
  for (const c of contas) {
    const nivel = uso.get(c.id)?.nivel;
    const idadeH = (agora - new Date(c.created_at).getTime()) / 3_600_000;
    if (c.ativa_ate === hoje && nivel !== "usando") fila.push({ conta: c, tipo: "feedback_teste" });
    else if (nivel === "so_entrou" && idadeH >= 20 && idadeH <= 96) fila.push({ conta: c, tipo: "ajuda_inicio" });
  }

  let enviados = 0;
  for (const { conta, tipo } of fila) {
    if (enviados >= MAXIMO_POR_RODADA) break;
    if (!(await precisaReceber(admin, conta, tipo))) continue;
    const r = await enviarAtivacao(admin, conta, tipo);
    if (r.ok) enviados++;
  }
  return { enviados: enviados + parou.enviados };
}

/** Só olha contas criadas nestes dias: quem parou há muito tempo não recebe uma mensagem do nada. */
const DIAS_PAROU_RECENTE = 45;
/** Se outra mensagem de ativação saiu há menos que isto, espera (ninguém recebe duas mensagens em seguida). */
const INTERVALO_ENTRE_MENSAGENS_H = 48;

/**
 * Quem parou NA CONFIGURAÇÃO (começou a montar a agenda e ficou 2 dias sem fazer nada) recebe, uma vez, a mensagem
 * pronta "vaguinha_retomar_uso" pelo WhatsApp oficial. Quem já usava de verdade e parou fica de fora: o texto
 * ("começou a montar sua agenda e deu uma pausa") não serve para essas pessoas.
 * - Só começa quando a Meta aprovar o modelo (antes, cada envio seria recusado).
 * - Uma vez por conta: marcado em profiles.aviso_parou_em (migração 0034). Sem a migração, não faz nada.
 * - Só quem tem WhatsApp no cadastro; a resposta cai na Central e a Serena atende no modo suporte.
 */
async function rodarParou(admin: ReturnType<typeof criarClienteAdmin>, uso: Awaited<ReturnType<typeof usoDasContas>>) {
  const desde = new Date(Date.now() - DIAS_PAROU_RECENTE * 86_400_000).toISOString();
  const { data: contas, error } = await admin
    .from("profiles")
    .select("id, nome, email, telefone, aviso_parou_em")
    .eq("status", "aprovada")
    .not("telefone", "is", null)
    .is("aviso_parou_em", null)
    .gte("created_at", desde);
  if (error) return { enviados: 0, motivo: "migração 0034 ainda não rodou" };
  const pararam = (contas ?? []).filter((c) => {
    const u = uso.get(c.id);
    return u?.nivel === "parou" && !usaDeVerdade(u);
  });
  if (!pararam.length) return { enviados: 0 };

  const status = await statusDoModelo(MODELO_WHATSAPP.parou);
  if (status !== null && status !== "APPROVED") return { enviados: 0, motivo: `modelo ${MODELO_WHATSAPP.parou}: ${status}` };

  // quem recebeu outra mensagem de ativação há pouco espera a próxima rodada
  const limite = new Date(Date.now() - INTERVALO_ENTRE_MENSAGENS_H * 3_600_000).toISOString();
  const { data: recentes } = await admin
    .from("ativacao_envios")
    .select("profissional_id")
    .in("profissional_id", pararam.map((c) => c.id))
    .eq("ok", true)
    .gte("enviado_em", limite);
  const receberamHaPouco = new Set((recentes ?? []).map((r) => r.profissional_id));
  // bloqueadas ou em "Robôs e spam" na Central também ficam de fora
  const { data: barrados } = await admin
    .from("whatsapp_contatos")
    .select("profissional_id, bloqueado, etapa")
    .in("profissional_id", pararam.map((c) => c.id));
  for (const b of barrados ?? []) if (b.profissional_id && (b.bloqueado || b.etapa === "spam")) receberamHaPouco.add(b.profissional_id);

  let enviados = 0;
  for (const c of pararam) {
    if (enviados >= MAXIMO_POR_RODADA) break;
    if (receberamHaPouco.has(c.id)) continue;
    const r = await enviarAtivacao(admin, c, "parou");
    if (r.ok) enviados++;
    // enviada, ou o robô desistiu (não respondeu / não chegou): marca para não conferir de novo a cada hora
    if (r.ok || r.naoInsiste) await admin.from("profiles").update({ aviso_parou_em: new Date().toISOString() }).eq("id", c.id);
  }
  return { enviados };
}
