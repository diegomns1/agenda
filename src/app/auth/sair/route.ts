import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { URL_APP } from "@/lib/constantes";

/**
 * Sair da conta. É uma rota comum (POST de formulário), não Server Action: assim funciona mesmo
 * numa aba aberta antes de um deploy novo (a Server Action antiga deixaria de existir e a tela
 * cairia no erro "This page couldn't load").
 * Destino com URL_APP: na VPS, request.url é o endereço interno (localhost:3020) atrás do nginx.
 */
export async function POST() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${URL_APP}/login`, 303);
}
