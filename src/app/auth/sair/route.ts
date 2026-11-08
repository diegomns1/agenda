import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Sair da conta. É uma rota comum (POST de formulário), não Server Action: assim funciona mesmo
 * numa aba aberta antes de um deploy novo (a Server Action antiga deixaria de existir e a tela
 * cairia no erro "This page couldn't load").
 */
export async function POST(request: NextRequest) {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
