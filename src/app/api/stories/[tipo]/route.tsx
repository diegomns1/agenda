import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { obterPerfil } from "@/lib/auth";
import { ehDataISO, hojeISO } from "@/lib/datas";
import { temRecurso } from "@/lib/planos";
import { dadosDia, dadosMes, dadosSemana, dadosServicos, marcaDoPerfil } from "@/features/stories/dados";
import { ALTURA_STORY, LARGURA_STORY, obterTema, type TipoStory } from "@/features/stories/temas";
import { StoryDia } from "@/features/stories/templates/StoryDia";
import { StorySemana } from "@/features/stories/templates/StorySemana";
import { StoryMes } from "@/features/stories/templates/StoryMes";
import { StoryServicos } from "@/features/stories/templates/StoryServicos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS: TipoStory[] = ["dia", "semana", "mes", "servicos"];

/**
 * GET /api/stories/{dia|semana|mes|servicos}?data=AAAA-MM-DD&tema=neutro&baixar=1
 * Gera a imagem 1080x1920 (PNG) com os dados da profissional logada. Sem IA: template em código.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (!TIPOS.includes(tipo as TipoStory)) return NextResponse.json({ erro: "Tipo inválido" }, { status: 404 });

  const perfil = await obterPerfil();
  if (!perfil) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  if (!temRecurso(perfil.plano, "stories")) return NextResponse.json({ erro: "Recurso não incluído no plano" }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const data = ehDataISO(sp.get("data")) ? (sp.get("data") as string) : hojeISO();
  const tema = obterTema(sp.get("tema"));
  const marca = marcaDoPerfil(perfil);

  let elemento: React.ReactElement;
  switch (tipo as TipoStory) {
    case "dia":
      elemento = <StoryDia tema={tema} marca={marca} dados={await dadosDia(perfil, data)} />;
      break;
    case "semana":
      elemento = <StorySemana tema={tema} marca={marca} dados={await dadosSemana(perfil, data)} />;
      break;
    case "mes":
      elemento = <StoryMes tema={tema} marca={marca} dados={await dadosMes(perfil, data)} />;
      break;
    default:
      elemento = <StoryServicos tema={tema} marca={marca} dados={await dadosServicos()} />;
  }

  const nomeArquivo = `vaguinha-${tipo}-${tipo === "servicos" ? "tabela" : data}-${tema.id}.png`;
  const baixar = sp.get("baixar") === "1";

  return new ImageResponse(elemento, {
    width: LARGURA_STORY,
    height: ALTURA_STORY,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="${nomeArquivo}"`,
    },
  });
}
