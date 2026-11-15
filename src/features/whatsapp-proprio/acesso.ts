import "server-only";
import { temRecurso } from "@/lib/planos";
import type { UsuarioSessao } from "@/lib/auth";
import type { Profile } from "@/types/database";
import { evolutionConfigurada } from "./evolution";

/**
 * Quem vê "Conectar meu WhatsApp": precisa da Evolution instalada e do plano Premium (recurso lembrete_automatico).
 * O admin vê sempre, para testar.
 */
export function podeConectarWhatsappProprio(usuario: UsuarioSessao | null, perfil: Pick<Profile, "plano"> | null) {
  if (!usuario || !perfil || !evolutionConfigurada()) return false;
  return usuario.app_metadata.role === "admin" || temRecurso(perfil.plano, "lembrete_automatico");
}
