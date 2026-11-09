"use server";

import { z } from "zod";
import { obterPerfil } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { temRecurso } from "@/lib/planos";
import { aplicarProposta, processarMensagem } from "./nucleo";
import { esquemaMensagemChat, esquemaProposta, type MensagemChat, type RespostaAssistente } from "./tipos";

/* Ações da tela Assistente (com a sessão do navegador → RLS). O "cérebro" fica em nucleo.ts. */

export async function conversarComAssistente(historico: MensagemChat[], mensagem: string): Promise<RespostaAssistente> {
  const perfil = await obterPerfil();
  if (!perfil) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!temRecurso(perfil.plano, "assistente")) return { ok: false, erro: "O assistente faz parte do plano Premium." };
  const hist = z.array(esquemaMensagemChat).max(40).safeParse(historico);
  if (!hist.success) return { ok: false, erro: "Conversa inválida. Recarregue a página." };
  const supabase = await criarClienteServidor();
  return processarMensagem({ supabase, perfil, historico: hist.data, texto: mensagem });
}

export async function executarProposta(propostaBruta: unknown): Promise<{ ok: boolean; mensagem: string }> {
  const perfil = await obterPerfil();
  if (!perfil) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  if (!temRecurso(perfil.plano, "assistente")) return { ok: false, mensagem: "O assistente faz parte do plano Premium." };
  const r = esquemaProposta.safeParse(propostaBruta);
  if (!r.success) return { ok: false, mensagem: "Proposta inválida. Peça de novo ao assistente." };
  const supabase = await criarClienteServidor();
  return aplicarProposta(supabase, perfil, r.data);
}
