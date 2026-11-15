import "server-only";

/*
 * Geração de imagem com a OpenAI para o "Criar com IA" dos Stories (15/11/2026).
 * Modelo: OPENAI_IMAGE_MODEL ou, na ordem, gpt-image-2.6-sunburst, 2.5-sunburst e gpt-image-2 (o que a conta tiver).
 * Qualidade média (OPENAI_IMAGE_QUALITY), retrato 1024x1536 (story 9:16).
 * Sem foto de referência: /v1/images/generations. Com fotos (anexos ou a imagem anterior da conversa): /v1/images/edits.
 * A resposta vem em base64 (b64_json). Chave: OPENAI_API_KEY (a mesma da transcrição de áudio).
 * Custo estimado (qualidade média, retrato): ~US$ 0,05 por imagem.
 */

/** Do mais novo para o mais antigo: se a conta não tiver o primeiro (erro de modelo), tenta o seguinte. */
const MODELOS = () => [...new Set([process.env.OPENAI_IMAGE_MODEL, "gpt-image-2.6-sunburst", "gpt-image-2.5-sunburst", "gpt-image-2"].filter((m): m is string => Boolean(m)))];
const QUALIDADE = () => process.env.OPENAI_IMAGE_QUALITY || "medium";
const TAMANHO = "1024x1536";

export function geracaoImagemConfigurada() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export type Referencia = { dados: Buffer; mime: string; nome: string };
export type ResultadoImagem = { ok: true; dados: Buffer; tokens: number | null } | { ok: false; erro: string };

type RespostaOpenAI = {
  data?: { b64_json?: string }[];
  usage?: { total_tokens?: number; output_tokens?: number };
  error?: { message?: string; code?: string; type?: string };
};

function erroAmigavel(status: number, json: RespostaOpenAI): string {
  const codigo = json.error?.code ?? "";
  const msg = json.error?.message ?? "";
  if (codigo === "moderation_blocked" || /safety|moderation|policy/i.test(msg)) {
    return "Esse pedido foi bloqueado pelas regras de segurança da IA. Tente descrever de outro jeito.";
  }
  if (status === 429) return "A IA está ocupada agora. Tente de novo em um minuto.";
  if (status === 400 && /image/i.test(msg)) return "Não consegui usar uma das fotos. Tente com outra (JPG ou PNG).";
  return "Não consegui gerar a imagem agora. Tente de novo.";
}

function modeloIndisponivel(status: number, json: RespostaOpenAI) {
  const texto = `${json.error?.code ?? ""} ${json.error?.message ?? ""}`;
  return status === 404 || (status === 400 && /model/i.test(texto) && /not (found|exist|support|available)|does not exist|invalid/i.test(texto)) || (status === 403 && /model/i.test(texto));
}

async function pedir(modelo: string, prompt: string, referencias: Referencia[]) {
  const auth = { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` };
  if (referencias.length) {
    const form = new FormData();
    form.append("model", modelo);
    form.append("prompt", prompt);
    form.append("size", TAMANHO);
    form.append("quality", QUALIDADE());
    form.append("output_format", "jpeg");
    form.append("output_compression", "90");
    for (const ref of referencias) form.append("image[]", new Blob([new Uint8Array(ref.dados)], { type: ref.mime }), ref.nome);
    return fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: auth, body: form, signal: AbortSignal.timeout(180_000) });
  }
  return fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelo, prompt, size: TAMANHO, quality: QUALIDADE(), output_format: "jpeg", output_compression: 90, n: 1 }),
    signal: AbortSignal.timeout(180_000),
  });
}

export async function gerarImagem(prompt: string, referencias: Referencia[]): Promise<ResultadoImagem> {
  if (!geracaoImagemConfigurada()) return { ok: false, erro: "A geração de imagens ainda não está ligada." };
  try {
    const modelos = MODELOS();
    for (const [i, modelo] of modelos.entries()) {
      const r = await pedir(modelo, prompt, referencias);
      const json = (await r.json().catch(() => ({}))) as RespostaOpenAI;
      if (!r.ok) {
        // sem o texto do pedido no log (privacidade): só o modelo e o código do erro
        console.error("[imagens-ia] OpenAI recusou", modelo, r.status, json.error?.code ?? json.error?.type ?? "");
        if (modeloIndisponivel(r.status, json) && i < modelos.length - 1) continue;
        return { ok: false, erro: erroAmigavel(r.status, json) };
      }
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) return { ok: false, erro: "A IA não devolveu a imagem. Tente de novo." };
      return { ok: true, dados: Buffer.from(b64, "base64"), tokens: json.usage?.total_tokens ?? json.usage?.output_tokens ?? null };
    }
    return { ok: false, erro: "Não consegui gerar a imagem agora. Tente de novo." };
  } catch (e) {
    console.error("[imagens-ia] falha", e instanceof Error ? e.name : "erro");
    return { ok: false, erro: "A IA demorou demais para responder. Tente de novo." };
  }
}
