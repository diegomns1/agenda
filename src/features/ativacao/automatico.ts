import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { hojeISO } from "@/lib/datas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { usoDasContas } from "@/features/admin/uso";
import { enviarAtivacao, jaRecebeu, type TipoAtivacao } from "./enviar";

/*
 * Ativação automática (13/11/2026), chamada pela tarefa de 5 em 5 min (api/cron/lembretes), mas só age
 * uma vez por hora (minutos 0 a 4) e entre 9h e 20h de Brasília, para ninguém receber mensagem de madrugada.
 *   ajuda_inicio   — conta liberada no teste há 20 h a 4 dias e que não cadastrou nada ("Só entrou").
 *   feedback_teste — último dia do teste (ativa_ate = hoje) e não está "Usando".
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
  const { data: contas } = await admin
    .from("profiles")
    .select("id, nome, email, telefone, plano, status, ativa_ate, created_at")
    .eq("status", "aprovada")
    .eq("plano", "teste");
  if (!contas?.length) return { enviados: 0 };

  const uso = await usoDasContas();
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
    if (await jaRecebeu(admin, conta.id, tipo)) continue;
    const r = await enviarAtivacao(admin, conta, tipo);
    if (r.ok) enviados++;
  }
  return { enviados };
}
