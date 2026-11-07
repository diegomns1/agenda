/* Templates renderizados pelo satori (ImageResponse). Regras do satori:
   - todo elemento com mais de um filho precisa de display: flex
   - só estilos inline; sem classes do Tailwind
   - sem emojis (a fonte padrão não tem) */

import type { Marca } from "@/features/stories/dados";
import { ALTURA_STORY, LARGURA_STORY, type Tema } from "@/features/stories/temas";

export type Paleta = { primaria: string; secundaria: string; texto: string; fundo: [string, string]; decoracao: string };

export function paletaDe(tema: Tema, marca: Marca): Paleta {
  return {
    primaria: tema.primaria ?? marca.primaria,
    secundaria: tema.secundaria ?? marca.secundaria,
    texto: tema.texto,
    fundo: tema.id === "neutro" ? [marca.secundaria, "#FFFFFF"] : tema.fundo,
    decoracao: tema.id === "neutro" ? `${marca.primaria}1F` : tema.decoracao,
  };
}

type PropsBase = {
  tema: Tema;
  marca: Marca;
  paleta: Paleta;
  titulo: string;
  subtitulo?: string;
  rodape?: string;
  children: React.ReactNode;
};

export function Base({ tema, marca, paleta, titulo, subtitulo, rodape, children }: PropsBase) {
  const logoEhSvg = marca.logoUrl?.split("?")[0].toLowerCase().endsWith(".svg");
  const inicial = (marca.nome.trim()[0] ?? "V").toUpperCase();

  return (
    <div
      style={{
        width: LARGURA_STORY,
        height: ALTURA_STORY,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: `linear-gradient(160deg, ${paleta.fundo[0]} 0%, ${paleta.fundo[1]} 100%)`,
        color: paleta.texto,
        fontFamily: "sans-serif",
        overflow: "hidden",
      }}
    >
      {/* decoração */}
      <div style={{ position: "absolute", top: -220, right: -220, width: 620, height: 620, borderRadius: 310, background: paleta.decoracao, display: "flex" }} />
      <div style={{ position: "absolute", bottom: -260, left: -200, width: 560, height: 560, borderRadius: 280, background: paleta.decoracao, display: "flex" }} />

      {/* faixa do tema */}
      {tema.faixa ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 70 }}>
          <div
            style={{
              display: "flex",
              padding: "16px 44px",
              borderRadius: 999,
              background: paleta.primaria,
              color: "#FFFFFF",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {tema.faixa}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", height: 70 }} />
      )}

      {/* cabeçalho: logo + nome */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 50 }}>
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: 100,
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `8px solid ${paleta.primaria}`,
            overflow: "hidden",
          }}
        >
          {marca.logoUrl && !logoEhSvg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={marca.logoUrl} width={184} height={184} alt="" style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: paleta.primaria }}>{inicial}</div>
          )}
        </div>
        <div style={{ display: "flex", fontSize: 58, fontWeight: 800, marginTop: 28, textAlign: "center", padding: "0 80px" }}>{marca.nome}</div>
        {marca.instagram ? (
          <div style={{ display: "flex", fontSize: 32, opacity: 0.75, marginTop: 6 }}>@{marca.instagram}</div>
        ) : null}
      </div>

      {/* título */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 70, padding: "0 80px" }}>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: paleta.primaria, textAlign: "center" }}>{titulo}</div>
        {subtitulo ? (
          <div style={{ display: "flex", fontSize: 36, opacity: 0.8, marginTop: 10, textAlign: "center", textTransform: "capitalize" }}>{subtitulo}</div>
        ) : null}
      </div>

      {/* conteúdo */}
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "60px 80px 0 80px" }}>{children}</div>

      {/* rodapé */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 90 }}>
        <div
          style={{
            display: "flex",
            padding: "22px 54px",
            borderRadius: 999,
            background: paleta.primaria,
            color: "#FFFFFF",
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          {rodape ?? "Chame no WhatsApp para agendar"}
        </div>
        <div style={{ display: "flex", fontSize: 24, opacity: 0.45, marginTop: 26 }}>vaguinha.app</div>
      </div>
    </div>
  );
}

/** Pílula de horário. */
export function Chip({ texto, paleta, grande = false }: { texto: string; paleta: Paleta; grande?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        padding: grande ? "18px 34px" : "10px 22px",
        borderRadius: 999,
        background: paleta.primaria,
        color: "#FFFFFF",
        fontSize: grande ? 44 : 30,
        fontWeight: 700,
        letterSpacing: 1,
      }}
    >
      {texto}
    </div>
  );
}

/** Caixa de aviso (agenda cheia, folga...). */
export function Aviso({ texto, paleta }: { texto: string; paleta: Paleta }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "40px",
        borderRadius: 32,
        background: "rgba(255,255,255,0.55)",
        color: paleta.texto,
        fontSize: 40,
        fontWeight: 600,
        textAlign: "center",
      }}
    >
      {texto}
    </div>
  );
}
