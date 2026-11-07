import type { DadosDia, Marca } from "@/features/stories/dados";
import type { Tema } from "@/features/stories/temas";
import { Aviso, Base, Chip, paletaDe } from "./Base";

const MAX_CHIPS = 24;

export function StoryDia({ tema, marca, dados }: { tema: Tema; marca: Marca; dados: DadosDia }) {
  const paleta = paletaDe(tema, marca);
  const visiveis = dados.horarios.slice(0, MAX_CHIPS);
  const extras = dados.horarios.length - visiveis.length;

  return (
    <Base tema={tema} marca={marca} paleta={paleta} titulo="Horários livres" subtitulo={dados.rotuloDia}>
      {!dados.atende ? (
        <Aviso texto="Hoje não atendo. Veja os próximos dias!" paleta={paleta} />
      ) : dados.horarios.length === 0 ? (
        <Aviso texto="Agenda cheia! Me chame para entrar na lista de espera." paleta={paleta} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 22 }}>
            {visiveis.map((h) => (
              <Chip key={h} texto={h} paleta={paleta} grande />
            ))}
            {extras > 0 ? <Chip key="extras" texto={`+${extras}`} paleta={paleta} grande /> : null}
          </div>
          <div style={{ display: "flex", fontSize: 32, opacity: 0.7, marginTop: 50 }}>
            {dados.horarios.length === 1 ? "1 horário disponível" : `${dados.horarios.length} horários disponíveis`}
          </div>
        </div>
      )}
    </Base>
  );
}
