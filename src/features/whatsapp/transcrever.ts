import "server-only";

/*
 * Áudio → texto com a OpenAI (13/11/2026), para a Serena e a assistente da agenda entenderem áudio
 * (o Claude não ouve áudio). Chave: OPENAI_API_KEY na VPS (deploy/vps/definir-openai.sh).
 * Modelo gpt-4o-mini-transcribe (~US$ 0,003 por minuto); se não existir na conta, tenta o whisper-1.
 * Sem chave, devolve null e o robô pede para a pessoa escrever.
 */

const MODELOS = ["gpt-4o-mini-transcribe", "whisper-1"];
const LIMITE_BYTES = 25 * 1024 * 1024; // limite da OpenAI

export function transcricaoConfigurada() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function transcreverAudio(dados: Buffer, mime: string, nome = "audio.ogg"): Promise<string | null> {
  if (!transcricaoConfigurada() || !dados.length || dados.length > LIMITE_BYTES) return null;
  for (const modelo of MODELOS) {
    try {
      const form = new FormData();
      form.append("model", modelo);
      form.append("language", "pt");
      form.append("file", new Blob([new Uint8Array(dados)], { type: mime }), nome);
      const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: form,
        signal: AbortSignal.timeout(90_000),
      });
      if (r.status === 404 || r.status === 400) {
        console.error(`[whatsapp] transcrição: ${modelo} recusou`, r.status, (await r.text()).slice(0, 300));
        continue; // tenta o próximo modelo
      }
      if (!r.ok) {
        console.error("[whatsapp] transcrição recusada", r.status, (await r.text()).slice(0, 300));
        return null;
      }
      const texto = ((await r.json()) as { text?: string }).text?.trim();
      return texto || null;
    } catch (e) {
      console.error("[whatsapp] transcrição falhou", e);
      return null;
    }
  }
  return null;
}
