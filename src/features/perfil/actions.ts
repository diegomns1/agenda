"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterUsuario } from "@/lib/auth";
import { normalizarTelefone } from "@/lib/telefone";
import { valoresDoForm, type EstadoForm } from "@/components/formulario/tipos";
import type { ProfileUpdate } from "@/types/database";
import { ESQUEMAS_SECAO, expedienteDoForm, SECOES_PERFIL, type SecaoPerfil } from "./schema";

const CAMPOS_TEXTO = [
  "nome", "nome_negocio", "telefone", "instagram",
  "cor_primaria", "cor_secundaria", "intervalo_grade_min", "endereco",
  "slug", "agendamento_online", "confirmacao_online", "antecedencia_min_horas",
  "ramo", "ramo_outro", "tema",
];

function revalidarPerfil() {
  revalidatePath("/", "layout");
  revalidatePath("/perfil", "layout");
}

/**
 * Salva UMA tela do Perfil (campo oculto "secao": dados, horarios, aparencia ou link). Só os campos dessa tela
 * são validados e gravados, então um problema em outra parte do perfil não impede de salvar esta.
 */
export async function salvarPerfil(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await obterUsuario();
  if (!usuario) return { erro: "Sessão expirada. Entre de novo." };

  const secao = String(formData.get("secao") ?? "") as SecaoPerfil;
  if (!SECOES_PERFIL.includes(secao)) return { erro: "Não foi possível salvar. Recarregue a página." };

  const valores = valoresDoForm(formData, CAMPOS_TEXTO);
  const bruto = {
    ...Object.fromEntries(CAMPOS_TEXTO.map((c) => [c, formData.get(c) ?? ""])),
    expediente: expedienteDoForm(formData),
  };

  const falha = (erro: z.ZodError): EstadoForm => {
    const flat = z.flattenError(erro);
    // Erros dentro de expediente viram uma mensagem geral legível
    const errosExpediente = erro.issues.filter((i) => i.path[0] === "expediente").map((i) => i.message);
    return {
      erros: flat.fieldErrors as Record<string, string[] | undefined>,
      erro: errosExpediente[0] ? `Expediente: ${errosExpediente[0]}` : "Confira os campos destacados.",
      valores,
    };
  };

  let mudanca: ProfileUpdate;
  if (secao === "dados") {
    const r = ESQUEMAS_SECAO.dados.safeParse(bruto);
    if (!r.success) return falha(r.error);
    const d = r.data;
    mudanca = {
      nome: d.nome,
      nome_negocio: d.nome_negocio,
      telefone: normalizarTelefone(d.telefone),
      instagram: d.instagram,
      endereco: d.endereco,
      ramo: d.ramo,
      ramo_outro: d.ramo === "outro" ? d.ramo_outro : null,
    };
  } else if (secao === "horarios") {
    const r = ESQUEMAS_SECAO.horarios.safeParse(bruto);
    if (!r.success) return falha(r.error);
    mudanca = { expediente: r.data.expediente, intervalo_grade_min: r.data.intervalo_grade_min };
  } else if (secao === "aparencia") {
    const r = ESQUEMAS_SECAO.aparencia.safeParse(bruto);
    if (!r.success) return falha(r.error);
    mudanca = { tema: r.data.tema, cor_primaria: r.data.cor_primaria, cor_secundaria: r.data.cor_secundaria };
  } else {
    const r = ESQUEMAS_SECAO.link.safeParse(bruto);
    if (!r.success) return falha(r.error);
    const d = r.data;
    mudanca = { slug: d.slug, agendamento_online: d.agendamento_online, confirmacao_online: d.confirmacao_online, antecedencia_min_horas: d.antecedencia_min_horas };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("profiles").update(mudanca).eq("id", usuario.id);

  if (error) {
    if (error.code === "23505") return { erro: "Esse endereço do link já está em uso. Escolha outro.", erros: { slug: ["Já em uso"] }, valores };
    return { erro: `Não foi possível salvar: ${error.message}`, valores };
  }

  revalidarPerfil();
  return { ok: true, mensagem: "Salvo." };
}

/** Grava a URL pública da logo depois do upload feito pelo navegador. */
export async function salvarLogoUrl(logoUrl: string | null): Promise<EstadoForm> {
  const usuario = await obterUsuario();
  if (!usuario) return { erro: "Sessão expirada. Entre de novo." };

  const supabase = await criarClienteServidor();

  if (logoUrl) {
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${usuario.id}/`;
    if (!logoUrl.startsWith(base)) return { erro: "Endereço da logo inválido." };
  } else {
    // Remover: apaga os arquivos da pasta da profissional
    const { data: arquivos } = await supabase.storage.from("logos").list(usuario.id);
    if (arquivos?.length) {
      await supabase.storage.from("logos").remove(arquivos.map((a) => `${usuario.id}/${a.name}`));
    }
  }

  const { error } = await supabase.from("profiles").update({ logo_url: logoUrl }).eq("id", usuario.id);
  if (error) return { erro: `Não foi possível salvar a logo: ${error.message}` };

  revalidarPerfil();
  return { ok: true, mensagem: logoUrl ? "Logo atualizada." : "Logo removida." };
}
