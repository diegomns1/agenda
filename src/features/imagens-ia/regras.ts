import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { FUSO } from "@/lib/constantes";
import type { criarClienteAdmin } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof criarClienteAdmin>;

export const BUCKET_IMAGENS_IA = "imagens-ia";
/** Imagens por mês para cada profissional (Premium). Pedido com erro não conta. */
export const LIMITE_MES = 30;
export const MAX_ANEXOS = 4;
export const MAX_PEDIDO = 2000;

/** Início do mês atual em Brasília (UTC-3). */
export function inicioDoMesSP(agora = new Date()) {
  return new Date(`${formatInTimeZone(agora, FUSO, "yyyy-MM")}-01T00:00:00-03:00`).toISOString();
}

/** Quantas imagens ela já usou este mês (prontas e em andamento). */
export async function usadasNoMes(admin: Admin, profissionalId: string) {
  const { count } = await admin
    .from("imagens_ia")
    .select("id", { count: "exact", head: true })
    .eq("profissional_id", profissionalId)
    .in("estado", ["gerando", "pronta"])
    .gte("criado_em", inicioDoMesSP());
  return count ?? 0;
}

/**
 * O texto que vai para a IA: o pedido dela, com o formato de story e o idioma.
 * Com imagem anterior na conversa, o pedido é um ajuste nela.
 */
export function montarPrompt(pedido: string, ctx: { ramo: string | null; negocio: string | null; ajuste: boolean; anexos: number }) {
  const linhas = [
    "Imagem vertical no formato de story do Instagram (9:16).",
    "Todo texto escrito na imagem deve estar em português do Brasil, com a ortografia e os acentos corretos.",
  ];
  if (ctx.ramo || ctx.negocio) {
    linhas.push(
      `Contexto, só para entender o estilo (não escreva isto na imagem, a menos que o pedido peça): negócio ${ctx.negocio ? `"${ctx.negocio}"` : ""}${ctx.ramo ? ` do ramo ${ctx.ramo}` : ""}.`,
    );
  }
  if (ctx.ajuste) {
    linhas.push(
      "A primeira imagem anexada é a imagem que você criou antes nesta conversa: aplique o ajuste pedido nela e mantenha todo o resto igual." +
        (ctx.anexos ? " As outras imagens anexadas são referências enviadas pela pessoa." : ""),
    );
  } else if (ctx.anexos) {
    linhas.push("As imagens anexadas são referências enviadas pela pessoa (por exemplo, logo, foto do trabalho ou inspiração): use-as conforme o pedido.");
  }
  linhas.push("", `Pedido: ${pedido}`);
  return linhas.join("\n");
}
