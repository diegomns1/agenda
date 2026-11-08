import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Vaguinha · agenda online para quem atende com hora marcada";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem que aparece quando o link vaguinha.app é compartilhado (WhatsApp, Instagram, Facebook). */
export default function ImagemOG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 90px",
          background: "linear-gradient(135deg, #FCF6F1 0%, #F6E3EA 100%)",
          color: "#1F1F23",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: -160, right: -120, width: 460, height: 460, borderRadius: 230, background: "rgba(215,153,175,0.35)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -200, left: -120, width: 420, height: 420, borderRadius: 210, background: "rgba(112,45,80,0.10)", display: "flex" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ display: "flex", width: 84, height: 84, borderRadius: 26, background: "#702D50", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: 54, fontWeight: 800 }}>
            V
          </div>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: "#702D50", letterSpacing: -1 }}>vaguinha</div>
        </div>

        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginTop: 56, maxWidth: 900, letterSpacing: -1.5 }}>
          Sua agenda cheia, sem bagunça no WhatsApp.
        </div>
        <div style={{ display: "flex", fontSize: 30, opacity: 0.75, marginTop: 24, maxWidth: 860, lineHeight: 1.4 }}>
          Agenda, clientes, lembretes, link para marcarem sozinhos e stories prontos para o Instagram.
        </div>

        <div style={{ display: "flex", marginTop: 54, gap: 14 }}>
          {["Manicure", "Barbearia", "Tatuagem", "Estética", "Personal"].map((t) => (
            <div key={t} style={{ display: "flex", padding: "12px 24px", borderRadius: 999, background: "rgba(112,45,80,0.10)", color: "#702D50", fontSize: 24, fontWeight: 700 }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
