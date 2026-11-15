import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { FUSO, URL_APP } from "@/lib/constantes";
import { contaVencida } from "@/lib/datas";
import { temRecurso } from "@/lib/planos";
import type { criarClienteAdmin } from "@/lib/supabase/admin";
import { normalizarTelefone, variacoesCelular } from "@/lib/telefone";
import { contextoDoPerfil, modeloDe, preencher, valoresDoAtendimento } from "@/features/mensagens/modelos";
import { enviarTextoProprio, estadoInstancia, evolutionConfigurada } from "./evolution";

/*
 * Lembrete automático pelo WhatsApp da própria profissional (fase 2, 15/11/2026).
 * Chamado pela tarefa de 5 em 5 min (api/cron/lembretes). Para parecer gente e não disparo:
 *   - só entre 8h e 20h (Brasília); se a hora certa cair de madrugada, sai às 8h;
 *   - no máximo 1 mensagem por profissional a cada rodada (5 min) e 40 por dia;
 *   - "digitando…" de 2 a 5 s antes de cada mensagem;
 *   - atendimento marcado há menos de 1 h espera (a pessoa acabou de combinar).
 * Usa o texto "Lembrete" da tela Mensagens. Ao sair, marca o mesmo check de "avisada" da lista de Lembretes.
 * Se não der (sem telefone, número sem WhatsApp, erro), anota o motivo e o atendimento fica na lista para mandar na mão.
 */

type Admin = ReturnType<typeof criarClienteAdmin>;

const HORA_INICIO = 8;
const HORA_FIM = 20;
const MAXIMO_POR_DIA = 40;
/** Não manda lembrete faltando menos que isso (já é tarde para ajudar). */
const MINIMO_ANTES_MIN = 45;
/** Acabou de ser marcado: espera 1 h antes de lembrar (a pessoa acabou de combinar). Depois disso, manda normalmente. */
const ESPERA_DEPOIS_DE_MARCAR_MIN = 60;

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
    .select("profissional_id, instancia, numero, lembrete_horas")
    .eq("estado", "conectado")
    .eq("lembrete_ativo", true);
  if (!conexoes?.length) return { enviados: 0 };

  const ids = conexoes.map((c) => c.profissional_id);
  const { data: perfis } = await admin
    .from("profiles")
    .select("id, plano, status, ativa_ate, nome, nome_negocio, endereco, slug, agendamento_online, modelos_mensagem, modelo_lembrete, tratamento")
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

      // limite do dia
      const { count: hoje } = await admin
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("profissional_id", c.profissional_id)
        .is("lembrete_auto_erro", null)
        .gte("lembrete_auto_em", inicioDoDiaSP(agora));
      if ((hoje ?? 0) >= MAXIMO_POR_DIA) return;

      const desde = new Date(agora.getTime() + MINIMO_ANTES_MIN * 60_000).toISOString();
      const ate = new Date(agora.getTime() + c.lembrete_horas * 3_600_000).toISOString();
      const { data: candidatos } = await admin
        .from("agendamentos")
        .select("*")
        .eq("profissional_id", c.profissional_id)
        .eq("tipo", "atendimento")
        .eq("status", "agendado")
        .is("cliente_avisada_em", null)
        .is("lembrete_auto_em", null)
        .gt("inicio", desde)
        .lte("inicio", ate)
        .order("inicio", { ascending: true })
        .limit(5);
      if (!candidatos?.length) return;

      const proprios = new Set(c.numero ? variacoesCelular(c.numero) : []);
      const contexto = contextoDoPerfil(perfil, URL_APP);
      const modelo = modeloDe(perfil, "lembrete");

      // tenta o primeiro que dá para mandar; os que não dão ficam anotados (e seguem na lista para mandar na mão)
      for (const a of candidatos) {
        // marcado agora há pouco: deixa para a próxima rodada (não anota nada)
        if (agora.getTime() - new Date(a.created_at).getTime() < ESPERA_DEPOIS_DE_MARCAR_MIN * 60_000) continue;
        const motivoPular = !a.cliente_id ? "sem cliente cadastrada" : null;

        let telefone: string | null = null;
        if (!motivoPular && a.cliente_id) {
          const { data: cli } = await admin.from("clientes").select("telefone").eq("id", a.cliente_id).maybeSingle();
          telefone = normalizarTelefone(cli?.telefone);
        }
        const motivo =
          motivoPular ??
          (!telefone || !/^55\d{10,11}$/.test(telefone) ? "sem telefone" : proprios.has(telefone) ? "é o seu próprio número" : null);

        // "reserva" o atendimento antes de mandar: se duas rodadas se cruzarem, só uma manda
        const { data: reservado } = await admin
          .from("agendamentos")
          .update({ lembrete_auto_em: agora.toISOString(), lembrete_auto_erro: motivo })
          .eq("id", a.id)
          .is("lembrete_auto_em", null)
          .select("id")
          .maybeSingle();
        if (!reservado || motivo) continue;

        const texto = preencher(modelo, valoresDoAtendimento(a, contexto));
        const r = await enviarTextoProprio(c.instancia, telefone!, texto, espera(2000, 5000));
        if (r.ok) {
          await admin
            .from("agendamentos")
            .update({ lembrete_auto_em: new Date().toISOString(), lembrete_auto_erro: null, cliente_avisada_em: new Date().toISOString() })
            .eq("id", a.id);
          enviados++;
        } else {
          await admin.from("agendamentos").update({ lembrete_auto_erro: r.erro ?? "falhou" }).eq("id", a.id);
          falhas.push(r.erro ?? "falhou");
          // caiu a conexão? para por aqui (o aviso de queda chega pelo webhook)
          if ((await estadoInstancia(c.instancia)) !== "open") {
            await admin.from("whatsapp_conexoes").update({ estado: "desconectado", desconectado_em: new Date().toISOString() }).eq("profissional_id", c.profissional_id);
          }
        }
        break; // 1 por rodada
      }
    }),
  );

  if (falhas.length) console.error("[lembrete automático] falhas:", falhas.join(", "));
  return { enviados, falhas: falhas.length };
}
