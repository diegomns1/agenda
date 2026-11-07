import type { DadosSemana, Marca } from "@/features/stories/dados";
import type { Tema } from "@/features/stories/temas";
import { formatarDataISO } from "@/lib/datas";
import { Base, paletaDe } from "./Base";

export function StorySemana({ tema, marca, dados }: { tema: Tema; marca: Marca; dados: DadosSemana }) {
  const paleta = paletaDe(tema, marca);
  const subtitulo = `${formatarDataISO(dados.inicio, "dd/MM")} a ${formatarDataISO(dados.fim, "dd/MM")}`;

  return (
    <Base tema={tema} marca={marca} paleta={paleta} titulo="Agenda da semana" subtitulo={subtitulo}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {dados.dias.map((d) => (
          <div
            key={d.dia}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "20px 30px",
              borderRadius: 26,
              background: d.disponivel ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.32)",
              opacity: d.disponivel ? 1 : 0.7,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", width: 190 }}>
              <div style={{ display: "flex", fontSize: 36, fontWeight: 800, color: d.disponivel ? paleta.primaria : "#1F1F23", textTransform: "capitalize" }}>
                {d.semana}
              </div>
              <div style={{ display: "flex", fontSize: 26, opacity: 0.7, color: "#1F1F23" }}>{d.numero}</div>
            </div>
            <div style={{ display: "flex", flex: 1, justifyContent: "flex-end" }}>
              {d.disponivel ? (
                <div
                  style={{
                    display: "flex",
                    padding: "14px 30px",
                    borderRadius: 999,
                    background: paleta.primaria,
                    color: "#FFFFFF",
                    fontSize: 30,
                    fontWeight: 700,
                  }}
                >
                  Consulte horário
                </div>
              ) : (
                <div style={{ display: "flex", fontSize: 30, color: "#1F1F23", opacity: 0.55, fontWeight: 600 }}>Fechado</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Base>
  );
}
