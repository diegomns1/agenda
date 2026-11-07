import type { DadosMes, Marca } from "@/features/stories/dados";
import type { Tema } from "@/features/stories/temas";
import { Base, paletaDe } from "./Base";

const DIAS = ["S", "T", "Q", "Q", "S", "S", "D"];

export function StoryMes({ tema, marca, dados }: { tema: Tema; marca: Marca; dados: DadosMes }) {
  const paleta = paletaDe(tema, marca);
  const semanas: (typeof dados.celulas)[] = [];
  for (let i = 0; i < 42; i += 7) semanas.push(dados.celulas.slice(i, i + 7));
  // remove semanas totalmente fora do mês
  const visiveis = semanas.filter((s) => s.some(Boolean));
  const tam = 118;

  return (
    <Base tema={tema} marca={marca} paleta={paleta} titulo="Agenda do mês" subtitulo={dados.rotuloMes}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
          {DIAS.map((d, i) => (
            <div key={i} style={{ display: "flex", width: tam, justifyContent: "center", fontSize: 30, fontWeight: 700, opacity: 0.6 }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {visiveis.map((semana, i) => (
            <div key={i} style={{ display: "flex", gap: 14 }}>
              {semana.map((c, j) => (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    width: tam,
                    height: tam,
                    borderRadius: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 40,
                    fontWeight: 700,
                    background: !c ? "transparent" : c.disponivel ? paleta.primaria : "rgba(255,255,255,0.45)",
                    color: !c ? "transparent" : c.disponivel ? "#FFFFFF" : "#1F1F23",
                    opacity: c && !c.disponivel ? (c.passado ? 0.35 : 0.6) : 1,
                    textDecoration: c && !c.disponivel && !c.passado ? "line-through" : "none",
                  }}
                >
                  {c ? String(c.numero) : ""}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 40, marginTop: 50, fontSize: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", width: 34, height: 34, borderRadius: 10, background: paleta.primaria }} />
            <div style={{ display: "flex" }}>com vaga</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.45)", border: "2px solid rgba(0,0,0,0.15)" }} />
            <div style={{ display: "flex" }}>indisponível</div>
          </div>
        </div>
      </div>
    </Base>
  );
}
