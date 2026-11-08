import type { DadosDia, Marca } from "@/features/stories/dados";
import type { Tema } from "@/features/stories/temas";
import { Aviso, Base, Chip, Legivel, paletaDe } from "./Base";

/** Cabem 6 linhas de 4; acima disso a última pílula vira "+N". */
const MAX_CHIPS = 24;
const LARGURA_UTIL = 900; // 1080 menos as margens laterais do conteúdo
const ESPACO = 20;

export function StoryDia({ tema, marca, dados }: { tema: Tema; marca: Marca; dados: DadosDia }) {
  const paleta = paletaDe(tema, marca);
  const total = dados.horarios.length;
  // Quando passa do limite, a última vaga da grade mostra quantos sobraram
  const visiveis = total > MAX_CHIPS ? dados.horarios.slice(0, MAX_CHIPS - 1) : dados.horarios;
  const textos = total > MAX_CHIPS ? [...visiveis, `+${total - visiveis.length}`] : visiveis;

  // Grade de verdade: colunas fixas e pílulas do mesmo tamanho, linhas alinhadas à esquerda
  const colunas = textos.length <= 3 ? Math.max(1, textos.length) : textos.length <= 9 ? 3 : 4;
  const largura = Math.floor((LARGURA_UTIL - ESPACO * (colunas - 1)) / colunas);
  const larguraChip = Math.min(largura, 280);
  const larguraGrade = larguraChip * colunas + ESPACO * (colunas - 1);
  const linhas: string[][] = [];
  for (let i = 0; i < textos.length; i += colunas) linhas.push(textos.slice(i, i + colunas));

  return (
    <Base tema={tema} marca={marca} paleta={paleta} titulo="Horários livres" subtitulo={dados.rotuloDia}>
      {!dados.atende ? (
        <Aviso texto="Hoje não atendo. Veja os próximos dias!" paleta={paleta} />
      ) : total === 0 ? (
        <Aviso texto="Agenda cheia! Me chame para entrar na lista de espera." paleta={paleta} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", width: larguraGrade, gap: ESPACO }}>
            {linhas.map((linha, i) => (
              <div key={i} style={{ display: "flex", gap: ESPACO }}>
                {linha.map((h) => (
                  <Chip key={h} texto={h} paleta={paleta} grande largura={larguraChip} />
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 40 }}>
            <Legivel paleta={paleta} comImagem={Boolean(tema.imagemUrl)} style={{ fontSize: 32, opacity: tema.imagemUrl ? 0.9 : 0.7 }}>
              {total === 1 ? "1 horário disponível" : `${total} horários disponíveis`}
            </Legivel>
          </div>
        </div>
      )}
    </Base>
  );
}
