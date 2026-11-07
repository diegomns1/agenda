import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Destino dos links de e-mail do Supabase (confirmação de cadastro, redefinição de senha).
 * Troca o `code` por uma sessão e redireciona para `proximo`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const proximoBruto = searchParams.get("proximo") ?? "/";
  const proximo = proximoBruto.startsWith("/") && !proximoBruto.startsWith("//") ? proximoBruto : "/";

  if (code) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${proximo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?msg=link-invalido`);
}
