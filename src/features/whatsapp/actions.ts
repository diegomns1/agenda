"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/auth";
import { temRecurso } from "@/lib/planos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { linkWhatsApp } from "@/lib/telefone";
import { NUMERO_ASSISTENTE } from "./numero";

// sem letras/números parecidos (O/0, I/1, L) para ninguém errar se precisar digitar
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Gera o código (vale 15 min) e o link do WhatsApp com a mensagem pronta "Conectar Vaguinha código XXXX-XXXX". */
export async function gerarConexaoWhatsApp(): Promise<{ ok: true; link: string; codigo: string } | { ok: false; erro: string }> {
  const perfil = await obterPerfil();
  if (!perfil) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!temRecurso(perfil.plano, "assistente")) return { ok: false, erro: "A assistente no WhatsApp faz parte do plano Premium." };
  if (!NUMERO_ASSISTENTE) return { ok: false, erro: "A assistente no WhatsApp ainda não está disponível." };

  const bruto = Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  const codigo = `${bruto.slice(0, 4)}-${bruto.slice(4)}`;
  const { error } = await criarClienteAdmin()
    .from("whatsapp_codigos")
    .upsert({ profissional_id: perfil.id, codigo: bruto, expira_em: new Date(Date.now() + 15 * 60_000).toISOString() }, { onConflict: "profissional_id" });
  if (error) return { ok: false, erro: "Não consegui gerar o código agora. Tente de novo." };

  return { ok: true, codigo, link: linkWhatsApp(NUMERO_ASSISTENTE, `Conectar Vaguinha código ${codigo}`) };
}

export async function desconectarWhatsApp(): Promise<{ ok: boolean; erro?: string }> {
  const perfil = await obterPerfil();
  if (!perfil) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await criarClienteAdmin().from("whatsapp_vinculos").delete().eq("profissional_id", perfil.id);
  if (error) return { ok: false, erro: "Não consegui desconectar agora. Tente de novo." };
  revalidatePath("/perfil");
  return { ok: true };
}
