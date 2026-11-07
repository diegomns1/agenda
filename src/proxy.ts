import { NextResponse, type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";

/** Rotas que não exigem login. */
const ROTAS_PUBLICAS = ["/login", "/cadastro", "/recuperar-senha", "/auth/callback", "/offline", "/p"];

function ehPublica(pathname: string) {
  return ROTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Endereços antigos do painel: tudo vai para o domínio oficial (evita sessão/notificações duplicadas). */
const HOSTS_ANTIGOS = new Set(["agenda-murex-five.vercel.app", "agenda.digstudio.com.br"]);
const HOST_OFICIAL = "painel.vaguinha.app";

export async function proxy(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0];
  if (HOSTS_ANTIGOS.has(host)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = HOST_OFICIAL;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  const { response, claims } = await atualizarSessao(request);
  const { pathname } = request.nextUrl;
  const logada = Boolean(claims?.sub);

  // Não logada tentando acessar área privada → login (guardando o destino)
  if (!logada && !ehPublica(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("proximo", pathname);
    return NextResponse.redirect(url);
  }

  // Logada em login/cadastro → vai para o app
  if (logada && (pathname === "/login" || pathname === "/cadastro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Área admin exige role=admin no JWT (checado de novo no layout, por segurança)
  if (pathname.startsWith("/admin") && claims?.app_metadata?.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Tudo, exceto arquivos estáticos, ícones, manifest, service worker e o cron
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
