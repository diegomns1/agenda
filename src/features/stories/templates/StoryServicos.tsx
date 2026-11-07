import type { DadosServicos, Marca } from "@/features/stories/dados";
import type { Tema } from "@/features/stories/temas";
import { Aviso, Base, paletaDe } from "./Base";

export function StoryServicos({ tema, marca, dados }: { tema: Tema; marca: Marca; dados: DadosServicos }) {
  const paleta = paletaDe(tema, marca);
  const n = dados.itens.length;
  const fonte = n <= 7 ? 42 : n <= 10 ? 36 : 30;
  const padding = n <= 7 ? 26 : n <= 10 ? 20 : 14;
  const itens = dados.itens.slice(0, 14);

  return (
    <Base tema={tema} marca={marca} paleta={paleta} titulo="Serviços e valores" rodape="Chame no WhatsApp para agendar">
      {itens.length === 0 ? (
        <Aviso texto="Cadastre seus serviços para gerar a tabela." paleta={paleta} />
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
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", fontSize: fonte, fontWeight: 700 }}>{s.nome}</div>
                <div style={{ display: "flex", fontSize: fonte * 0.65, opacity: 0.6 }}>{s.duracao}</div>
              </div>
              <div style={{ display: "flex", fontSize: fonte, fontWeight: 800, color: paleta.primaria }}>{s.valor}</div>
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
