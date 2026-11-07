import { NextResponse, type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";

/** Rotas que não exigem login. */
const ROTAS_PUBLICAS = ["/login", "/cadastro", "/recuperar-senha", "/auth/callback", "/offline"];

function ehPublica(pathname: string) {
  return ROTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export async function proxy(request: NextRequest) {
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
