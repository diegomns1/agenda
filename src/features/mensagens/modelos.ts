import { dataDe, formatarDataISO, hojeISO, horaDe, somarDias } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import { primeiroNome } from "@/lib/texto";
import type { Agendamento, Profile } from "@/types/database";

/** "hoje", "amanhã (sexta)", "sexta-feira (14/11)" — texto natural para a mensagem. */
export function descreverDia(dia: string): string {
  const hoje = hojeISO();
  if (dia === hoje) return "hoje";
  const semana = formatarDataISO(dia, "EEEE").replace("-feira", "");
  if (dia === somarDias(hoje, 1)) return `amanhã (${semana})`;
  return `${formatarDataISO(dia, "EEEE")} (${formatarDataISO(dia, "dd/MM")})`;
}

/*
 * Modelos de mensagem do WhatsApp (sugestão da Layara, 09/11/2026).
 * Cada situação tem um texto editável na tela Mensagens, com campos que se preenchem sozinhos.
 * Arquivo sem "server-only": a tela de edição usa as mesmas funções para a prévia.
 */

export const TIPOS_MENSAGEM = ["lembrete", "confirmacao", "remarcacao", "cancelamento", "agradecimento"] as const;
export type TipoMensagem = (typeof TIPOS_MENSAGEM)[number];
export type ModelosMensagem = Partial<Record<TipoMensagem, string>>;

export const MAX_MENSAGEM = 1000;

export const SITUACOES: Record<TipoMensagem, { rotulo: string; emoji: string; quando: string }> = {
  lembrete: { rotulo: "Lembrete", emoji: "📅", quando: "Antes do horário (aparece em Lembretes e no atendimento)." },
  confirmacao: { rotulo: "Confirmação", emoji: "✅", quando: "Logo depois de marcar, para a pessoa guardar os detalhes." },
  remarcacao: { rotulo: "Remarcação", emoji: "🔄", quando: "Quando o horário muda (já vai com o horário novo)." },
  cancelamento: { rotulo: "Cancelamento", emoji: "❌", quando: "Quando o horário é cancelado." },
  agradecimento: { rotulo: "Agradecimento", emoji: "💖", quando: "Depois do atendimento, para agradecer e chamar de volta." },
};

/** Campos que a profissional pode usar. `exemplo` aparece na prévia quando não há atendimento de verdade. */
export const VARIAVEIS = [
  { chave: "nome", rotulo: "Nome", exemplo: "Ana" },
  { chave: "nome_completo", rotulo: "Nome completo", exemplo: "Ana Souza" },
  { chave: "dia", rotulo: "Dia", exemplo: "amanhã (sexta)" },
  { chave: "data", rotulo: "Data", exemplo: "14/11" },
  { chave: "hora", rotulo: "Hora", exemplo: "15:30" },
  { chave: "servico", rotulo: "Serviço", exemplo: "Alongamento em gel" },
  { chave: "valor", rotulo: "Valor", exemplo: "R$ 85,00" },
  { chave: "duracao", rotulo: "Duração", exemplo: "1h30" },
  { chave: "endereco", rotulo: "Endereço", exemplo: "Rua das Flores, 120 - Centro" },
  { chave: "negocio", rotulo: "Seu negócio", exemplo: "Studio Ana Nails" },
  { chave: "link", rotulo: "Link para marcar", exemplo: "painel.vaguinha.app/p/seu-nome" },
] as const;
export type ChaveVariavel = (typeof VARIAVEIS)[number]["chave"];

export const EMOJIS = ["😊", "🥰", "✨", "💖", "💅", "💅🏽", "💇‍♀️", "💈", "✂️", "📅", "⏰", "📍", "💲", "✅", "🔄", "❌", "🙏", "🌸", "💬", "⚠️"];

/** Textos padrão. O de agradecimento concorda com o tratamento da profissional (obrigada/obrigado). */
export function modeloPadrao(tipo: TipoMensagem, tratamento: Profile["tratamento"] = null): string {
  const obrigado = tratamento === "ele" ? "Obrigado" : tratamento === "ela" ? "Obrigada" : "Agradeço";
  switch (tipo) {
    case "lembrete":
      return "Oi, {nome}! Tudo bem? ✨\n\nPassando para lembrar do seu horário:\n📅 {dia}\n⏰ {hora}\n✨ {servico}\n📍 {endereco}\n\nPosso confirmar? 😊";
    case "confirmacao":
      return "Oi, {nome}! Seu horário está marcado ✅\n\n📅 {dia}\n⏰ {hora}\n✨ {servico}\n💲 {valor}\n📍 {endereco}\n\nQualquer imprevisto, é só me avisar por aqui. Até lá! 😊";
    case "remarcacao":
      return "Oi, {nome}! Seu horário foi remarcado 🔄\n\nNovo horário:\n📅 {dia}\n⏰ {hora}\n✨ {servico}\n\nSe não puder nesse horário, me avisa que a gente encontra outro. 😊";
    case "cancelamento":
      return "Oi, {nome}. Seu horário de {servico} marcado para {dia} às {hora} foi cancelado.\n\nQuando quiser marcar de novo, é só escolher um horário aqui: {link}";
    case "agradecimento":
      return `${obrigado === "Agradeço" ? "Agradeço a visita" : `${obrigado} pela visita`}, {nome}! 💖\n\nFoi um prazer te atender. Quando quiser voltar, é só marcar por aqui: {link}`;
  }
}

/** Texto em uso para a situação: o que a profissional salvou, ou o padrão. O lembrete antigo continua valendo. */
export function modeloDe(perfil: Pick<Profile, "modelos_mensagem" | "modelo_lembrete" | "tratamento">, tipo: TipoMensagem): string {
  const salvo = perfil.modelos_mensagem?.[tipo]?.trim();
  if (salvo) return salvo;
  if (tipo === "lembrete" && perfil.modelo_lembrete?.trim()) return perfil.modelo_lembrete;
  return modeloPadrao(tipo, perfil.tratamento);
}

export function todosOsModelos(perfil: Pick<Profile, "modelos_mensagem" | "modelo_lembrete" | "tratamento">): Record<TipoMensagem, string> {
  return Object.fromEntries(TIPOS_MENSAGEM.map((t) => [t, modeloDe(perfil, t)])) as Record<TipoMensagem, string>;
}

/** Dados da profissional que entram nas mensagens (montado no servidor e passado para as telas). */
export type ContextoMensagem = { endereco: string | null; negocio: string; link: string | null };

export function contextoDoPerfil(perfil: Pick<Profile, "endereco" | "nome" | "nome_negocio" | "slug" | "agendamento_online">, urlApp: string): ContextoMensagem {
  return {
    endereco: perfil.endereco?.trim() || null,
    negocio: perfil.nome_negocio?.trim() || perfil.nome,
    link: perfil.slug && perfil.agendamento_online ? `${urlApp.replace(/^https?:\/\//, "")}/p/${perfil.slug}` : null,
  };
}

/** Tudo o que as telas precisam para montar qualquer mensagem (calculado no servidor a partir do perfil). */
export type Mensagens = { modelos: Record<TipoMensagem, string>; contexto: ContextoMensagem };

export function mensagensDoPerfil(
  perfil: Pick<Profile, "modelos_mensagem" | "modelo_lembrete" | "tratamento" | "endereco" | "nome" | "nome_negocio" | "slug" | "agendamento_online">,
  urlApp: string,
): Mensagens {
  return { modelos: todosOsModelos(perfil), contexto: contextoDoPerfil(perfil, urlApp) };
}

/** "1h30", "45 min", "2h" */
export function descreverDuracao(minutos: number) {
  if (!Number.isFinite(minutos) || minutos <= 0) return "";
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (!h) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export type DadosAtendimento = Pick<Agendamento, "inicio" | "fim" | "cliente_nome" | "servico_nome" | "valor">;

export function valoresDoAtendimento(a: DadosAtendimento, ctx: ContextoMensagem): Record<ChaveVariavel, string> {
  const nomeCompleto = (a.cliente_nome ?? "").trim();
  return {
    nome: primeiroNome(nomeCompleto),
    nome_completo: nomeCompleto,
    dia: descreverDia(dataDe(a.inicio)),
    data: formatarDataISO(dataDe(a.inicio), "dd/MM"),
    hora: horaDe(a.inicio),
    servico: a.servico_nome ?? "",
    valor: a.valor != null && Number(a.valor) > 0 ? formatarMoeda(a.valor) : "",
    duracao: descreverDuracao((new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 60_000),
    endereco: ctx.endereco ?? "",
    negocio: ctx.negocio,
    link: ctx.link ?? "",
  };
}

export function valoresDeExemplo(ctx?: Partial<ContextoMensagem>): Record<ChaveVariavel, string> {
  const v = Object.fromEntries(VARIAVEIS.map((x) => [x.chave, x.exemplo])) as Record<ChaveVariavel, string>;
  if (ctx?.endereco) v.endereco = ctx.endereco;
  if (ctx?.negocio) v.negocio = ctx.negocio;
  if (ctx?.link) v.link = ctx.link;
  return v;
}

/**
 * Troca os {campos} pelos valores. Uma linha cujo campo ficou vazio (ex.: "📍 {endereco}" sem endereço
 * cadastrado) some inteira, para a mensagem não ir com "📍" solto.
 */
export function preencher(modelo: string, valores: Record<string, string>): string {
  // aceita também com acento e maiúscula: {serviço}, {Endereço}
  const chave = (c: string) => c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const CAMPO = /\{([\p{L}_]+)\}/gu;
  const linhas = modelo.replace(/\r\n/g, "\n").split("\n");
  const saida: string[] = [];
  for (const linha of linhas) {
    const conhecidos = [...linha.matchAll(CAMPO)].map((m) => chave(m[1])).filter((c) => c in valores);
    if (conhecidos.length && conhecidos.every((c) => !valores[c])) continue;
    saida.push(linha.replace(CAMPO, (inteiro, c: string) => (chave(c) in valores ? valores[chave(c)] : inteiro)));
  }
  // não deixa duas linhas em branco seguidas nem sobra em branco no fim
  return saida
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function montarMensagemDoAtendimento(modelo: string, a: DadosAtendimento, ctx: ContextoMensagem) {
  return preencher(modelo, valoresDoAtendimento(a, ctx));
}
