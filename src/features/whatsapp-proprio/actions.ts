"use server";

import { revalidatePath } from "next/cache";
import { obterPerfil, obterUsuario } from "@/lib/auth";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { normalizarTelefone } from "@/lib/telefone";
import type { WhatsappConexao } from "@/types/database";
import { podeConectarWhatsappProprio } from "./acesso";
import { HORAS_LEMBRETE, URL_AVISOS_EVOLUTION } from "./opcoes";
import { apagarInstancia, criarInstancia, estadoInstancia, infoInstancia, nomeInstancia, qrAtual, VERSAO_AVISOS, type QrEvolution } from "./evolution";

/*
 * Conectar o WhatsApp da própria profissional (15/11/2026). A tela chama `conectarWhatsapp` e depois
 * `situacaoWhatsapp` de 3 em 3 s até virar "conectado". Quem grava na tabela é o servidor (service_role).
 */

export type SituacaoWhatsapp = {
  estado: WhatsappConexao["estado"];
  numero: string | null;
  nomePerfil: string | null;
  /** imagem do QR (data:image/png;base64,...) */
  qr: string | null;
  /** código de 8 letras para digitar no celular */
  codigo: string | null;
  /** lembrete automático (só quando conectado) */
  lembreteAtivo?: boolean;
  lembreteHoras?: number;
  erro?: string;
};

async function acesso() {
  const [usuario, perfil] = await Promise.all([obterUsuario(), obterPerfil()]);
  if (!usuario || !podeConectarWhatsappProprio(usuario, perfil)) return null;
  return { id: usuario.id, admin: criarClienteAdmin() };
}

function deQr(q: QrEvolution | null) {
  return { qr: q?.base64 || null, codigo: q?.pairingCode || null };
}

/** Começa a conexão. Com `telefone`, gera o código para digitar no celular; sem, só o QR Code. */
export async function conectarWhatsapp(entrada: { telefone?: string | null; aceiteRisco: boolean }): Promise<SituacaoWhatsapp> {
  const vazio: SituacaoWhatsapp = { estado: "desconectado", numero: null, nomePerfil: null, qr: null, codigo: null };
  const a = await acesso();
  if (!a) return { ...vazio, erro: "Esse recurso não está liberado na sua conta." };
  if (!entrada.aceiteRisco) return { ...vazio, erro: "Marque que você está ciente antes de conectar." };

  let numero: string | null = null;
  if (entrada.telefone) {
    numero = normalizarTelefone(entrada.telefone);
    if (!numero || !/^55\d{10,11}$/.test(numero)) return { ...vazio, erro: "Confira o número do WhatsApp (com DDD)." };
  }

  const nome = nomeInstancia(a.id);
  // começa do zero: se havia uma conexão pela metade (ou caída), apaga antes
  if ((await estadoInstancia(nome)) !== "inexistente") await apagarInstancia(nome);

  const q = await criarInstancia(nome, numero, URL_AVISOS_EVOLUTION);
  if (!q) return { ...vazio, erro: "Não consegui falar com o servidor do WhatsApp. Tente de novo em instantes." };

  const agora = new Date().toISOString();
  await a.admin.from("whatsapp_conexoes").upsert({
    profissional_id: a.id,
    instancia: nome,
    estado: "conectando",
    aceite_risco_em: agora,
    avisos_versao: VERSAO_AVISOS,
    atualizado_em: agora,
  });
  return { ...vazio, estado: "conectando", ...deQr(q) };
}

/** Como está a conexão agora (e o QR/código atualizado, enquanto conecta). */
export async function situacaoWhatsapp(): Promise<SituacaoWhatsapp> {
  const vazio: SituacaoWhatsapp = { estado: "desconectado", numero: null, nomePerfil: null, qr: null, codigo: null };
  const a = await acesso();
  if (!a) return vazio;
  const { data: linha } = await a.admin.from("whatsapp_conexoes").select("*").eq("profissional_id", a.id).maybeSingle();
  if (!linha) return vazio;

  const estado = await estadoInstancia(linha.instancia);
  const config = { lembreteAtivo: linha.lembrete_ativo, lembreteHoras: linha.lembrete_horas };
  const agora = new Date().toISOString();

  if (estado === "open") {
    if (linha.estado !== "conectado" || !linha.numero) {
      const info = await infoInstancia(linha.instancia);
      await a.admin
        .from("whatsapp_conexoes")
        .update({ estado: "conectado", numero: info.numero, nome_perfil: info.nomePerfil, conectado_em: agora, motivo_queda: null, atualizado_em: agora })
        .eq("profissional_id", a.id);
      revalidatePath("/lembretes");
      return { ...vazio, ...config, estado: "conectado", numero: info.numero, nomePerfil: info.nomePerfil };
    }
    return { ...vazio, ...config, estado: "conectado", numero: linha.numero, nomePerfil: linha.nome_perfil };
  }

  if (estado === "connecting") return { ...vazio, estado: "conectando", ...deQr(await qrAtual(linha.instancia)) };

  // fechou (QR expirou, ela cancelou, ou caiu)
  if (linha.estado !== "desconectado") {
    await a.admin.from("whatsapp_conexoes").update({ estado: "desconectado", desconectado_em: agora, atualizado_em: agora }).eq("profissional_id", a.id);
  }
  return vazio;
}

/** Desconecta: some de "Dispositivos conectados" no celular dela e os lembretes voltam a ser manuais. */
export async function desconectarWhatsapp(): Promise<{ ok: boolean }> {
  const a = await acesso();
  if (!a) return { ok: false };
  const nome = nomeInstancia(a.id);
  await apagarInstancia(nome);
  const agora = new Date().toISOString();
  await a.admin
    .from("whatsapp_conexoes")
    .update({ estado: "desconectado", desconectado_em: agora, motivo_queda: "desconectou pelo painel", atualizado_em: agora })
    .eq("profissional_id", a.id);
  revalidatePath("/lembretes");
  return { ok: true };
}

/** Liga/desliga o lembrete automático e escolhe quanto tempo antes ele sai. */
export async function salvarLembreteAutomatico(entrada: { ativo: boolean; horas: number }): Promise<{ ok: boolean; erro?: string }> {
  const a = await acesso();
  if (!a) return { ok: false, erro: "Esse recurso não está liberado na sua conta." };
  if (!(HORAS_LEMBRETE as readonly number[]).includes(entrada.horas)) return { ok: false, erro: "Escolha quando o lembrete sai." };
  const { error } = await a.admin
    .from("whatsapp_conexoes")
    .update({ lembrete_ativo: entrada.ativo, lembrete_horas: entrada.horas, atualizado_em: new Date().toISOString() })
    .eq("profissional_id", a.id);
  if (error) return { ok: false, erro: "Não consegui salvar. Tente de novo." };
  revalidatePath("/lembretes");
  return { ok: true };
}
