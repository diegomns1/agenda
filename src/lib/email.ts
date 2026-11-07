import "server-only";
import { EMAIL_CONTATO } from "@/lib/legal";

/* Envio de e-mail pela API HTTP do Resend (sem biblioteca).
   Sem RESEND_API_KEY / EMAIL_REMETENTE configurados, nada é enviado e o app segue normalmente:
   os e-mails são um extra, nunca bloqueiam cadastro ou aprovação. */

export type Email = {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  responderPara?: string;
};

export type ResultadoEmail = { enviado: boolean; motivo?: string };

export function emailConfigurado() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);
}

/** Nunca lança: devolve { enviado: false, motivo } em qualquer falha. */
export async function enviarEmail(email: Email): Promise<ResultadoEmail> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  if (!chave || !remetente) return { enviado: false, motivo: "E-mail não configurado (RESEND_API_KEY / EMAIL_REMETENTE)." };

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remetente,
        to: [email.para],
        subject: email.assunto,
        html: email.html,
        text: email.texto,
        reply_to: email.responderPara ?? EMAIL_CONTATO,
      }),
      cache: "no-store",
    });
    if (!r.ok) {
      const corpo = await r.text().catch(() => "");
      console.error("[email] falha ao enviar", r.status, corpo.slice(0, 300));
      return { enviado: false, motivo: `Serviço de e-mail respondeu ${r.status}.` };
    }
    return { enviado: true };
  } catch (e) {
    console.error("[email] erro de rede", e);
    return { enviado: false, motivo: "Não foi possível falar com o serviço de e-mail." };
  }
}

/** E-mail do administrador que recebe avisos de novos cadastros (opcional). */
export function emailDoAdmin() {
  return process.env.EMAIL_ADMIN || null;
}
