import { after, NextResponse, type NextRequest } from "next/server";
import { assinaturaValida } from "@/features/whatsapp/meta";
import { lerWebhook, tratarMensagem } from "@/features/whatsapp/processar";

export const dynamic = "force-dynamic";

/**
 * Webhook do WhatsApp (Meta → Configuração do app → WhatsApp → Configuração → Webhook).
 * URL: https://painel.vaguinha.app/api/webhooks/whatsapp · campo assinado: "messages".
 *
 * GET: a Meta confere a URL uma vez (hub.verify_token = WHATSAPP_VERIFY_TOKEN).
 * POST: cada mensagem recebida. Responde 200 na hora (senão a Meta reenvia) e trata depois, com `after`.
 */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (esperado && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === esperado) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const corpo = await request.text();
  if (!assinaturaValida(corpo, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ erro: "Assinatura inválida" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ erro: "Corpo inválido" }, { status: 400 });
  }

  const mensagens = lerWebhook(json);
  if (mensagens.length) {
    after(async () => {
      // uma de cada vez, na ordem em que chegaram
      for (const m of mensagens) await tratarMensagem(m);
    });
  }
  return NextResponse.json({ ok: true });
}
