import type { DadosSemana, Marca } from "@/features/stories/dados";
import type { Tema } from "@/features/stories/temas";
import { formatarDataISO } from "@/lib/datas";
import { Base, Chip, paletaDe } from "./Base";

const MAX_POR_DIA = 4;

export function StorySemana({ tema, marca, dados }: { tema: Tema; marca: Marca; dados: DadosSemana }) {
  const paleta = paletaDe(tema, marca);
  const subtitulo = `${formatarDataISO(dados.inicio, "dd/MM")} a ${formatarDataISO(dados.fim, "dd/MM")}`;

  return (
    <Base tema={tema} marca={marca} paleta={paleta} titulo="Agenda da semana" subtitulo={subtitulo}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {dados.dias.map((d) => {
          const visiveis = d.horarios.slice(0, MAX_POR_DIA);
          const extras = d.horarios.length - visiveis.length;
          const apagado = !d.atende || d.horarios.length === 0;
          return (
            <div
              key={d.dia}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "18px 26px",
                borderRadius: 26,
                background: apagado ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.75)",
                opacity: apagado ? 0.7 : 1,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", width: 170 }}>
                <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: paleta.primaria, textTransform: "capitalize" }}>{d.semana}</div>
                <div style={{ display: "flex", fontSize: 26, opacity: 0.7, color: "#1F1F23" }}>{d.numero}</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, flex: 1 }}>
                {!d.atende ? (
                  <div style={{ display: "flex", fontSize: 30, color: "#1F1F23", opacity: 0.6 }}>Folga</div>
                ) : d.horarios.length === 0 ? (
                  <div style={{ display: "flex", fontSize: 30, color: "#1F1F23", opacity: 0.6 }}>Lotado</div>
                ) : (
                  <>
                    {visiveis.map((h) => (
                      <Chip key={h} texto={h} paleta={paleta} />
                    ))}
                    {extras > 0 ? <Chip key="extras" texto={`+${extras}`} paleta={paleta} /> : null}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Base>
  );
}
