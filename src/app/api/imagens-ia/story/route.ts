import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { obterPerfil, obterUsuario } from "@/lib/auth";
import { URL_APP } from "@/lib/constantes";
import { temRecurso } from "@/lib/planos";
import { nomeDoRamo } from "@/lib/ramos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { conferirLimite, iniciarGeracao } from "@/features/imagens-ia/iniciar";
import { geracaoImagemConfigurada, type Referencia } from "@/features/imagens-ia/openai";
import { LIMITE_MES } from "@/features/imagens-ia/regras";
import { imagemDoStory, montarStory, TIPOS_DE_STORY } from "@/features/stories/montar";
import { esquemaSelecaoStory } from "@/features/stories/selecao";
import type { TipoStory } from "@/features/stories/temas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/*
 * "Gerar com IA" no gerador de stories (16/11/2026, pedido do Diego).
 * A profissional escolhe tudo como no modelo pronto (tipo, dia, horários, serviços, tema) e a IA refaz o story
 * com acabamento profissional. Corpo JSON: { tipo, ...seleção } (a mesma seleção de /api/stories/[tipo]).
 * A IA recebe o modelo pronto como rascunho (com todas as informações certas), o conteúdo em texto, a logo e,
 * se houver, a foto do serviço. Gasta 1 das imagens do mês; se der erro, não conta.
 */

function erro(texto: string, status = 400) {
  return NextResponse.json({ ok: false, erro: texto }, { status });
}

/** "data:image/jpeg;base64,..." → arquivo de referência. */
function deDataUrl(dataUrl: string | null | undefined, nome: string): Referencia | null {
  const m = dataUrl?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return null;
  return { dados: Buffer.from(m[2], "base64"), mime: m[1], nome: `${nome}.${m[1].split("/")[1]}` };
}

async function baixarLogo(url: string | null): Promise<Referencia | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const mime = (r.headers.get("content-type") ?? "").split(";")[0];
    if (!r.ok || !["image/jpeg", "image/png", "image/webp"].includes(mime)) return null;
    return { dados: Buffer.from(await r.arrayBuffer()), mime, nome: `logo.${mime.split("/")[1]}` };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const [usuario, perfil] = await Promise.all([obterUsuario(), obterPerfil()]);
  if (!usuario || !perfil) return erro("Sessão expirada. Entre de novo.", 401);
  if (!temRecurso(perfil.plano, "stories")) return erro("O Gerar com IA é do plano Premium.", 403);
  if (!geracaoImagemConfigurada()) return erro("A geração de imagens ainda não está ligada.", 503);

  const corpo = (await request.json().catch(() => null)) as { tipo?: string } | null;
  const tipo = corpo?.tipo as TipoStory;
  if (!corpo || !TIPOS_DE_STORY.includes(tipo)) return erro("Escolha o tipo de story.");
  const sel = esquemaSelecaoStory.safeParse(corpo);
  if (!sel.success) return erro("Não entendi o que foi escolhido. Recarregue a página.");

  const admin = criarClienteAdmin();
  const limite = await conferirLimite(admin, usuario.id);
  if (!limite.ok) return erro(limite.erro);

  const story = await montarStory(perfil, tipo, sel.data, URL_APP);
  const foto = tipo === "servicos" ? deDataUrl(sel.data.foto, "foto-do-servico") : null;
  const temLogo = Boolean(story.marca.logoUrl);
  const ramo = perfil.ramo ? nomeDoRamo(perfil.ramo, perfil.ramo_outro) : null;

  const prompt = [
    `Crie um story profissional para o Instagram (imagem vertical 9:16) do negócio "${story.marca.nome}"${ramo ? `, do ramo ${ramo}` : ""}.`,
    `A PRIMEIRA imagem anexada é o rascunho deste story: ele tem todas as informações corretas e mostra o tema escolhido ("${story.tema.nome}").`,
    "Refaça o story com acabamento de agência de design: composição mais bonita, tipografia elegante e bem legível, hierarquia clara e elementos visuais que combinem com o tema e com o ramo do negócio.",
    "",
    "Regras obrigatórias:",
    "- Mantenha exatamente as mesmas informações do rascunho: mesmos textos, datas, horários, nomes e valores. Não invente, não remova e não altere nenhuma informação.",
    "- Todo texto em português do Brasil, com ortografia e acentos corretos, grande o bastante para ler no celular.",
    "- Não invente telefone, endereço, preços, promoções nem nomes de pessoas.",
    `- Cores da marca: ${story.tema.primaria ?? story.marca.primaria} (principal) e ${story.tema.secundaria ?? story.marca.secundaria} (apoio).`,
    "- Deixe uma margem livre no topo e na base (área dos botões do Instagram).",
    "",
    "Conteúdo exato do story:",
    ...story.conteudo,
    `Assinatura: ${story.marca.nome}${story.marca.instagram ? ` · @${story.marca.instagram}` : ""}`,
    "",
    temLogo ? "A SEGUNDA imagem anexada é a logo do negócio: use-a exatamente como ela é, sem redesenhar nem trocar as letras." : "",
    foto ? "A última imagem anexada é a foto do serviço: use-a como imagem principal do story, sem alterar o trabalho mostrado nela." : "",
  ]
    .filter((l, i, todas) => l !== "" || todas[i - 1] !== "")
    .join("\n");

  const id = await iniciarGeracao(admin, {
    usuarioId: usuario.id,
    conversa: randomUUID(),
    pedido: `Story com IA: ${story.resumo} · tema ${story.tema.nome}`,
    anexos: 0,
    prompt,
    referencias: async () => {
      const rascunho: Referencia = { dados: Buffer.from(await imagemDoStory(story).arrayBuffer()), mime: "image/png", nome: "rascunho.png" };
      const logo = await baixarLogo(story.marca.logoUrl);
      // a ordem importa: o texto fala em "primeira", "segunda" e "última"
      return [rascunho, ...(logo ? [logo] : []), ...(foto ? [foto] : [])];
    },
  });
  if (!id) return erro("Não consegui começar. Tente de novo.", 500);

  return NextResponse.json({ ok: true, id, usadas: limite.usadas + 1, limite: LIMITE_MES });
}
