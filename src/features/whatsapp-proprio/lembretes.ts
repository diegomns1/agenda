import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { FUSO, URL_APP } from "@/lib/constantes";
import { contaVencida } from "@/lib/datas";
import { temRecurso } from "@/lib/planos";
import type { criarClienteAdmin } from "@/lib/supabase/admin";
import { normalizarTelefone, variacoesCelular } from "@/lib/telefone";
import type { Agendamento, AgendamentoUpdate } from "@/types/database";
import { contextoDoPerfil, preencher, valoresDoAtendimento } from "@/features/mensagens/modelos";
import { configurarAvisos, enviarTextoProprio, estadoInstancia, evolutionConfigurada, VERSAO_AVISOS } from "./evolution";
import { MENSAGEM_LEMBRETE_2H, MENSAGEM_LEMBRETE_DIA, URL_AVISOS_EVOLUTION } from "./opcoes";

/*
 * Lembrete automático pelo WhatsApp da própria profissional (Premium), 15/11/2026.
 * Fixo e simples: 1 dia antes e 2 horas antes de cada atendimento, com mensagens padrão (opcoes.ts), sem pedir "sim".
 * Chamado pela tarefa de 5 em 5 min (api/cron/lembretes). Para parecer gente e não disparo:
 *   - só entre 7h e 21h (Brasília);
 *   - no máximo 1 mensagem por profissional a cada rodada (5 min), a de 2 horas primeiro (é a mais urgente);
 *   - "digitando…" de 2 a 5 s antes de cada mensagem;
 *   - atendimento marcado há menos de 1 h espera (a pessoa acabou de combinar).
 * O de 1 dia marca o mesmo check de "avisada" da lista de Lembretes (e não sai se ela já avisou na mão).
 * Se não der (sem telefone, número sem WhatsApp, erro), anota o motivo e o atendimento fica na lista para mandar na mão.
 */

type Admin = ReturnType<typeof criarClienteAdmin>;

const HORA_INICIO = 7;
const HORA_FIM = 21;
const MAXIMO_POR_DIA = 80;
/** Acabou de ser marcado: espera 1 h antes de lembrar. Depois disso, manda normalmente. */
const ESPERA_DEPOIS_DE_MARCAR_MIN = 60;

type Tipo = "dia" | "2h";
/** Janela de cada lembrete: sai quando o atendimento está entre `de` e `ate` minutos à frente. */
const TIPOS: Record<Tipo, { de: number; ate: number; campo: "lembrete_auto_em" | "lembrete_2h_em"; erro: "lembrete_auto_erro" | "lembrete_2h_erro"; modelo: string }> = {
  // 1 dia antes; se já estiver a menos de 3 h, fica só o de 2 horas
  dia: { de: 3 * 60, ate: 24 * 60, campo: "lembrete_auto_em", erro: "lembrete_auto_erro", modelo: MENSAGEM_LEMBRETE_DIA },
  "2h": { de: 30, ate: 2 * 60, campo: "lembrete_2h_em", erro: "lembrete_2h_erro", modelo: MENSAGEM_LEMBRETE_2H },
};

/** Monta a mudança das colunas do tipo (em/erro), com o tipo certo para o Supabase. */
function colunas(tipo: Tipo, v: { em?: string; erro?: string | null }): AgendamentoUpdate {
  const t = TIPOS[tipo];
  const m: Record<string, string | null> = {};
  if (v.em !== undefined) m[t.campo] = v.em;
  if (v.erro !== undefined) m[t.erro] = v.erro;
  return m as AgendamentoUpdate;
}

export function horaDeLembrar(agora = new Date()) {
  const hora = Number(formatInTimeZone(agora, FUSO, "H"));
  return hora >= HORA_INICIO && hora < HORA_FIM;
}

function inicioDoDiaSP(agora: Date) {
  const dia = formatInTimeZone(agora, FUSO, "yyyy-MM-dd");
  // meia-noite em Brasília (UTC-3, sem horário de verão desde 2019)
  return new Date(`${dia}T00:00:00-03:00`).toISOString();
}

const espera = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

export async function rodarLembretesAutomaticos(admin: Admin, agora = new Date()) {
  if (!evolutionConfigurada()) return { enviados: 0, motivo: "Evolution não configurada" };
  if (!horaDeLembrar(agora)) return { enviados: 0, motivo: "fora do horário" };

  const { data: conexoes } = await admin
    .from("whatsapp_conexoes")
    .select("profissional_id, instancia, numero, avisos_versao")
    .eq("estado", "conectado")
    .eq("lembrete_ativo", true);
  if (!conexoes?.length) return { enviados: 0 };

  const ids = conexoes.map((c) => c.profissional_id);
  const { data: perfis } = await admin
    .from("profiles")
    .select("id, plano, status, ativa_ate, nome, nome_negocio, endereco, slug, agendamento_online")
    .in("id", ids);
  const perfilDe = new Map((perfis ?? []).map((p) => [p.id, p]));

  let enviados = 0;
  const falhas: string[] = [];

  await Promise.all(
    conexoes.map(async (c) => {
      const perfil = perfilDe.get(c.profissional_id);
      if (!perfil || perfil.status !== "aprovada" || contaVencida(perfil.ativa_ate)) return;
      // Premium; o admin também (vê o cartão para testar)
      if (!temRecurso(perfil.plano, "lembrete_automatico")) {
        const { data: u } = await admin.auth.admin.getUserById(c.profissional_id);
        if (u?.user?.app_metadata?.role !== "admin") return;
      }

      // limite do dia (os dois tipos juntos)
      const inicioHoje = inicioDoDiaSP(agora);
      const [{ count: dia }, { count: duas }] = await Promise.all([
        admin.from("agendamentos").select("id", { count: "exact", head: true }).eq("profissional_id", c.profissional_id).is("lembrete_auto_erro", null).gte("lembrete_auto_em", inicioHoje),
        admin.from("agendamentos").select("id", { count: "exact", head: true }).eq("profissional_id", c.profissional_id).is("lembrete_2h_erro", null).gte("lembrete_2h_em", inicioHoje),
      ]);
      if ((dia ?? 0) + (duas ?? 0) >= MAXIMO_POR_DIA) return;

      // conexões criadas antes de avisar respostas: passam a avisar
      if (c.avisos_versao < VERSAO_AVISOS && (await configurarAvisos(c.instancia, URL_AVISOS_EVOLUTION))) {
        await admin.from("whatsapp_conexoes").update({ avisos_versao: VERSAO_AVISOS }).eq("profissional_id", c.profissional_id);
      }

      const proprios = new Set(c.numero ? variacoesCelular(c.numero) : []);
      const contexto = contextoDoPerfil(perfil, URL_APP);

      // o de 2 horas primeiro; 1 mensagem por rodada
      for (const tipo of ["2h", "dia"] as Tipo[]) {
        const t = TIPOS[tipo];
        let q = admin
          .from("agendamentos")
          .select("*")
          .eq("profissional_id", c.profissional_id)
          .eq("tipo", "atendimento")
          .eq("status", "agendado")
          .is(t.campo, null)
          .gt("inicio", new Date(agora.getTime() + t.de * 60_000).toISOString())
          .lte("inicio", new Date(agora.getTime() + t.ate * 60_000).toISOString())
          .order("inicio", { ascending: true })
          .limit(5);
        // o de 1 dia não sai se ela já avisou na mão
        if (tipo === "dia") q = q.is("cliente_avisada_em", null);
        const { data: candidatos } = await q;

        for (const a of (candidatos ?? []) as Agendamento[]) {
          // marcado agora há pouco: deixa para a próxima rodada (não anota nada)
          if (agora.getTime() - new Date(a.created_at).getTime() < ESPERA_DEPOIS_DE_MARCAR_MIN * 60_000) continue;

          let telefone: string | null = null;
          let pediuParar = false;
          if (a.cliente_id) {
            const { data: cli } = await admin.from("clientes").select("telefone, sem_lembrete_auto").eq("id", a.cliente_id).maybeSingle();
            telefone = normalizarTelefone(cli?.telefone);
            pediuParar = Boolean(cli?.sem_lembrete_auto);
          }
          const motivo = !a.cliente_id
            ? "sem cliente cadastrada"
            : pediuParar
              ? "a cliente pediu para não receber"
              : !telefone || !/^55\d{10,11}$/.test(telefone)
                ? "sem telefone"
                : proprios.has(telefone)
                  ? "é o seu próprio número"
                  : null;

          // "reserva" antes de mandar: se duas rodadas se cruzarem, só uma manda
          const { data: reservado } = await admin
            .from("agendamentos")
            .update(colunas(tipo, { em: agora.toISOString(), erro: motivo }))
            .eq("id", a.id)
            .is(t.campo, null)
            .select("id")
            .maybeSingle();
          if (!reservado || motivo) continue;

          const texto = preencher(t.modelo, valoresDoAtendimento(a, contexto));
          const r = await enviarTextoProprio(c.instancia, telefone!, texto, espera(2000, 5000));
          if (r.ok) {
            const quando = new Date().toISOString();
            await admin
              .from("agendamentos")
              .update({ ...colunas(tipo, { em: quando, erro: null }), ...(a.cliente_avisada_em ? {} : { cliente_avisada_em: quando }) })
              .eq("id", a.id);
            enviados++;
          } else {
            await admin.from("agendamentos").update(colunas(tipo, { erro: r.erro ?? "falhou" })).eq("id", a.id);
            falhas.push(r.erro ?? "falhou");
            // caiu a conexão? marca (o aviso de queda chega pelo webhook)
            if ((await estadoInstancia(c.instancia)) !== "open") {
              await admin.from("whatsapp_conexoes").update({ estado: "desconectado", desconectado_em: new Date().toISOString() }).eq("profissional_id", c.profissional_id);
            }
          }
          return; // 1 por rodada
        }
      }
    }),
  );

  if (falhas.length) console.error("[lembrete automático] falhas:", falhas.join(", "));
  return { enviados, falhas: falhas.length };
}
