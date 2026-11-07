import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { obterPerfil } from "@/lib/auth";
import { ehDataISO, hojeISO } from "@/lib/datas";
import { temRecurso } from "@/lib/planos";
import {
  dadosDia,
  dadosDiaManual,
  dadosMes,
  dadosMesManual,
  dadosSemana,
  dadosSemanaManual,
  dadosServicos,
  marcaDoPerfil,
} from "@/features/stories/dados";
import { esquemaSelecaoStory, type SelecaoStory } from "@/features/stories/selecao";
import { ALTURA_STORY, LARGURA_STORY, obterTema, type TipoStory } from "@/features/stories/temas";
import { StoryDia } from "@/features/stories/templates/StoryDia";
import { StorySemana } from "@/features/stories/templates/StorySemana";
import { StoryMes } from "@/features/stories/templates/StoryMes";
import { StoryServicos } from "@/features/stories/templates/StoryServicos";
import type { Profile } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS: TipoStory[] = ["dia", "semana", "mes", "servicos"];

type Contexto = { params: Promise<{ tipo: string }> };

async function autorizar(tipo: string) {
  if (!TIPOS.includes(tipo as TipoStory)) return { erro: NextResponse.json({ erro: "Tipo inválido" }, { status: 404 }) };
  const perfil = await obterPerfil();
  if (!perfil) return { erro: NextResponse.json({ erro: "Não autorizado" }, { status: 401 }) };
  if (!temRecurso(perfil.plano, "stories")) return { erro: NextResponse.json({ erro: "Recurso não incluído no plano" }, { status: 403 }) };
  return { perfil };
}

/** Monta a imagem: com seleção manual usa o que a profissional marcou; sem, lê a agenda. */
async function gerar(perfil: Profile, tipo: TipoStory, sel: SelecaoStory, baixar: boolean) {
  const data = sel.data && ehDataISO(sel.data) ? sel.data : hojeISO();
  const tema = obterTema(sel.tema);
  const marca = marcaDoPerfil(perfil);

  let elemento: React.ReactElement;
  switch (tipo) {
    case "dia":
      elemento = <StoryDia tema={tema} marca={marca} dados={sel.horarios ? dadosDiaManual(data, sel.horarios) : await dadosDia(perfil, data)} />;
      break;
    case "semana":
      elemento = <StorySemana tema={tema} marca={marca} dados={sel.dias ? dadosSemanaManual(data, sel.dias) : await dadosSemana(perfil, data)} />;
      break;
    case "mes":
      elemento = <StoryMes tema={tema} marca={marca} dados={sel.dias ? dadosMesManual(data, sel.dias) : await dadosMes(perfil, data)} />;
      break;
    default:
      elemento = <StoryServicos tema={tema} marca={marca} dados={await dadosServicos(sel.servicos, sel.foto)} />;
  }

  const nomeArquivo = `vaguinha-${tipo}-${tipo === "servicos" ? "tabela" : data}-${tema.id}.png`;
  return new ImageResponse(elemento, {
    width: LARGURA_STORY,
    height: ALTURA_STORY,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="${nomeArquivo}"`,
    },
  });
}

/**
 * GET /api/stories/{dia|semana|mes|servicos}?data=AAAA-MM-DD&tema=neutro&baixar=1
 * Versão automática (lê a agenda). Mantida para links diretos.
 */
export async function GET(request: NextRequest, { params }: Contexto) {
  const { tipo } = await params;
  const r = await autorizar(tipo);
  if ("erro" in r) return r.erro;

  const sp = request.nextUrl.searchParams;
  return gerar(r.perfil, tipo as TipoStory, { data: sp.get("data") ?? undefined, tema: sp.get("tema") ?? undefined }, sp.get("baixar") === "1");
}

/**
 * POST /api/stories/{tipo} com JSON { tema, data, horarios, dias, servicos, foto }
 * Versão manual: a tela de stories manda o que a profissional marcou.
 */
export async function POST(request: NextRequest, { params }: Contexto) {
  const { tipo } = await params;
  const r = await autorizar(tipo);
  if ("erro" in r) return r.erro;

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido" }, { status: 400 });
  }
  const sel = esquemaSelecaoStory.safeParse(corpo);
  if (!sel.success) return NextResponse.json({ erro: "Seleção inválida" }, { status: 400 });

  return gerar(r.perfil, tipo as TipoStory, sel.data, false);
}
