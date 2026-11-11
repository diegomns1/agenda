import type { Metadata, Viewport } from "next";
import { Geist_Mono, Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { NOME_APP } from "@/lib/constantes";
import { META_VERIFICACAO_DOMINIO } from "@/features/rastreio/comum";
import "./globals.css";

// Nunito: arredondada e amigável, combina com o desenho do logotipo
const fonteSans = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const fonteMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: NOME_APP,
    template: `%s · ${NOME_APP}`,
  },
  description: "Vaguinha: agenda online para quem atende com hora marcada.",
  applicationName: NOME_APP,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: NOME_APP,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  // verificação do domínio vaguinha.app na Meta (Configurações do negócio → Domínios)
  other: { "facebook-domain-verification": META_VERIFICACAO_DOMINIO },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#702D50",
  // Android: o teclado encolhe a página, então a janela que sobe de baixo fica acima dele (não escondida)
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${fonteSans.variable} ${fonteMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
