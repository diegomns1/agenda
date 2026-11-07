import "server-only";
import * as webpush from "web-push";
import { WebPushError, type PushSubscription as WebPushSubscription } from "web-push";

export type PayloadPush = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export type InscricaoPush = { endpoint: string; p256dh: string; auth: string };

let configurado = false;

function configurar() {
  if (configurado) return true;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  const assunto = process.env.VAPID_SUBJECT || "mailto:contato@example.com";
  if (!publica || !privada) return false;
  webpush.setVapidDetails(assunto, publica, privada);
  configurado = true;
  return true;
}

export function pushConfigurado() {
  return configurar();
}

export type ResultadoEnvio = {
  enviados: number;
  falhas: number;
  /** Endpoints que não existem mais (404/410) e devem ser apagados do banco. */
  endpointsMortos: string[];
};

/** Envia a mesma notificação para várias inscrições. Nunca lança; devolve o resumo. */
export async function enviarPush(inscricoes: InscricaoPush[], payload: PayloadPush): Promise<ResultadoEnvio> {
  const resultado: ResultadoEnvio = { enviados: 0, falhas: 0, endpointsMortos: [] };
  if (!configurar() || inscricoes.length === 0) return resultado;

  const corpo = JSON.stringify(payload);
  await Promise.all(
    inscricoes.map(async (i) => {
      const sub: WebPushSubscription = { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } };
      try {
        await webpush.sendNotification(sub, corpo, { TTL: 60 * 60, urgency: "high" });
        resultado.enviados += 1;
      } catch (erro) {
        resultado.falhas += 1;
        if (erro instanceof WebPushError && (erro.statusCode === 404 || erro.statusCode === 410)) {
          resultado.endpointsMortos.push(i.endpoint);
        }
      }
    }),
  );
  return resultado;
}
