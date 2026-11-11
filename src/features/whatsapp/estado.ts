import "server-only";
import { cache } from "react";
import { ehAdmin, obterPerfil, obterUsuario } from "@/lib/auth";
import { temRecurso } from "@/lib/planos";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarTelefone } from "@/lib/telefone";
import { numeroAssistente, whatsappLiberadoPara } from "./numero";

/**
 * Por onde a profissional chega na assistente (decisão de 10/11/2026: WhatsApp é o caminho principal,
 * o chat do painel fica de reserva):
 * - "whatsapp": já conectou → abre a conversa com a Vaguinha no WhatsApp
 * - "conectar": tem direito, mas ainda não conectou → Perfil, quadro "Assistente no WhatsApp"
 * - "painel":   sem o recurso (plano) ou WhatsApp desligado → tela Assistente do painel (que mostra o convite do plano)
 */
export type EstadoWhatsApp =
  | { via: "whatsapp"; link: string; numero: string }
  | { via: "conectar"; numero: string }
  | { via: "painel" };

export const estadoWhatsApp = cache(async (): Promise<EstadoWhatsApp> => {
  const [usuario, perfil] = await Promise.all([obterUsuario(), obterPerfil()]);
  if (!perfil || !temRecurso(perfil.plano, "assistente") || !whatsappLiberadoPara(ehAdmin(usuario))) return { via: "painel" };
  const numero = formatarTelefone(numeroAssistente());
  const supabase = await criarClienteServidor();
  const { data: vinculo } = await supabase.from("whatsapp_vinculos").select("telefone").eq("profissional_id", perfil.id).maybeSingle();
  if (!vinculo) return { via: "conectar", numero };
  return { via: "whatsapp", numero, link: `https://wa.me/${numeroAssistente()}` };
});
