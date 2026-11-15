import "server-only";
import { ImageResponse } from "next/og";
import { ehDataISO, hojeISO } from "@/lib/datas";
import type { Profile } from "@/types/database";
import { dadosDia, dadosDiaManual, dadosMes, dadosMesManual, dadosSemana, dadosSemanaManual, dadosServicos, marcaDoPerfil, type Marca } from "./dados";
import type { SelecaoStory } from "./selecao";
import { ALTURA_STORY, caminhoFundo, LARGURA_STORY, obterTema, type Tema, type TipoStory } from "./temas";
import { StoryDia } from "./templates/StoryDia";
import { StorySemana } from "./templates/StorySemana";
import { StoryMes } from "./templates/StoryMes";
import { StoryServicos } from "./templates/StoryServicos";

/*
 * Monta um story a partir do que a profissional escolheu (ou da agenda, sem seleção).
 * Usado pela rota do modelo pronto (/api/stories/[tipo]) e pelo "Gerar com IA" (/api/imagens-ia/story),
 * que precisa do mesmo conteúdo em texto para a IA não inventar horários nem valores.
 */

export const TIPOS_DE_STORY: TipoStory[] = ["dia", "semana", "mes", "servicos"];

const cacheFundos = new Map<string, string>();

/** Papel de parede do tema como data URL (guardado em memória enquanto o servidor estiver de pé). */
async function papelDeParede(origem: string, id: string): Promise<string | null> {
  const guardado = cacheFundos.get(id);
  if (guardado) return guardado;
  try {
    const r = await fetch(`${origem}${caminhoFundo(id)}`, { cache: "force-cache" });
    if (!r.ok) return null;
    const dataUrl = `data:image/jpeg;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
    cacheFundos.set(id, dataUrl);
    return dataUrl;
  } catch {
    return null; // sem o papel de parede, o story sai com o fundo em cores do tema
  }
}

export type StoryMontado = {
  elemento: React.ReactElement;
  tema: Tema;
  marca: Marca;
  /** data de referência (dia, início da semana ou qualquer dia do mês) */
  data: string;
  /** resumo curto para mostrar na tela, ex.: "Horários livres · sexta-feira, 14 de novembro" */
  resumo: string;
  /** o conteúdo exato do story em texto, uma informação por linha (para a IA) */
  conteudo: string[];
};

export async function montarStory(perfil: Profile, tipo: TipoStory, sel: SelecaoStory, origem: string): Promise<StoryMontado> {
  const data = sel.data && ehDataISO(sel.data) ? sel.data : hojeISO();
  const base = obterTema(sel.tema);
  // papel de parede: baixado do próprio site (public/stories/temas) e embutido como data URL
  // (o satori recusa baixar de localhost; assim funciona igual no computador e no servidor)
  // "Meu fundo": a imagem vem pronta no pedido (sem ela, o story sai nas cores da profissional)
  const fundo = base.personalizado ? (sel.fundo ?? null) : base.imagem ? await papelDeParede(origem, base.id) : null;
  const tema = fundo ? { ...base, imagemUrl: fundo } : base;
  const marca = marcaDoPerfil(perfil);

  let elemento: React.ReactElement;
  let resumo: string;
  let conteudo: string[];
  switch (tipo) {
    case "dia": {
      const dados = sel.horarios ? dadosDiaManual(data, sel.horarios) : await dadosDia(perfil, data);
      elemento = <StoryDia tema={tema} marca={marca} dados={dados} />;
      const titulo = dados.horarios.length === 1 ? "Vagou um horário!" : "Horários livres";
      resumo = `${titulo} · ${dados.rotuloDia}`;
      conteudo = [
        `Título: ${titulo}`,
        `Data: ${dados.rotuloDia}`,
        dados.horarios.length ? `Horários livres (${dados.horarios.length}): ${dados.horarios.join(", ")}` : "Sem horários livres neste dia (agenda cheia).",
      ];
      break;
    }
    case "semana": {
      const dados = sel.dias ? dadosSemanaManual(data, sel.dias) : await dadosSemana(perfil, data);
      elemento = <StorySemana tema={tema} marca={marca} dados={dados} />;
      resumo = `Agenda da semana · ${dados.dias[0]?.numero} a ${dados.dias.at(-1)?.numero}`;
      conteudo = [
        "Título: Agenda da semana",
        `Período: ${dados.dias[0]?.numero} a ${dados.dias.at(-1)?.numero}`,
        ...dados.dias.map((d) => `${d.semana} ${d.numero}: ${d.disponivel ? "com vaga" : "sem vaga"}`),
      ];
      break;
    }
    case "mes": {
      const dados = sel.dias ? dadosMesManual(data, sel.dias) : await dadosMes(perfil, data);
      elemento = <StoryMes tema={tema} marca={marca} dados={dados} />;
      const comVaga = dados.celulas.filter((c) => c?.disponivel).map((c) => c!.numero);
      resumo = `Agenda do mês · ${dados.rotuloMes}`;
      conteudo = [
        "Título: Agenda do mês",
        `Mês: ${dados.rotuloMes}`,
        comVaga.length ? `Dias com vaga (${comVaga.length}): ${comVaga.join(", ")}` : "Nenhum dia com vaga marcado.",
        "Os outros dias do mês não têm vaga.",
      ];
      break;
    }
    default: {
      const dados = await dadosServicos(sel.servicos, sel.foto);
      elemento = <StoryServicos tema={tema} marca={marca} dados={dados} />;
      const um = dados.itens.length === 1 ? dados.itens[0] : null;
      resumo = um ? `Serviço em destaque · ${um.nome}` : `Serviços e valores · ${dados.itens.length} serviços`;
      conteudo = um
        ? [`Serviço em destaque: ${um.nome}`, `Valor: ${um.valor}`]
        : ["Título: Serviços e valores", ...dados.itens.map((i) => `${i.nome}: ${i.valor}`)];
    }
  }

  return { elemento, tema, marca, data, resumo, conteudo };
}

/** A imagem do modelo pronto (PNG 1080x1920). */
export function imagemDoStory(story: StoryMontado, cabecalhos?: Record<string, string>) {
  return new ImageResponse(story.elemento, { width: LARGURA_STORY, height: ALTURA_STORY, headers: cabecalhos });
}
