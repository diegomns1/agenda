import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { criarClienteAdmin } from "./admin";

type Tabela = keyof Database["public"]["Tables"];

/** Tabelas de negócio que têm a coluna profissional_id (as únicas liberadas no cliente escopado). */
const TABELAS = new Set<Tabela>(["agendamentos", "clientes", "servicos", "assistente_uso", "agendamento_eventos"]);

/**
 * Cliente do banco "preso" a uma profissional, para quando NÃO existe sessão de navegador
 * (ex.: a assistente respondendo pelo WhatsApp). Usa a service_role, mas:
 * - todo select / update / delete ganha `.eq("profissional_id", id)` automaticamente;
 * - todo insert / upsert é gravado com profissional_id = id (mesmo que o código mande outro);
 * - só as tabelas da lista acima; qualquer outra coisa (rpc, storage, auth, outra tabela) dá erro.
 * Assim, o mesmo código das ferramentas da assistente roda sem a RLS e continua sem enxergar
 * dados de outra profissional (a trava fica neste arquivo, não em cada consulta).
 */
export function clienteDaProfissional(profissionalId: string): SupabaseClient<Database> {
  if (!/^[0-9a-f-]{36}$/i.test(profissionalId)) throw new Error("id de profissional inválido");
  const admin = criarClienteAdmin();

  const forcar = (valor: unknown) => {
    const marcar = (linha: object) => ({ ...linha, profissional_id: profissionalId });
    return Array.isArray(valor) ? valor.map(marcar) : marcar(valor as object);
  };

  const from = (tabela: Tabela) => {
    if (!TABELAS.has(tabela)) throw new Error(`Tabela fora do escopo da profissional: ${String(tabela)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- o objeto devolvido imita o query builder do supabase-js
    const q = admin.from(tabela) as any;
    return {
      select: (...args: unknown[]) => q.select(...args).eq("profissional_id", profissionalId),
      update: (...args: unknown[]) => q.update(...args).eq("profissional_id", profissionalId),
      delete: (...args: unknown[]) => q.delete(...args).eq("profissional_id", profissionalId),
      insert: (valor: unknown, opcoes?: unknown) => q.insert(forcar(valor), opcoes),
      upsert: (valor: unknown, opcoes?: unknown) => q.upsert(forcar(valor), opcoes),
    };
  };

  // Só `from` existe; qualquer outro acesso falha fechado.
  return new Proxy({} as SupabaseClient<Database>, {
    get(_alvo, prop) {
      if (prop === "from") return from;
      if (prop === "then") return undefined; // para não parecer uma Promise
      throw new Error(`Recurso fora do escopo da profissional: ${String(prop)}`);
    },
  });
}
