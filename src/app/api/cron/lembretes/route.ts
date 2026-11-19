import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarPush, pushConfigurado } from "@/lib/push";
import { emailConfigurado, enviarEmail } from "@/lib/email";
import { emailAssinaturaVencida, emailVencimentoProximo } from "@/features/emails/modelos";
import { rodarAtivacao } from "@/features/ativacao/automatico";
import { desligarAvisosDoAsaas } from "@/features/assinatura/avisos";
import { usoDasContas } from "@/features/admin/uso";
import { sincronizarEtapasCrm } from "@/features/rastreio/servidor";
import { rodarLembretesAutomaticos } from "@/features/whatsapp-proprio/lembretes";
import { limparConversasParadas } from "@/features/whatsapp/limpeza";
import { diasEntre, formatarData, hojeISO, horaDe, somarDias } from "@/lib/datas";
import { primeiroNome } from "@/lib/texto";
import { temRecurso } from "@/lib/planos";

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

  // Aviso de vencimento por e-mail (barato: uma consulta pequena a cada execução)
  const vencimentosAvisados = await avisarVencimentos(admin).catch((e) => {
    console.error("[cron] vencimentos", e);
    return 0;
  });
  // Assinatura que venceu sem pagamento: um e-mail no dia seguinte (os avisos do Asaas estão desligados)
  const vencidosAvisados = await avisarVencidos(admin).catch((e) => {
    console.error("[cron] vencidos", e);
    return 0;
  });
  // Ativação de quem só entrou / fim do teste (age uma vez por hora, das 9h às 20h)
  const ativacao = await rodarAtivacao(admin).catch((e) => {
    console.error("[cron] ativação", e);
    return { enviados: 0 };
  });

  // Lembrete automático pelo WhatsApp da própria profissional (Premium): no máximo 1 por profissional por rodada
  const lembretesAuto = await rodarLembretesAutomaticos(admin).catch((e) => {
    console.error("[cron] lembrete automático", e);
    return { enviados: 0 };
  });

  // Etapas do funil para a Meta (Configurando, Usando, Assinou): uma vez por hora
  const etapasMeta =
    new Date().getMinutes() < 5
      ? await usoDasContas()
          .then((uso) => sincronizarEtapasCrm(admin, (id) => uso.get(id)?.nivel))
          .catch((e) => {
            console.error("[cron] etapas Meta", e);
            return { enviadas: 0 };
          })
      : null;

  // Avisos de cobrança do Asaas desligados (quem avisa é a Vaguinha): confere todas as clientes a cada 6 horas
  if (new Date().getMinutes() < 5 && new Date().getUTCHours() % 6 === 0) {
    await desligarAvisosDoAsaas(admin).catch((e) => console.error("[cron] avisos do Asaas", e instanceof Error ? e.message : e));
  }

  // Central do WhatsApp: conversa parada há 5 dias é apagada (uma vez por dia, às 4h de Brasília)
  if (new Date().getMinutes() < 5 && new Date().getUTCHours() === 7) {
    await limparConversasParadas(admin)
      .then((r) => r.apagadas && console.log("[cron] conversas paradas apagadas:", r.apagadas))
      .catch((e) => console.error("[cron] limpeza da Central", e instanceof Error ? e.message : e));
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
    return NextResponse.json({ ok: true, enviados: 0, verificados: linhas.length, vencimentosAvisados, vencidosAvisados, ativacao: ativacao.enviados, etapasMeta, lembretesAuto });
  }

  // Só profissionais cujo plano inclui lembretes
  const todas = [...new Set(envios.map((e) => e.linha.profissional_id))];
  const { data: perfis } = await admin.from("profiles").select("id, plano").in("id", todas);
  const liberadas = new Set((perfis ?? []).filter((p) => temRecurso(p.plano, "lembretes")).map((p) => p.id));
  const profissionais = todas.filter((id) => liberadas.has(id));

  const { data: inscricoes } = profissionais.length
    ? await admin.from("push_subscriptions").select("profissional_id, endpoint, p256dh, auth").in("profissional_id", profissionais)
    : { data: [] as { profissional_id: string; endpoint: string; p256dh: string; auth: string }[] };

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
      body: `${linha.servico_nome ?? "Atendimento"} · ${formatarData(linha.inicio, "EEEE, dd/MM")}. Toque para enviar o lembrete.`,
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

  return NextResponse.json({ ok: true, enviados, avisos: envios.length, verificados: linhas.length, inscricoesRemovidas: mortos.size, vencimentosAvisados, vencidosAvisados, ativacao: ativacao.enviados, etapasMeta, lembretesAuto });
}

/**
 * Contas aprovadas com `ativa_ate` nos próximos 3 dias (ou hoje) recebem um e-mail, uma vez por
 * data de validade (`aviso_vencimento_para`). Se o admin estender a validade, um novo aviso sai depois.
 */
async function avisarVencimentos(admin: ReturnType<typeof criarClienteAdmin>): Promise<number> {
  if (!emailConfigurado()) return 0;
  const hoje = hojeISO();
  const limite = somarDias(hoje, 3);

  const { data, error } = await admin
    .from("profiles")
    .select("id, nome, email, plano, ativa_ate, aviso_vencimento_para")
    .eq("status", "aprovada")
    .gte("ativa_ate", hoje)
    .lte("ativa_ate", limite);
  if (error || !data) return 0;

  let enviados = 0;
  for (const p of data) {
    if (!p.email || !p.ativa_ate || p.aviso_vencimento_para === p.ativa_ate) continue;
    const dias = diasEntre(hoje, p.ativa_ate).length - 1;
    // teste grátis: sem e-mail de vencimento (19/11/2026, pedido do Diego: avisos demais no fim do teste).
    // No último dia sai só o "seu teste termina hoje" (WhatsApp, ou e-mail para quem não deu o número) e o aviso no painel.
    if (p.plano === "teste") continue;
    // mensalidade em aberto: o e-mail leva o link para pagar com um toque (os avisos do Asaas estão desligados)
    const link = await linkDaMensalidade(admin, p.id);
    const r = await enviarEmail(emailVencimentoProximo(p.email, p.nome, p.plano, p.ativa_ate, dias, link));
    if (r.enviado) {
      await admin.from("profiles").update({ aviso_vencimento_para: p.ativa_ate }).eq("id", p.id);
      enviados += 1;
    }
  }
  return enviados;
}

/** Link da mensalidade em aberto (mais antiga primeiro), para o botão dos e-mails de cobrança. */
async function linkDaMensalidade(admin: ReturnType<typeof criarClienteAdmin>, profissionalId: string) {
  const { data } = await admin
    .from("cobrancas")
    .select("link")
    .eq("profissional_id", profissionalId)
    .in("status", ["PENDING", "OVERDUE"])
    .not("link", "is", null)
    .order("vencimento", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.link ?? null;
}

/**
 * Plano pago que venceu entre 1 e 5 dias atrás e não foi renovado: um e-mail "sua assinatura venceu"
 * (uma vez por vencimento, marcado em aviso_vencido_para). O teste grátis tem o próprio aviso (ativação).
 */
async function avisarVencidos(admin: ReturnType<typeof criarClienteAdmin>): Promise<number> {
  if (!emailConfigurado()) return 0;
  const hoje = hojeISO();
  const { data, error } = await admin
    .from("profiles")
    .select("id, nome, email, plano, ativa_ate, aviso_vencido_para")
    .eq("status", "aprovada")
    .neq("plano", "teste")
    .lt("ativa_ate", hoje)
    .gte("ativa_ate", somarDias(hoje, -5));
  if (error || !data) return 0;

  let enviados = 0;
  for (const p of data) {
    if (!p.email || !p.ativa_ate || p.plano === "teste" || p.aviso_vencido_para === p.ativa_ate) continue;
    const r = await enviarEmail(emailAssinaturaVencida(p.email, p.nome, p.plano, p.ativa_ate, await linkDaMensalidade(admin, p.id)));
    if (r.enviado) {
      await admin.from("profiles").update({ aviso_vencido_para: p.ativa_ate }).eq("id", p.id);
      enviados += 1;
    }
  }
  return enviados;
}

export async function POST(request: NextRequest) {
  return executar(request);
}

export async function GET(request: NextRequest) {
  return executar(request);
}
