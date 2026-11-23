"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { origemDoPedido, registrarCadastro } from "@/features/rastreio/servidor";
import { headers } from "next/headers";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { normalizarTelefone } from "@/lib/telefone";
import { URL_APP } from "@/lib/constantes";
import { VERSAO_TERMOS } from "@/lib/legal";
import { OUTRO_RAMO, obterRamo } from "@/lib/ramos";
import { emailDoAdmin, enviarEmail } from "@/lib/email";
import { aprovacaoAutomatica, aprovarTesteAutomatico } from "./aprovacao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";
import { emailCadastroRecebido, emailNovoCadastroAdmin } from "@/features/emails/modelos";
import { valoresDoForm, type EstadoForm } from "@/components/formulario/tipos";
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
  const valores = valoresDoForm(formData, ["email"]);
  const r = esquemaLogin.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, valores };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: r.data.email,
    password: r.data.senha,
  });
  if (error) return { erro: traduzirErroAuth(error.message), valores };

  // o admin começa na área de admin (a não ser que o login tenha um destino guardado)
  const destino = destinoSeguro(formData.get("proximo"));
  redirect(destino === "/" && data.user?.app_metadata?.role === "admin" ? "/admin" : destino);
}

export async function cadastrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = valoresDoForm(formData, ["nome", "telefone", "email", "aceite", "ramo", "ramo_outro"]);
  const r = esquemaCadastro.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, valores };

  const telefone = normalizarTelefone(r.data.telefone);
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email: r.data.email,
    password: r.data.senha,
    options: {
      emailRedirectTo: `${await urlBase()}/auth/callback`,
      data: {
        nome: r.data.nome,
        telefone,
        // gravados em profiles pelo trigger handle_new_user (migração 0012)
        termos_aceitos_em: new Date().toISOString(),
        termos_versao: VERSAO_TERMOS,
        // ramo e tema também vão para profiles pelo trigger (migração 0016). A pergunta "como prefere ser chamada(o)"
        // saiu em 16/11/2026: os textos são neutros para todo mundo e o painel começa no tema da marca.
        tema: "rosa",
        ramo: r.data.ramo === OUTRO_RAMO || obterRamo(r.data.ramo) ? r.data.ramo : OUTRO_RAMO,
        ramo_outro: r.data.ramo === OUTRO_RAMO ? r.data.ramo_outro : obterRamo(r.data.ramo) ? null : r.data.ramo,
      },
    },
  });
  if (error) return { erro: traduzirErroAuth(error.message), valores };

  // Anúncios: guarda de onde veio e manda o Lead à Meta (sem esperar, para não atrasar o cadastro)
  const novoId = data.user?.id;
  let registro: Promise<unknown> | undefined;
  if (novoId) {
    const origem = await origemDoPedido();
    const eventoId = String(formData.get("evento_id") ?? "").slice(0, 64) || null;
    registro = registrarCadastro(novoId, origem, eventoId).catch((e) => console.error("[meta] cadastro", e));
    after(() => registro);
  }

  // E-mails de aviso (não bloqueiam o cadastro se falharem ou não estiverem configurados)
  const admin = emailDoAdmin();
  // Com a aprovação automática, o "cadastro recebido" sobra: a pessoa recebe a confirmação de e-mail do
  // Supabase e, ao entrar, as boas-vindas com a data do teste (features/auth/aprovacao.ts)
  const automatica = aprovacaoAutomatica();
  await Promise.all([
    automatica ? Promise.resolve() : enviarEmail(emailCadastroRecebido(r.data.email, r.data.nome)),
    admin
      ? enviarEmail(emailNovoCadastroAdmin(admin, { nome: r.data.nome, email: r.data.email, telefone }, automatica))
      : Promise.resolve(),
  ]);

  // Sem sessão = confirmação de e-mail ligada no Supabase
  if (!data.session) {
    return {
      ok: true,
      mensagem: automatica
        ? "Cadastro feito! Confira seu e-mail e toque no link para confirmar. Ao entrar, seu teste grátis já começa."
        : "Cadastro feito! Confira seu e-mail e clique no link para confirmar a conta.",
    };
  }

  // Com sessão (confirmação de e-mail desligada no Supabase), o teste é liberado AQUI (22/11/2026). Antes só era
  // liberado quando o painel abria, e quem fechava a tela no segundo de espera ficava "Aguardando aprovação"
  // sem conseguir usar. Se falhar, o caminho antigo (primeira entrada no painel) continua valendo.
  if (automatica && novoId) {
    const { data: perfilNovo } = await criarClienteAdmin().from("profiles").select("*").eq("id", novoId).maybeSingle();
    await aprovarTesteAutomatico(perfilNovo as Profile | null, registro).catch((e) => console.error("[cadastro] liberar teste", e));
  }

  // A tela avisa a Meta e o Google do cadastro e depois abre a agenda. Um redirect daqui pularia esse aviso
  // (era por isso que a conversão do Google não aparecia).
  return { ok: true, mensagem: "Cadastro feito! Abrindo a sua agenda...", destino: "/" };
}


export async function recuperarSenha(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = valoresDoForm(formData, ["email"]);
  const r = esquemaRecuperarSenha.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, valores };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(r.data.email, {
    redirectTo: `${await urlBase()}/auth/callback?proximo=/redefinir-senha`,
  });
  if (error) return { erro: traduzirErroAuth(error.message), valores };

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
