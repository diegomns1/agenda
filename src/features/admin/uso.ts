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
  configurando: { rotulo: "Configurando", tom: "bg-aviso text-aviso-texto", explica: "cadastrou coisas nos últimos 2 dias, mas ainda marca pouco" },
  parou: { rotulo: "Parou", tom: "bg-destructive/10 text-destructive", explica: "mexeu, mas depois não fez mais nada" },
  so_entrou: { rotulo: "Só entrou", tom: "bg-muted text-muted-foreground", explica: "não cadastrou nada" },
};

const DIA = 86_400_000;
/** Quem já usa de verdade (3 horários ou mais, ou recebeu pelo link) vira "Parou" depois deste tempo sem nada novo. */
export const DIAS_PAROU_USANDO = 3;
/**
 * Quem ainda estava configurando vira "Parou" mais cedo (17/11/2026): o teste dura só 5 dias, e quem cadastrou um
 * serviço e sumiu ficava 3 dias aparecendo como "Configurando". Com 2 dias dá tempo de chamar antes do teste acabar.
 */
export const DIAS_PAROU_CONFIGURANDO = 2;

function maisRecente(atual: string | null, nova: string) {
  return !atual || nova > atual ? nova : atual;
}

/** Quem já usa de verdade: 3 horários marcados no painel ou algum pedido pelo link. */
export function usaDeVerdade(u: Pick<UsoConta, "marcados" | "pelolink">) {
  return u.marcados >= 3 || u.pelolink > 0;
}

/**
 * Selo da etapa para a Central do WhatsApp (19/11/2026): em que etapa a conta está e, se parou, onde parou
 * ("Parou de configurar" ou "Parou de usar"). `dias`: há quantos dias não faz nada (null se nunca fez).
 */
export function seloDaEtapa(u: UsoConta, agora = Date.now()) {
  const dias = u.ultimaAtividade ? Math.floor((agora - new Date(u.ultimaAtividade).getTime()) / DIA) : null;
  const rotulo =
    u.nivel === "parou" ? (usaDeVerdade(u) ? "Parou de usar" : "Parou de configurar") : NIVEL_USO[u.nivel].rotulo;
  return { nivel: u.nivel, rotulo, tom: NIVEL_USO[u.nivel].tom, dias };
}

let usoGuardado: { em: number; valor: Promise<Map<string, UsoConta>> } | null = null;

/** Mesmo que usoDasContas, mas reaproveita a conta feita há menos de 2 min (a Central atualiza de 10 em 10 s). */
export function usoDasContasGuardado(): Promise<Map<string, UsoConta>> {
  if (usoGuardado && Date.now() - usoGuardado.em < 2 * 60_000) return usoGuardado.valor;
  const valor = usoDasContas().catch((e) => {
    usoGuardado = null;
    throw e;
  });
  usoGuardado = { em: Date.now(), valor };
  return valor;
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
    const usa = usaDeVerdade(c);
    const parado = c.ultimaAtividade ? agora - new Date(c.ultimaAtividade).getTime() : Infinity;
    const recente = parado <= (usa ? DIAS_PAROU_USANDO : DIAS_PAROU_CONFIGURANDO) * DIA;
    if (!algo) c.nivel = "so_entrou";
    else if (!recente) c.nivel = "parou";
    else if (usa) c.nivel = "usando";
    else c.nivel = "configurando";
  }
  return uso;
}
