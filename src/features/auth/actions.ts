"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { normalizarTelefone } from "@/lib/telefone";
import { URL_APP } from "@/lib/constantes";
import type { EstadoForm } from "@/components/formulario/tipos";
import {
  esquemaCadastro,
  esquemaLogin,
  esquemaRecuperarSenha,
  esquemaRedefinirSenha,
} from "./schema";

function traduzirErroAuth(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Já existe uma conta com este e-mail.";
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  if (m.includes("password should be")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("same password") || m.includes("different from the old"))
    return "A nova senha precisa ser diferente da atual.";
  if (m.includes("session") && m.includes("missing"))
    return "Sessão expirada. Peça um novo link de redefinição.";
  return "Não foi possível concluir. Tente de novo em instantes.";
}

async function urlBase() {
  if (process.env.NEXT_PUBLIC_APP_URL) return URL_APP;
  const h = await headers();
  const origem = h.get("origin");
  if (origem) return origem;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : URL_APP;
}

function destinoSeguro(valor: FormDataEntryValue | null) {
  return typeof valor === "string" && valor.startsWith("/") && !valor.startsWith("//")
    ? valor
    : "/";
}

export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const r = esquemaLogin.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: r.data.email,
    password: r.data.senha,
  });
  if (error) return { erro: traduzirErroAuth(error.message) };

  redirect(destinoSeguro(formData.get("proximo")));
}

export async function cadastrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const r = esquemaCadastro.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email: r.data.email,
    password: r.data.senha,
    options: {
      emailRedirectTo: `${await urlBase()}/auth/callback`,
      data: {
        nome: r.data.nome,
        telefone: normalizarTelefone(r.data.telefone),
      },
    },
  });
  if (error) return { erro: traduzirErroAuth(error.message) };

  // Sem sessão = confirmação de e-mail ligada no Supabase
  if (!data.session) {
    return {
      ok: true,
      mensagem: "Cadastro feito! Confira seu e-mail e clique no link para confirmar a conta.",
    };
  }

  redirect("/");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function recuperarSenha(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const r = esquemaRecuperarSenha.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(r.data.email, {
    redirectTo: `${await urlBase()}/auth/callback?proximo=/redefinir-senha`,
  });
  if (error) return { erro: traduzirErroAuth(error.message) };

  return {
    ok: true,
    mensagem: "Se este e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.",
  };
}

export async function redefinirSenha(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const r = esquemaRedefinirSenha.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: r.data.senha });
  if (error) return { erro: traduzirErroAuth(error.message) };

  redirect("/");
}
