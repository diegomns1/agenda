import { NextResponse, type NextRequest } from "next/server";
import { obterPerfil } from "@/lib/auth";
import { URL_APP } from "@/lib/constantes"; // não usar a origem do pedido: na VPS é localhost:3020 (interno)
import { temRecurso } from "@/lib/planos";
import { imagemDoStory, montarStory, TIPOS_DE_STORY } from "@/features/stories/montar";
import { esquemaSelecaoStory, type SelecaoStory } from "@/features/stories/selecao";
import type { TipoStory } from "@/features/stories/temas";
import type { Profile } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ tipo: string }> };

async function autorizar(tipo: string) {
  if (!TIPOS_DE_STORY.includes(tipo as TipoStory)) return { erro: NextResponse.json({ erro: "Tipo inválido" }, { status: 404 }) };
  const perfil = await obterPerfil();
  if (!perfil) return { erro: NextResponse.json({ erro: "Não autorizado" }, { status: 401 }) };
  if (!temRecurso(perfil.plano, "stories")) return { erro: NextResponse.json({ erro: "Recurso não incluído no plano" }, { status: 403 }) };
  return { perfil };
}

/** Monta a imagem: com seleção manual usa o que a profissional marcou; sem, lê a agenda. */
async function gerar(perfil: Profile, tipo: TipoStory, sel: SelecaoStory, baixar: boolean, origem: string) {
  const story = await montarStory(perfil, tipo, sel, origem);
  const nomeArquivo = `vaguinha-${tipo}-${tipo === "servicos" ? "tabela" : story.data}-${story.tema.id}.png`;
  return imagemDoStory(story, {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="${nomeArquivo}"`,
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
  return gerar(r.perfil, tipo as TipoStory, { data: sp.get("data") ?? undefined, tema: sp.get("tema") ?? undefined }, sp.get("baixar") === "1", URL_APP);
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

  return gerar(r.perfil, tipo as TipoStory, sel.data, false, URL_APP);
}
