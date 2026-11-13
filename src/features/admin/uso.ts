import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/*
 * Uso de cada conta, para o admin saber quem está usando de verdade (13/11/2026).
 * Só CONTAGENS e datas: o admin não vê nomes de clientes nem horários de ninguém (privacidade, migração 0011).
 * Lido com o cliente admin (service_role), já que a RLS não deixa o admin ler os dados das profissionais.
 */

export type NivelUso = "usando" | "configurando" | "parou" | "so_entrou";

export type UsoConta = {
  ultimoAcesso: string | null;
  ultimaAtividade: string | null;
  clientes: number;
  servicos: number;
  /** atendimentos marcados no painel ou pelo link (sem contar os importados) */
  marcados: number;
  importados: number;
  futuros: number;
  pelolink: number;
  notificacoes: boolean;
  whatsapp: boolean;
  logo: boolean;
  nivel: NivelUso;
};

export const NIVEL_USO: Record<NivelUso, { rotulo: string; tom: string; explica: string }> = {
  usando: { rotulo: "Usando", tom: "bg-sucesso text-sucesso-texto", explica: "marcando horários nos últimos 3 dias" },
  configurando: { rotulo: "Configurando", tom: "bg-aviso text-aviso-texto", explica: "cadastrou coisas, mas ainda marca pouco" },
  parou: { rotulo: "Parou", tom: "bg-destructive/10 text-destructive", explica: "mexeu, mas nada há mais de 3 dias" },
  so_entrou: { rotulo: "Só entrou", tom: "bg-muted text-muted-foreground", explica: "não cadastrou nada" },
};

const TRES_DIAS = 3 * 86_400_000;

function maisRecente(atual: string | null, nova: string) {
  return !atual || nova > atual ? nova : atual;
}

/** Uso de todas as contas (as listas aqui ainda são pequenas: busca tudo de uma vez e conta no servidor). */
export async function usoDasContas(): Promise<Map<string, UsoConta>> {
  const admin = criarClienteAdmin();
  const agora = Date.now();
  const hojeIso = new Date().toISOString();

  const [usuarios, perfis, clientes, servicos, agendamentos, push, vinculos] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("id, logo_url, created_at"),
    admin.from("clientes").select("profissional_id, created_at").limit(20000),
    admin.from("servicos").select("profissional_id, created_at").limit(20000),
    admin.from("agendamentos").select("profissional_id, created_at, inicio, tipo, origem, observacoes").limit(50000),
    admin.from("push_subscriptions").select("profissional_id"),
    admin.from("whatsapp_vinculos").select("profissional_id"),
  ]);

  const uso = new Map<string, UsoConta>();
  for (const p of perfis.data ?? []) {
    uso.set(p.id, {
      ultimoAcesso: null,
      ultimaAtividade: null,
      clientes: 0,
      servicos: 0,
      marcados: 0,
      importados: 0,
      futuros: 0,
      pelolink: 0,
      notificacoes: false,
      whatsapp: false,
      logo: Boolean(p.logo_url),
      nivel: "so_entrou",
    });
  }
  for (const u of usuarios.data?.users ?? []) {
    const c = uso.get(u.id);
    if (c && u.last_sign_in_at) c.ultimoAcesso = u.last_sign_in_at;
  }
  for (const x of clientes.data ?? []) {
    const c = uso.get(x.profissional_id);
    if (!c) continue;
    c.clientes++;
    c.ultimaAtividade = maisRecente(c.ultimaAtividade, x.created_at);
  }
  for (const x of servicos.data ?? []) {
    const c = uso.get(x.profissional_id);
    if (!c) continue;
    c.servicos++;
    c.ultimaAtividade = maisRecente(c.ultimaAtividade, x.created_at);
  }
  for (const x of agendamentos.data ?? []) {
    const c = uso.get(x.profissional_id);
    if (!c || x.tipo !== "atendimento") continue;
    const importado = /importado/i.test(x.observacoes ?? "");
    if (importado) c.importados++;
    else c.marcados++;
    if (x.origem === "online") c.pelolink++;
    if (x.inicio >= hojeIso) c.futuros++;
    c.ultimaAtividade = maisRecente(c.ultimaAtividade, x.created_at);
  }
  for (const x of push.data ?? []) {
    const c = uso.get(x.profissional_id);
    if (c) c.notificacoes = true;
  }
  for (const x of vinculos.data ?? []) {
    const c = uso.get(x.profissional_id);
    if (c) c.whatsapp = true;
  }

  for (const c of uso.values()) {
    const algo = c.clientes + c.servicos + c.marcados + c.importados > 0;
    const recente = c.ultimaAtividade ? agora - new Date(c.ultimaAtividade).getTime() <= TRES_DIAS : false;
    if (!algo) c.nivel = "so_entrou";
    else if (!recente) c.nivel = "parou";
    else if (c.marcados >= 3 || c.pelolink > 0) c.nivel = "usando";
    else c.nivel = "configurando";
  }
  return uso;
}
