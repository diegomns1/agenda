import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { horariosDisponiveis, janelaDoDia } from "@/features/agenda/disponibilidade";
import { montarRelatorio, ehMes, mesAtual } from "@/features/relatorios/dados";
import {
  diaDaSemana,
  diasEntre,
  ehDataISO,
  fimDoDia,
  formatarData,
  formatarDataISO,
  hojeISO,
  horaParaMinutos,
  inicioDoDia,
  instanteEmSP,
  minutosDoDia,
  somarDias,
} from "@/lib/datas";
import { formatarTelefone, normalizarTelefone, variacoesCelular } from "@/lib/telefone";
import type { Database, Profile } from "@/types/database";
import type { Proposta } from "./tipos";

/* Ferramentas do Assistente de IA.
   - Ferramentas de LEITURA rodam na hora (com a sessão da profissional: a RLS garante que ela só vê o que é dela).
   - Ferramentas "propor_*" NÃO mudam nada: montam uma proposta que aparece na tela com "Confirmar".
   Todas com `strict: true` (o modelo sempre manda os campos no formato do schema). */

/** Sessão do navegador (RLS) no app, ou o cliente escopado da profissional no WhatsApp. */
type Supabase = SupabaseClient<Database>;
export type Contexto = {
  supabase: Supabase;
  perfil: Profile;
  propostas: Proposta[];
  /** só no WhatsApp: passa a conversa para a equipe (card "Precisa de você" na Central) */
  chamarEquipe?: (motivo: string) => void;
};

const texto = (descricao: string) => ({ type: "string", description: descricao });
const textoOuNulo = (descricao: string) => ({ type: ["string", "null"], description: descricao });
const DATA = "Data no formato AAAA-MM-DD";
const HORA = "Hora no formato HH:mm (24h)";

function ferramenta(name: string, description: string, properties: Record<string, unknown>): Anthropic.Beta.BetaTool {
  return {
    name,
    description,
    strict: true,
    input_schema: { type: "object", properties, required: Object.keys(properties), additionalProperties: false },
  };
}

export const FERRAMENTAS: Anthropic.Beta.BetaTool[] = [
  ferramenta("ver_agenda", "Lista atendimentos e bloqueios entre duas datas (no máximo 31 dias), com id, nome, serviço, horário e situação.", {
    data_inicio: texto(DATA),
    data_fim: texto(DATA),
  }),
  ferramenta("buscar_cliente", "Procura clientes pelo nome (ou parte dele). Devolve id, nome, WhatsApp e o próximo atendimento.", {
    nome: texto("Nome ou parte do nome"),
  }),
  ferramenta("listar_servicos", "Lista os serviços ativos com id, nome, duração e valor.", {}),
  ferramenta("horarios_livres", "Horários de início livres num dia, para um atendimento com a duração informada.", {
    data: texto(DATA),
    duracao_min: { type: "integer", description: "Duração em minutos (use a do serviço)" },
  }),
  ferramenta("resumo_do_mes", "Números do mês: faturamento, atendimentos, desmarcações, remarcações, faltas e comparação com o mês anterior.", {
    mes: textoOuNulo("Mês no formato AAAA-MM; null para o mês atual"),
  }),
  ferramenta("propor_remarcar", "Propõe mudar um atendimento de dia/horário. Não muda nada: a profissional confirma na tela.", {
    agendamento_id: texto("id do atendimento (de ver_agenda)"),
    data: texto(DATA),
    hora: texto(HORA),
  }),
  ferramenta("propor_cancelar", "Propõe cancelar um atendimento (o horário fica livre). A profissional confirma na tela.", {
    agendamento_id: texto("id do atendimento (de ver_agenda)"),
  }),
  ferramenta("propor_marcar", "Propõe marcar um atendimento novo. Use cliente_id de buscar_cliente; se for alguém novo, cliente_id null e informe o nome.", {
    cliente_id: textoOuNulo("id da cliente (de buscar_cliente) ou null se for um cadastro novo"),
    nova_cliente_nome: textoOuNulo("Nome, só quando cliente_id for null"),
    nova_cliente_telefone: textoOuNulo("WhatsApp, só quando cliente_id for null; null se não souber"),
    servico_id: texto("id do serviço (de listar_servicos)"),
    data: texto(DATA),
    hora: texto(HORA),
  }),
  ferramenta("propor_bloqueio", "Propõe um compromisso da profissional, que ocupa o horário (academia, natação, médico, almoço, folga). A profissional confirma na tela.", {
    titulo: texto("Motivo curto, ex.: Médico"),
    data: texto(DATA),
    dia_inteiro: { type: "boolean", description: "true para bloquear o dia todo" },
    hora_inicio: textoOuNulo(`${HORA}; null se dia_inteiro`),
    hora_fim: textoOuNulo(`${HORA}; null se dia_inteiro`),
  }),
  ferramenta(
    "propor_cadastrar_cliente",
    "Propõe cadastrar uma cliente nova (sem marcar horário). Confere sozinha se já existe alguém com o mesmo WhatsApp ou nome parecido e avisa no resultado. A profissional confirma na tela.",
    {
      nome: texto("Nome como a profissional falou (ex.: Duda, Maria Eduarda)"),
      telefone: textoOuNulo("WhatsApp com DDD, como foi dito (ex.: 14999998888); null se não informado"),
      observacoes: textoOuNulo("Observação curta se a profissional pediu (ex.: alérgica a acetona); null se não"),
    },
  ),
  ferramenta(
    "propor_editar_cliente",
    "Propõe mudar o nome, o WhatsApp ou a observação de uma cliente que já existe. Campo null = não muda. A profissional confirma na tela.",
    {
      cliente_id: texto("id da cliente (de buscar_cliente)"),
      nome: textoOuNulo("Nome novo; null para manter"),
      telefone: textoOuNulo("WhatsApp novo com DDD; null para manter"),
      observacoes: textoOuNulo("Observação nova (substitui a anterior); null para manter"),
    },
  ),
  ferramenta(
    "chamar_equipe",
    "Chama a equipe do Vaguinha (suporte humano) para esta conversa: problema no sistema, pagamento, plano, cancelamento, ou quando pedirem uma pessoa.",
    { motivo: texto("Motivo em poucas palavras") },
  ),
  ferramenta("propor_status", "Propõe marcar um atendimento como concluído ou como falta. A profissional confirma na tela.", {
    agendamento_id: texto("id do atendimento (de ver_agenda)"),
    status: { type: "string", enum: ["concluido", "faltou"] },
  }),
];

// ---------------------------------------------------------------------------

const quando = (iso: string) => formatarData(iso, "EEE dd/MM 'às' HH:mm");
const dataLonga = (dia: string, hora: string) => `${formatarData(instanteEmSP(dia, hora), "EEEE, dd/MM")} às ${hora}`;
const novoId = () => Math.random().toString(36).slice(2, 10);

function erro(mensagem: string) {
  return JSON.stringify({ erro: mensagem });
}

async function obterAtendimento(ctx: Contexto, id: string) {
  const { data } = await ctx.supabase
    .from("agendamentos")
    .select("id, tipo, cliente_nome, servico_nome, inicio, fim, status")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Existe algo (não cancelado) ocupando o intervalo? */
async function conflito(ctx: Contexto, inicio: Date, fim: Date, ignorarId?: string) {
  let q = ctx.supabase.from("agendamentos").select("id, cliente_nome, titulo, inicio").neq("status", "cancelado").lt("inicio", fim.toISOString()).gt("fim", inicio.toISOString());
  if (ignorarId) q = q.neq("id", ignorarId);
  const { data } = await q.limit(1);
  return data?.[0] ?? null;
}

/** Valida o WhatsApp dito pela profissional. Devolve o número normalizado ou uma mensagem de erro. */
function lerTelefone(bruto: unknown): { numero: string | null } | { erro: string } {
  if (bruto == null || String(bruto).trim() === "") return { numero: null };
  const numero = normalizarTelefone(String(bruto));
  if (!numero || !/^55\d{10,11}$/.test(numero)) return { erro: `O WhatsApp "${String(bruto)}" parece incompleto. Peça o número com DDD (ex.: 14 99999-8888).` };
  return { numero };
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Procura cadastros que podem ser a mesma pessoa: mesmo WhatsApp (bloqueia) ou nome parecido (só avisa).
 * `ignorarId`: o próprio cadastro em edição.
 */
async function procurarDuplicidade(ctx: Contexto, nome: string | null, telefone: string | null, ignorarId?: string) {
  let mesmoTelefone: { id: string; nome: string } | null = null;
  if (telefone) {
    let q = ctx.supabase.from("clientes").select("id, nome").in("telefone", variacoesCelular(telefone));
    if (ignorarId) q = q.neq("id", ignorarId);
    const { data } = await q.limit(1);
    mesmoTelefone = data?.[0] ?? null;
  }
  let parecidos: { id: string; nome: string; whatsapp: string | null }[] = [];
  const completo = nome ? semAcento(nome) : "";
  const primeiro = completo.split(/\s+/)[0] ?? "";
  if (primeiro.length >= 2) {
    // busca larga pelo primeiro nome e compara sem acento aqui (o banco não ignora acento)
    const { data } = await ctx.supabase.from("clientes").select("id, nome, telefone").ilike("nome", `%${primeiro.replace(/[%_,]/g, " ")}%`).limit(20);
    parecidos = (data ?? [])
      .filter((c) => c.id !== ignorarId && c.id !== mesmoTelefone?.id)
      .filter((c) => semAcento(c.nome).split(/\s+/).includes(primeiro) || semAcento(c.nome) === completo)
      .slice(0, 5)
      .map((c) => ({ id: c.id, nome: c.nome, whatsapp: c.telefone ? formatarTelefone(c.telefone) : null }));
  }
  return { mesmoTelefone, parecidos };
}

/** Executa uma ferramenta e devolve o texto do tool_result (JSON). Nunca lança: erros viram { erro }. */
export async function executarFerramenta(ctx: Contexto, nome: string, entrada: Record<string, unknown>): Promise<string> {
  try {
    switch (nome) {
      case "ver_agenda": {
        const ini = String(entrada.data_inicio);
        const fim = String(entrada.data_fim);
        if (!ehDataISO(ini) || !ehDataISO(fim) || fim < ini) return erro("Datas inválidas.");
        if (diasEntre(ini, fim).length > 31) return erro("Período maior que 31 dias. Peça um período menor.");
        const { data } = await ctx.supabase
          .from("agendamentos")
          .select("id, tipo, cliente_nome, servico_nome, titulo, inicio, fim, status, valor, origem")
          .lt("inicio", fimDoDia(fim).toISOString())
          .gt("fim", inicioDoDia(ini).toISOString())
          .neq("status", "cancelado")
          .order("inicio")
          .limit(120);
        return JSON.stringify(
          (data ?? []).map((a) => ({
            id: a.id,
            tipo: a.tipo,
            quem: a.tipo === "atendimento" ? a.cliente_nome : a.titulo,
            servico: a.servico_nome,
            inicio: quando(a.inicio),
            fim: formatarData(a.fim, "HH:mm"),
            situacao: a.status,
            valor: a.valor,
            pelo_link: a.origem === "online",
          })),
        );
      }

      case "buscar_cliente": {
        const termo = String(entrada.nome ?? "").trim().replace(/[%_,]/g, " ");
        if (termo.length < 2) return erro("Informe pelo menos 2 letras do nome.");
        const { data: clientes } = await ctx.supabase.from("clientes").select("id, nome, telefone").ilike("nome", `%${termo}%`).order("nome").limit(10);
        if (!clientes?.length) return JSON.stringify([]);
        const { data: proximos } = await ctx.supabase
          .from("agendamentos")
          .select("cliente_id, inicio, servico_nome")
          .in("cliente_id", clientes.map((c) => c.id))
          .gte("inicio", new Date().toISOString())
          .neq("status", "cancelado")
          .order("inicio");
        return JSON.stringify(
          clientes.map((c) => {
            const p = proximos?.find((x) => x.cliente_id === c.id);
            return { id: c.id, nome: c.nome, whatsapp: c.telefone ? formatarTelefone(c.telefone) : null, proximo_atendimento: p ? `${p.servico_nome} · ${quando(p.inicio)}` : null };
          }),
        );
      }

      case "listar_servicos": {
        const { data } = await ctx.supabase.from("servicos").select("id, nome, duracao_min, valor").eq("ativo", true).order("ordem");
        return JSON.stringify(data ?? []);
      }

      case "horarios_livres": {
        const dia = String(entrada.data);
        const duracao = Number(entrada.duracao_min);
        if (!ehDataISO(dia) || !(duracao >= 5 && duracao <= 600)) return erro("Data ou duração inválida.");
        if (janelaDoDia(dia, ctx.perfil.expediente) === null) return JSON.stringify({ atende_neste_dia: false, horarios: [] });
        const { data } = await ctx.supabase
          .from("agendamentos")
          .select("id, inicio, fim")
          .neq("status", "cancelado")
          .lt("inicio", fimDoDia(dia).toISOString())
          .gt("fim", inicioDoDia(dia).toISOString());
        const horarios = horariosDisponiveis({
          dia,
          expediente: ctx.perfil.expediente,
          intervaloMin: ctx.perfil.intervalo_grade_min,
          duracaoMin: duracao,
          ocupacoes: data ?? [],
          aPartirDeMin: dia === hojeISO() ? minutosDoDia(new Date()) : undefined,
        });
        return JSON.stringify({ atende_neste_dia: true, horarios });
      }

      case "resumo_do_mes": {
        const mes = ehMes(entrada.mes) ? entrada.mes : mesAtual();
        const r = await montarRelatorio(mes, ctx.supabase);
        const i = r.indicadores;
        const linha = (k: keyof typeof i) => ({ este_mes: i[k].valor, mes_anterior: i[k].anterior });
        return JSON.stringify({
          mes: r.rotuloMes,
          em_andamento: r.mesEmAndamento,
          faturamento_reais: linha("faturamento"),
          ainda_vai_entrar_reais: i.previsto.valor,
          atendimentos_feitos: linha("atendimentos"),
          valor_medio_reais: linha("ticket"),
          desmarcaram: { ...linha("cancelamentos"), quem: i.cancelamentos.detalhes?.slice(0, 10).map((d) => d.titulo) },
          remarcaram: { ...linha("remarcacoes"), quem: i.remarcacoes.detalhes?.slice(0, 10).map((d) => d.titulo) },
          faltaram: { ...linha("faltas"), quem: i.faltas.detalhes?.slice(0, 10).map((d) => d.titulo) },
          cadastros_novos: linha("novasClientes"),
          pedidos_pelo_link: linha("pedidosLink"),
          servicos_que_mais_faturaram: r.servicos.slice(0, 5),
        });
      }

      // ------------------------------------------------------ propostas
      case "propor_remarcar": {
        const a = await obterAtendimento(ctx, String(entrada.agendamento_id));
        if (!a || a.tipo !== "atendimento") return erro("Atendimento não encontrado. Use ver_agenda para achar o id certo.");
        const dia = String(entrada.data);
        const hora = String(entrada.hora);
        if (!ehDataISO(dia) || !/^\d{2}:\d{2}$/.test(hora)) return erro("Data ou hora inválida.");
        const duracao = (new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 60_000;
        const inicio = instanteEmSP(dia, hora);
        if (inicio.getTime() < Date.now()) return erro("Esse horário já passou.");
        const choque = await conflito(ctx, inicio, new Date(inicio.getTime() + duracao * 60_000), a.id);
        if (choque) return erro(`Horário ocupado (${choque.cliente_nome ?? choque.titulo} às ${formatarData(choque.inicio, "HH:mm")}). Sugira outro com horarios_livres.`);
        const p: Proposta = {
          id: novoId(),
          tipo: "remarcar",
          agendamento_id: a.id,
          data: dia,
          hora,
          resumo: `Remarcar ${a.cliente_nome} (${a.servico_nome}) de ${quando(a.inicio)} para ${dataLonga(dia, hora)}`,
        };
        ctx.propostas.push(p);
        return JSON.stringify({ proposta_criada: p.resumo, aguardando_confirmacao: true });
      }

      case "propor_cancelar": {
        const a = await obterAtendimento(ctx, String(entrada.agendamento_id));
        if (!a || a.tipo !== "atendimento") return erro("Atendimento não encontrado. Use ver_agenda para achar o id certo.");
        if (a.status === "cancelado") return erro("Esse atendimento já está cancelado.");
        const p: Proposta = { id: novoId(), tipo: "cancelar", agendamento_id: a.id, resumo: `Cancelar ${a.cliente_nome} (${a.servico_nome}) de ${quando(a.inicio)}` };
        ctx.propostas.push(p);
        return JSON.stringify({ proposta_criada: p.resumo, aguardando_confirmacao: true });
      }

      case "propor_marcar": {
        const servicoId = String(entrada.servico_id);
        const { data: servico } = await ctx.supabase.from("servicos").select("id, nome, duracao_min").eq("id", servicoId).maybeSingle();
        if (!servico) return erro("Serviço não encontrado. Use listar_servicos.");
        const clienteId = entrada.cliente_id ? String(entrada.cliente_id) : null;
        let nome = entrada.nova_cliente_nome ? String(entrada.nova_cliente_nome).trim() : null;
        if (clienteId) {
          const { data: c } = await ctx.supabase.from("clientes").select("nome").eq("id", clienteId).maybeSingle();
          if (!c) return erro("Cliente não encontrado. Use buscar_cliente.");
          nome = c.nome;
        } else if (!nome) {
          return erro("Informe cliente_id ou o nome de um cadastro novo.");
        } else {
          // cadastro novo junto com o horário: não duplica quem já tem o mesmo WhatsApp
          const tel = lerTelefone(entrada.nova_cliente_telefone);
          if ("erro" in tel) return erro(tel.erro);
          const { mesmoTelefone } = await procurarDuplicidade(ctx, null, tel.numero);
          if (mesmoTelefone) return erro(`Esse WhatsApp já é de ${mesmoTelefone.nome} (cliente_id ${mesmoTelefone.id}). Use esse cadastro em vez de criar outro.`);
        }
        const dia = String(entrada.data);
        const hora = String(entrada.hora);
        if (!ehDataISO(dia) || !/^\d{2}:\d{2}$/.test(hora)) return erro("Data ou hora inválida.");
        const inicio = instanteEmSP(dia, hora);
        if (inicio.getTime() < Date.now() - 5 * 60_000) return erro("Esse horário já passou.");
        const choque = await conflito(ctx, inicio, new Date(inicio.getTime() + servico.duracao_min * 60_000));
        if (choque) return erro(`Horário ocupado (${choque.cliente_nome ?? choque.titulo} às ${formatarData(choque.inicio, "HH:mm")}). Sugira outro com horarios_livres.`);
        const p: Proposta = {
          id: novoId(),
          tipo: "marcar",
          cliente_id: clienteId,
          nova_cliente_nome: clienteId ? null : nome,
          nova_cliente_telefone: clienteId ? null : entrada.nova_cliente_telefone ? String(entrada.nova_cliente_telefone) : null,
          servico_id: servico.id,
          data: dia,
          hora,
          resumo: `Marcar ${nome}${clienteId ? "" : " (cadastro novo)"} · ${servico.nome} · ${dataLonga(dia, hora)}`,
        };
        ctx.propostas.push(p);
        return JSON.stringify({ proposta_criada: p.resumo, aguardando_confirmacao: true });
      }

      case "propor_bloqueio": {
        const dia = String(entrada.data);
        const diaInteiro = Boolean(entrada.dia_inteiro);
        const hi = entrada.hora_inicio ? String(entrada.hora_inicio) : null;
        const hf = entrada.hora_fim ? String(entrada.hora_fim) : null;
        if (!ehDataISO(dia)) return erro("Data inválida.");
        if (!diaInteiro && (!hi || !hf || horaParaMinutos(hf) <= horaParaMinutos(hi))) return erro("Informe início e fim (o fim depois do início).");
        const titulo = String(entrada.titulo || "Compromisso").slice(0, 60);
        const p: Proposta = {
          id: novoId(),
          tipo: "bloquear",
          titulo,
          data: dia,
          dia_inteiro: diaInteiro,
          hora_inicio: diaInteiro ? null : hi,
          hora_fim: diaInteiro ? null : hf,
          resumo: `Bloquear ${formatarData(instanteEmSP(dia, "12:00"), "EEEE, dd/MM")} ${diaInteiro ? "o dia todo" : `das ${hi} às ${hf}`} (${titulo})`,
        };
        ctx.propostas.push(p);
        return JSON.stringify({ proposta_criada: p.resumo, aguardando_confirmacao: true });
      }

      case "propor_cadastrar_cliente": {
        const nome = String(entrada.nome ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
        if (nome.length < 2) return erro("Falta o nome da cliente.");
        const tel = lerTelefone(entrada.telefone);
        if ("erro" in tel) return erro(tel.erro);
        const observacoes = entrada.observacoes ? String(entrada.observacoes).trim().slice(0, 500) : null;
        const { mesmoTelefone, parecidos } = await procurarDuplicidade(ctx, nome, tel.numero);
        if (mesmoTelefone) {
          return JSON.stringify({
            erro: `Já existe um cadastro com esse WhatsApp: ${mesmoTelefone.nome}. Não criei outro. Pergunte se é a mesma pessoa; se for, ofereça usar esse cadastro (ou mudar o nome dele com propor_editar_cliente).`,
            cadastro_existente: mesmoTelefone,
          });
        }
        const p: Proposta = {
          id: novoId(),
          tipo: "cadastrar_cliente",
          nome,
          telefone: tel.numero,
          observacoes,
          resumo: `Cadastrar ${nome}${tel.numero ? ` · WhatsApp ${formatarTelefone(tel.numero)}` : " (sem WhatsApp)"}`,
        };
        ctx.propostas.push(p);
        return JSON.stringify({
          proposta_criada: p.resumo,
          aguardando_confirmacao: true,
          ...(parecidos.length
            ? { aviso: "Já existe(m) cadastro(s) com nome parecido. Conte isso à profissional numa frase, para ela ver se não é a mesma pessoa antes de confirmar.", nomes_parecidos: parecidos }
            : {}),
        });
      }

      case "propor_editar_cliente": {
        const id = String(entrada.cliente_id ?? "");
        const { data: atual } = await ctx.supabase.from("clientes").select("id, nome, telefone, observacoes").eq("id", id).maybeSingle();
        if (!atual) return erro("Cliente não encontrada. Use buscar_cliente.");
        const nome = entrada.nome ? String(entrada.nome).trim().replace(/\s+/g, " ").slice(0, 80) : null;
        const tel = lerTelefone(entrada.telefone);
        if ("erro" in tel) return erro(tel.erro);
        const observacoes = entrada.observacoes ? String(entrada.observacoes).trim().slice(0, 500) : null;
        if (!nome && !tel.numero && !observacoes) return erro("Diga o que mudar: nome, WhatsApp ou observação.");
        if (tel.numero) {
          const { mesmoTelefone } = await procurarDuplicidade(ctx, null, tel.numero, atual.id);
          if (mesmoTelefone) return erro(`Esse WhatsApp já está no cadastro de ${mesmoTelefone.nome}. Não mudei nada.`);
        }
        const mudancas = [
          nome && nome !== atual.nome ? `nome para ${nome}` : null,
          tel.numero && tel.numero !== atual.telefone ? `WhatsApp para ${formatarTelefone(tel.numero)}` : null,
          observacoes ? "observação" : null,
        ].filter(Boolean);
        if (!mudancas.length) return erro("Os dados já estão assim no cadastro. Nada para mudar.");
        const p: Proposta = {
          id: novoId(),
          tipo: "editar_cliente",
          cliente_id: atual.id,
          nome,
          telefone: tel.numero,
          observacoes,
          resumo: `Mudar no cadastro de ${atual.nome}: ${mudancas.join(", ")}`,
        };
        ctx.propostas.push(p);
        return JSON.stringify({ proposta_criada: p.resumo, aguardando_confirmacao: true });
      }

      case "chamar_equipe": {
        if (!ctx.chamarEquipe) return erro("Por aqui não dá para chamar a equipe. Diga para usar 'Falar com o suporte' no Perfil ou mandar mensagem no WhatsApp da Vaguinha.");
        ctx.chamarEquipe(String(entrada.motivo || "pediu ajuda").slice(0, 200));
        return JSON.stringify({ ok: true, aviso: "Equipe avisada. Diga que vão responder por aqui mesmo assim que possível." });
      }

      case "propor_status": {
        const a = await obterAtendimento(ctx, String(entrada.agendamento_id));
        if (!a || a.tipo !== "atendimento") return erro("Atendimento não encontrado.");
        const status = entrada.status === "faltou" ? "faltou" : "concluido";
        const p: Proposta = {
          id: novoId(),
          tipo: "status",
          agendamento_id: a.id,
          status,
          resumo: `Marcar ${a.cliente_nome} (${quando(a.inicio)}) como ${status === "faltou" ? "falta" : "concluído"}`,
        };
        ctx.propostas.push(p);
        return JSON.stringify({ proposta_criada: p.resumo, aguardando_confirmacao: true });
      }

      default:
        return erro(`Ferramenta desconhecida: ${nome}`);
    }
  } catch (e) {
    return erro(e instanceof Error ? e.message : "Falha ao consultar.");
  }
}

/** Data de hoje e o expediente, para o modelo entender "amanhã", "sexta", "de tarde". */
export function contextoDoDia(perfil: Profile) {
  const dias = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const expediente = dias
    .map((nome, i) => {
      const cfg = perfil.expediente[String(i) as keyof typeof perfil.expediente];
      return cfg?.ativo ? `${nome} ${cfg.inicio}-${cfg.fim}` : `${nome} fechado`;
    })
    .join("; ");
  const agora = new Date();
  const hoje = hojeISO();
  // dia da semana → data, já pronto (o modelo erra conta de calendário)
  const calendario = Array.from({ length: 14 }, (_, i) => {
    const d = somarDias(hoje, i);
    const rotulo = i === 0 ? " (hoje)" : i === 1 ? " (amanhã)" : "";
    return `${dias[diaDaSemana(d)]} ${formatarDataISO(d, "dd/MM")} = ${d}${rotulo}`;
  }).join("; ");
  return [
    `Agora: ${formatarData(agora, "EEEE, dd/MM/yyyy 'às' HH:mm")} (horário de Brasília). Hoje = ${hoje}.`,
    `Profissional: ${perfil.nome}${perfil.nome_negocio ? ` (${perfil.nome_negocio})` : ""}.`,
    `Expediente: ${expediente}. Intervalo da agenda: ${perfil.intervalo_grade_min} min.`,
    `CALENDÁRIO dos próximos 14 dias: ${calendario}.`,
  ].join("\n");
}
