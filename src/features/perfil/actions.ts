"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterUsuario } from "@/lib/auth";
import { normalizarTelefone } from "@/lib/telefone";
import { valoresDoForm, type EstadoForm } from "@/components/formulario/tipos";
import { esquemaPerfil, expedienteDoForm } from "./schema";

const CAMPOS_TEXTO = [
  "nome", "nome_negocio", "telefone", "instagram",
  "cor_primaria", "cor_secundaria", "intervalo_grade_min", "modelo_lembrete",
  "slug", "agendamento_online", "confirmacao_online", "antecedencia_min_horas",
];

function revalidarPerfil() {
  revalidatePath("/", "layout");
  revalidatePath("/perfil");
}

export async function salvarPerfil(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await obterUsuario();
  if (!usuario) return { erro: "Sessão expirada. Entre de novo." };

  const valores = valoresDoForm(formData, CAMPOS_TEXTO);
  const bruto = {
    ...Object.fromEntries(CAMPOS_TEXTO.map((c) => [c, formData.get(c) ?? ""])),
    expediente: expedienteDoForm(formData),
  };

  const r = esquemaPerfil.safeParse(bruto);
  if (!r.success) {
    const flat = z.flattenError(r.error);
    // Erros dentro de expediente viram uma mensagem geral legível
    const errosExpediente = r.error.issues
      .filter((i) => i.path[0] === "expediente")
      .map((i) => i.message);
    return {
      erros: flat.fieldErrors as Record<string, string[] | undefined>,
      erro: errosExpediente[0] ? `Expediente: ${errosExpediente[0]}` : "Confira os campos destacados.",
      valores,
    };
  }

  const d = r.data;
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("profiles")
    .update({
      nome: d.nome,
      nome_negocio: d.nome_negocio,
      telefone: normalizarTelefone(d.telefone),
      instagram: d.instagram,
      cor_primaria: d.cor_primaria,
      cor_secundaria: d.cor_secundaria,
      intervalo_grade_min: d.intervalo_grade_min,
      modelo_lembrete: d.modelo_lembrete,
      expediente: d.expediente,
      slug: d.slug,
      agendamento_online: d.agendamento_online,
      confirmacao_online: d.confirmacao_online,
      antecedencia_min_horas: d.antecedencia_min_horas,
    })
    .eq("id", usuario.id);

  if (error) {
    if (error.code === "23505") return { erro: "Esse endereço do link já está em uso. Escolha outro.", erros: { slug: ["Já em uso"] }, valores };
    return { erro: `Não foi possível salvar: ${error.message}`, valores };
  }

  revalidarPerfil();
  return { ok: true, mensagem: "Perfil salvo." };
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
