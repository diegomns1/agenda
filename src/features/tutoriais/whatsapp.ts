import { URL_APP } from "@/lib/constantes";
import { PLANOS } from "@/lib/planos";
import type { Tutorial } from "./conteudo";

/*
 * Tutorial em formato de mensagem de WhatsApp (27/11/2026), para o Diego mandar com um toque pela Central.
 * Usa os mesmos passos da tela Tutoriais (features/tutoriais/conteudo.ts): mudou lá, muda aqui junto.
 */

/** Vídeo que dá para mandar como vídeo no WhatsApp (MP4 publicado no site). YouTube e outros vão como link no texto. */
export function videoDoTutorial(t: Tutorial): string | null {
  return t.video && /\.mp4(\?|$)/i.test(t.video) ? t.video : null;
}

export function textoDoTutorial(t: Tutorial): string {
  const partes = [`📘 *${t.titulo}*`, t.resumo];
  if (t.plano) partes.push(`_Disponível a partir do plano ${PLANOS[t.plano].nome}._`);
  partes.push(t.passos.map((p, i) => `${i + 1}. ${p}`).join("\n"));
  if (t.video && !videoDoTutorial(t)) partes.push(`🎥 Vídeo: ${t.video}`);
  if (t.acao) partes.push(`👉 ${t.acao.rotulo}: ${URL_APP}${t.acao.href}`);
  partes.push("Qualquer dúvida, é só me chamar aqui.");
  return partes.join("\n\n");
}
