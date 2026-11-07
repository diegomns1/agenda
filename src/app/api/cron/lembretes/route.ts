import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarPush, pushConfigurado } from "@/lib/push";
import { formatarData, horaDe } from "@/lib/datas";
import { primeiroNome } from "@/lib/texto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Linha = {
  id: string;
  profissional_id: string;
  cliente_nome: string | null;
  servico_nome: string | null;
  inicio: string;
  lembrete_1d_enviado_em: string | null;
  lembrete_1h_enviado_em: string | null;
};

/**
 * Chamado pelo pg_cron do Supabase a cada 5 min (Authorization: Bearer CRON_SECRET).
 * Envia push para a profissional 1 dia antes e 1 hora antes de cada atendimento.
 * A janela é "≤" para nada se perder se o cron atrasar.
 */
async function executar(request: NextRequest) {
  const esperado = process.env.CRON_SECRET;
  const recebido = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!esperado || recebido !== esperado) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  if (!pushConfigurado()) {
    return NextResponse.json({ erro: "VAPID não configurado" }, { status: 500 });
  }

  let admin: ReturnType<typeof criarClienteAdmin>;
  try {
    admin = criarClienteAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Service role não configurada" }, { status: 500 });
  }
  const agora = new Date();
  const em1h = new Date(agora.getTime() + 60 * 60_000);
  const em24h = new Date(agora.getTime() + 24 * 60 * 60_000);

  const { data, error } = await admin
    .from("agendamentos")
    .select("id, profissional_id, cliente_nome, servico_nome, inicio, lembrete_1d_enviado_em, lembrete_1h_enviado_em")
    .eq("tipo", "atendimento")
    .eq("status", "agendado")
    .gt("inicio", agora.toISOString())
    .lte("inicio", em24h.toISOString())
    .or("lembrete_1d_enviado_em.is.null,lembrete_1h_enviado_em.is.null");
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const linhas = (data ?? []) as Linha[];

  // Decide o que enviar para cada atendimento
  const envios: { linha: Linha; tipo: "1d" | "1h" }[] = [];
  const marcar1d: string[] = [];
  const marcar1h: string[] = [];
  for (const l of linhas) {
    const inicio = new Date(l.inicio);
    const dentroDe1h = inicio <= em1h;
    if (dentroDe1h && !l.lembrete_1h_enviado_em) {
      envios.push({ linha: l, tipo: "1h" });
      marcar1h.push(l.id);
      if (!l.lembrete_1d_enviado_em) marcar1d.push(l.id); // já passou da janela de 1 dia: não manda dois avisos
    } else if (!dentroDe1h && !l.lembrete_1d_enviado_em) {
      envios.push({ linha: l, tipo: "1d" });
      marcar1d.push(l.id);
    }
  }

  if (envios.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0, verificados: linhas.length });
  }

  // Inscrições das profissionais envolvidas
  const profissionais = [...new Set(envios.map((e) => e.linha.profissional_id))];
  const { data: inscricoes } = await admin
    .from("push_subscriptions")
    .select("profissional_id, endpoint, p256dh, auth")
    .in("profissional_id", profissionais);

  const porProfissional = new Map<string, { endpoint: string; p256dh: string; auth: string }[]>();
  for (const i of inscricoes ?? []) {
    const lista = porProfissional.get(i.profissional_id) ?? [];
    lista.push(i);
    porProfissional.set(i.profissional_id, lista);
  }

  let enviados = 0;
  const mortos = new Set<string>();
  for (const { linha, tipo } of envios) {
    const destinos = porProfissional.get(linha.profissional_id) ?? [];
    if (destinos.length === 0) continue;
    const nome = primeiroNome(linha.cliente_nome ?? "Cliente");
    const hora = horaDe(linha.inicio);
    const r = await enviarPush(destinos, {
      title: tipo === "1h" ? `Em 1 hora: ${nome} às ${hora}` : `Amanhã: ${nome} às ${hora}`,
      body: `${linha.servico_nome ?? "Atendimento"} · ${formatarData(linha.inicio, "EEEE, dd/MM")}. Toque para lembrar a cliente.`,
      url: `/lembretes?agendamento=${linha.id}`,
      tag: `lembrete-${linha.id}-${tipo}`,
    });
    enviados += r.enviados;
    r.endpointsMortos.forEach((e) => mortos.add(e));
  }

  const marcadoEm = new Date().toISOString();
  if (marcar1d.length) await admin.from("agendamentos").update({ lembrete_1d_enviado_em: marcadoEm }).in("id", marcar1d);
  if (marcar1h.length) await admin.from("agendamentos").update({ lembrete_1h_enviado_em: marcadoEm }).in("id", marcar1h);
  if (mortos.size) await admin.from("push_subscriptions").delete().in("endpoint", [...mortos]);

  return NextResponse.json({ ok: true, enviados, avisos: envios.length, verificados: linhas.length, inscricoesRemovidas: mortos.size });
}

export async function POST(request: NextRequest) {
  return executar(request);
}

export async function GET(request: NextRequest) {
  return executar(request);
}
