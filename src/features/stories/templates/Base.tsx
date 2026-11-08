/* Templates renderizados pelo satori (ImageResponse). Regras do satori:
   - todo elemento com mais de um filho precisa de display: flex
   - só estilos inline; sem classes do Tailwind
   - sem emojis (a fonte padrão não tem) */

import type { Marca } from "@/features/stories/dados";
import { ALTURA_STORY, LARGURA_STORY, type Tema } from "@/features/stories/temas";

export type Paleta = {
  primaria: string;
  secundaria: string;
  /** Cor do texto sobre a primária (chips e botão do rodapé). */
  sobrePrimaria: string;
  /** Cor do título principal. */
  titulo: string;
  /** Cor de destaque para texto dentro de cartões brancos (a primária, ou escuro se ela for clara). */
  primariaNoClaro: string;
  texto: string;
  fundo: [string, string];
  decoracao: string;
};

export function paletaDe(tema: Tema, marca: Marca): Paleta {
  return {
    primaria: tema.primaria ?? marca.primaria,
    secundaria: tema.secundaria ?? marca.secundaria,
    sobrePrimaria: tema.sobrePrimaria ?? "#FFFFFF",
    titulo: tema.titulo ?? tema.primaria ?? marca.primaria,
    primariaNoClaro: tema.primariaClara ? "#1F1F23" : (tema.primaria ?? marca.primaria),
    texto: tema.texto,
    fundo: tema.id === "neutro" ? [marca.secundaria, "#FFFFFF"] : tema.fundo,
    decoracao: tema.id === "neutro" ? `${marca.primaria}1F` : tema.decoracao,
  };
}

/** "terça-feira, 10 de novembro" → "Terça-feira, 10 de novembro" (só a primeira letra). */
export function primeiraMaiuscula(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** "#RRGGBB" + opacidade → "rgba(r,g,b,a)" (para o painel por cima do papel de parede). */
export function rgba(hex: string, alfa: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
}

/** Tamanho do círculo da logo. */
const LOGO = 250;

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
  const comImagem = Boolean(tema.imagemUrl);
  // Com papel de parede, o cabeçalho fica num painel translúcido para o texto não brigar com o desenho.
  const painel = comImagem
    ? { background: rgba(paleta.fundo[0], 0.86), borderRadius: 56, padding: "40px 48px", margin: "0 70px" }
    : {};

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
      {comImagem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tema.imagemUrl} width={LARGURA_STORY} height={ALTURA_STORY} alt="" style={{ position: "absolute", top: 0, left: 0, width: LARGURA_STORY, height: ALTURA_STORY, objectFit: "cover" }} />
      ) : (
        <>
          <div style={{ position: "absolute", top: -220, right: -220, width: 620, height: 620, borderRadius: 310, background: paleta.decoracao, display: "flex" }} />
          <div style={{ position: "absolute", bottom: -260, left: -200, width: 560, height: 560, borderRadius: 280, background: paleta.decoracao, display: "flex" }} />
        </>
      )}

      {/* espaço do topo (área da foto de perfil do Instagram) */}
      <div style={{ display: "flex", height: comImagem ? 170 : 110 }} />

      {/* cabeçalho (logo, nome, título) */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", ...painel }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: LOGO,
              height: LOGO,
              borderRadius: LOGO / 2,
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
              <img src={marca.logoUrl} width={LOGO - 16} height={LOGO - 16} alt="" style={{ objectFit: "contain" }} />
            ) : (
              <div style={{ display: "flex", fontSize: 120, fontWeight: 800, color: paleta.primaria }}>{inicial}</div>
            )}
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 800, marginTop: 24, textAlign: "center", padding: comImagem ? 0 : "0 80px" }}>{marca.nome}</div>
          {marca.instagram ? <div style={{ display: "flex", fontSize: 32, opacity: 0.75, marginTop: 6 }}>@{marca.instagram}</div> : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: comImagem ? 36 : 70, padding: comImagem ? 0 : "0 80px" }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: paleta.titulo, textAlign: "center" }}>{titulo}</div>
          {subtitulo ? (
            <div style={{ display: "flex", fontSize: 36, opacity: 0.85, marginTop: 10, textAlign: "center" }}>{primeiraMaiuscula(subtitulo)}</div>
          ) : null}
        </div>
      </div>

      {/* conteúdo */}
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: comImagem ? "44px 90px 0 90px" : "60px 80px 0 80px" }}>{children}</div>

      {/* rodapé */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: comImagem ? 170 : 90 }}>
        <div
          style={{
            display: "flex",
            padding: "22px 54px",
            borderRadius: 999,
            background: paleta.primaria,
            color: paleta.sobrePrimaria,
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          {rodape ?? "Chame no WhatsApp para agendar"}
        </div>
        <div style={{ display: "flex", marginTop: 18 }}>
          <Legivel paleta={paleta} comImagem={comImagem} style={{ fontSize: 24, opacity: comImagem ? 0.85 : 0.45 }}>
            vaguinha.app
          </Legivel>
        </div>
      </div>
    </div>
  );
}

/** Texto solto sobre o fundo: com papel de parede ganha uma pílula translúcida para não sumir no desenho. */
export function Legivel({ paleta, comImagem, style, children }: { paleta: Paleta; comImagem: boolean; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        ...(comImagem ? { background: rgba(paleta.fundo[0], 0.82), padding: "8px 24px", borderRadius: 999 } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Pílula de horário. Com `largura`, todas ficam do mesmo tamanho (grade alinhada). */
export function Chip({ texto, paleta, grande = false, largura }: { texto: string; paleta: Paleta; grande?: boolean; largura?: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        width: largura,
        padding: grande ? "16px 0" : "10px 22px",
        borderRadius: 999,
        background: paleta.primaria,
        color: paleta.sobrePrimaria,
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
        background: rgba(paleta.fundo[0], 0.86),
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
