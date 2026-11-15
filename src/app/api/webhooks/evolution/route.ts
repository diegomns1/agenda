import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";
import { tratarMensagemRecebida, type MensagemEvolution } from "@/features/whatsapp-proprio/respostas";

/*
 * Avisos da Evolution API (WhatsApp da própria profissional), 15/11/2026.
 * "connection.update": conectou → guarda o número; caiu → marca desconectado e avisa no celular.
 * "messages.upsert": resposta da cliente ao lembrete automático (features/whatsapp-proprio/respostas.ts).
 * A Evolution manda o cabeçalho x-vaguinha-token (EVOLUTION_WEBHOOK_SECRET), configurado ao criar a conexão.
 * Das mensagens, só a resposta a um lembrete é usada; as outras são descartadas sem gravar nem logar.
 */

export const dynamic = "force-dynamic";

type Aviso = {
  event?: string;
  instance?: string;
  data?: { state?: string; statusReason?: number; wuid?: string; profileName?: string } & MensagemEvolution;
};

/** No máximo um aviso de queda a cada 6 horas. */
const INTERVALO_AVISO_MS = 6 * 3_600_000;

function tokenValido(recebido: string | null) {
  const esperado = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!tokenValido(request.headers.get("x-vaguinha-token"))) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const aviso = (await request.json().catch(() => ({}))) as Aviso;
  if (!aviso.instance) return NextResponse.json({ ok: true });

  const admin = criarClienteAdmin();

  // mensagem recebida: só serve a resposta a um lembrete automático; o resto é descartado (sem gravar nem logar)
  if (aviso.event === "messages.upsert") {
    if (aviso.data) await tratarMensagemRecebida(admin, aviso.instance, aviso.data).catch((e) => console.error("[evolution] resposta", e instanceof Error ? e.message : "erro"));
    return NextResponse.json({ ok: true });
  }
  if (aviso.event !== "connection.update") return NextResponse.json({ ok: true });

  const { data: linha } = await admin.from("whatsapp_conexoes").select("*").eq("instancia", aviso.instance).maybeSingle();
  if (!linha) return NextResponse.json({ ok: true });

  const agora = new Date();
  const estado = aviso.data?.state;

  if (estado === "open") {
    const numero = aviso.data?.wuid?.split("@")[0]?.replace(/\D/g, "") || linha.numero;
    await admin
      .from("whatsapp_conexoes")
      .update({
        estado: "conectado",
        numero,
        nome_perfil: aviso.data?.profileName ?? linha.nome_perfil,
        conectado_em: linha.estado === "conectado" ? linha.conectado_em : agora.toISOString(),
        motivo_queda: null,
        atualizado_em: agora.toISOString(),
      })
      .eq("profissional_id", linha.profissional_id);
    return NextResponse.json({ ok: true });
  }

  if (estado === "close") {
    const estavaConectado = linha.estado === "conectado";
    const avisarAgora =
      estavaConectado && (!linha.aviso_queda_em || agora.getTime() - new Date(linha.aviso_queda_em).getTime() > INTERVALO_AVISO_MS);
    await admin
      .from("whatsapp_conexoes")
      .update({
        estado: "desconectado",
        desconectado_em: agora.toISOString(),
        motivo_queda: aviso.data?.statusReason != null ? String(aviso.data.statusReason) : linha.motivo_queda,
        ...(avisarAgora ? { aviso_queda_em: agora.toISOString() } : {}),
        atualizado_em: agora.toISOString(),
      })
      .eq("profissional_id", linha.profissional_id);

    if (avisarAgora) {
      const { data: inscricoes } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("profissional_id", linha.profissional_id);
      if (inscricoes?.length) {
        const r = await enviarPush(inscricoes, {
          title: "Seu WhatsApp desconectou da Vaguinha",
          body: "Os lembretes automáticos pararam. Toque para conectar de novo.",
          url: "/lembretes",
          tag: "whatsapp-desconectou",
        });
        if (r.endpointsMortos.length) await admin.from("push_subscriptions").delete().in("endpoint", r.endpointsMortos);
      }
    }
  }
  return NextResponse.json({ ok: true });
}
