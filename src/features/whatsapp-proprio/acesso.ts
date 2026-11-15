import "server-only";
import { temRecurso } from "@/lib/planos";
import type { UsuarioSessao } from "@/lib/auth";
import type { Profile } from "@/types/database";
import { evolutionConfigurada } from "./evolution";

/**
 * Quem vê "Conectar meu WhatsApp": precisa da Evolution instalada e do recurso de lembretes no plano.
 * Enquanto testamos (15/11/2026), só o admin; WHATSAPP_PROPRIO_ABERTO=1 na VPS libera para todas.
 */
export function podeConectarWhatsappProprio(usuario: UsuarioSessao | null, perfil: Pick<Profile, "plano"> | null) {
  if (!usuario || !perfil || !evolutionConfigurada()) return false;
  if (!temRecurso(perfil.plano, "lembretes")) return false;
  return usuario.app_metadata.role === "admin" || process.env.WHATSAPP_PROPRIO_ABERTO === "1";
}
