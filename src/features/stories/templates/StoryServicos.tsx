import type { DadosServicos, Marca } from "@/features/stories/dados";
import type { Tema } from "@/features/stories/temas";
import { Aviso, Base, paletaDe } from "./Base";

export function StoryServicos({ tema, marca, dados }: { tema: Tema; marca: Marca; dados: DadosServicos }) {
  const paleta = paletaDe(tema, marca);

  // Um serviço só: layout de destaque (foto opcional + valor grande)
  if (dados.itens.length === 1) {
    const s = dados.itens[0];
    const comFoto = Boolean(dados.foto);
    return (
      <Base tema={tema} marca={marca} paleta={paleta} titulo={s.nome}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: comFoto ? 44 : 60 }}>
          {comFoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dados.foto!}
              width={720}
              height={720}
              alt=""
              style={{ width: 720, height: 720, objectFit: "cover", borderRadius: 56, border: "10px solid rgba(255,255,255,0.85)" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 560,
                height: 560,
                borderRadius: 280,
                background: "rgba(255,255,255,0.55)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ display: "flex", fontSize: 230, fontWeight: 800, color: paleta.primariaNoClaro, opacity: 0.35 }}>
                {(s.nome.trim()[0] ?? "V").toUpperCase()}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 30, opacity: 0.7, letterSpacing: 4, textTransform: "uppercase" }}>
              {s.valor === "consulte" ? "valor" : "por apenas"}
            </div>
            <div style={{ display: "flex", fontSize: s.valor === "consulte" ? 96 : 124, fontWeight: 900, color: paleta.titulo, lineHeight: 1.1 }}>
              {s.valor === "consulte" ? "Consulte" : s.valor}
            </div>
          </div>
        </div>
      </Base>
    );
  }

  // Vários: tabela (sem duração, só nome e valor)
  const n = dados.itens.length;
  const fonte = n <= 7 ? 42 : n <= 10 ? 36 : 30;
  const padding = n <= 7 ? 28 : n <= 10 ? 22 : 16;
  const itens = dados.itens.slice(0, 14);

  return (
    <Base tema={tema} marca={marca} paleta={paleta} titulo="Serviços e valores">
      {itens.length === 0 ? (
        <Aviso texto="Escolha pelo menos um serviço para montar a tabela." paleta={paleta} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", borderRadius: 36, background: "rgba(255,255,255,0.75)", padding: "10px 40px", color: "#1F1F23" }}>
          {itens.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                padding: `${padding}px 0`,
                borderBottom: i < itens.length - 1 ? "2px solid rgba(0,0,0,0.08)" : "none",
              }}
            >
              <div style={{ display: "flex", flex: 1, fontSize: fonte, fontWeight: 700, paddingRight: 24 }}>{s.nome}</div>
              <div style={{ display: "flex", fontSize: fonte, fontWeight: 800, color: paleta.primariaNoClaro, whiteSpace: "nowrap" }}>{s.valor}</div>
            </div>
          ))}
          {dados.itens.length > itens.length ? (
            <div style={{ display: "flex", justifyContent: "center", fontSize: 28, opacity: 0.6, padding: "14px 0" }}>
              e mais {dados.itens.length - itens.length} serviços
            </div>
          ) : null}
        </div>
      )}
    </Base>
  );
}
