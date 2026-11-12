/**
 * Leitura de agendas exportadas do Google Agenda (arquivo .ics, ou o .zip que o Google gera).
 * Roda no navegador: o arquivo não sai do aparelho; só os compromissos escolhidos vão para o servidor.
 *
 * Sem imports com "@/" de propósito: o módulo é testável direto no Node (node --experimental-strip-types).
 */
import ICAL from "ical.js";
import { fromZonedTime } from "date-fns-tz";

const FUSO_PADRAO = "America/Sao_Paulo";
/** Teto de ocorrências por agenda (evita travar com repetições "para sempre"). */
const MAX_EVENTOS = 3000;

export type EventoLido = {
  /** Única por ocorrência: UID do Google + início. */
  chave: string;
  titulo: string;
  inicio: string; // ISO
  fim: string; // ISO
  diaInteiro: boolean;
};

export type AgendaLida = {
  nome: string;
  arquivo: string;
  /** Agenda de aniversários ou de feriados do Google: vem desmarcada. */
  automatica: boolean;
  eventos: EventoLido[];
  /** Passou do teto de ocorrências (algumas ficaram de fora). */
  cortada: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Instante real de um horário do arquivo, respeitando o fuso de cada evento. */
function instante(t: ICAL.Time): Date {
  const parede = `${t.year}-${pad(t.month)}-${pad(t.day)}T${pad(t.isDate ? 0 : t.hour)}:${pad(t.isDate ? 0 : t.minute)}:${pad(t.isDate ? 0 : t.second)}`;
  if (t.isDate) return fromZonedTime(parede, FUSO_PADRAO); // dia inteiro: meia-noite de Brasília
  // `timezone` guarda o TZID do arquivo quando o fuso não foi descrito nele (não está nos tipos do ical.js)
  const tzid = t.zone?.tzid ?? (t as unknown as { timezone?: string }).timezone;
  if (tzid === "UTC" || tzid === "Z" || t.zone === ICAL.Timezone.utcTimezone) return new Date(`${parede}Z`);
  if (tzid && tzid !== "floating") {
    // Nome IANA (o Google usa "America/Sao_Paulo"): date-fns-tz resolve sozinho
    try {
      const d = fromZonedTime(parede, tzid);
      if (!Number.isNaN(d.getTime())) return d;
    } catch {
      // nome que não é IANA (ex.: Outlook); cai no fuso descrito no próprio arquivo
    }
    if (t.zone && t.zone !== ICAL.Timezone.localTimezone && t.zone.component) return new Date(t.toUnixTime() * 1000);
  }
  return fromZonedTime(parede, FUSO_PADRAO); // sem fuso: horário de Brasília
}

function textoDe(c: ICAL.Component, prop: string) {
  const v = c.getFirstPropertyValue(prop);
  return typeof v === "string" ? v.trim() : "";
}

function cancelado(c: ICAL.Component) {
  return textoDe(c, "status").toUpperCase() === "CANCELLED";
}

/**
 * Lê um .ics e devolve as ocorrências entre `de` e `ate` (repetições expandidas, exceções e exclusões aplicadas).
 */
export function lerIcs(texto: string, arquivo: string, de: Date, ate: Date): AgendaLida {
  const raiz = new ICAL.Component(ICAL.parse(texto));
  for (const tz of raiz.getAllSubcomponents("vtimezone")) {
    try {
      ICAL.TimezoneService.register(tz);
    } catch {
      // fuso mal formado: os eventos dele caem no fallback
    }
  }

  const nome = textoDe(raiz, "x-wr-calname") || arquivo.replace(/\.ics$/i, "");
  const automatica = /^(birthdays|anivers|holidays|feriados)/i.test(arquivo) || /anivers|birthday|feriado|holiday/i.test(nome);

  const vevents = raiz.getAllSubcomponents("vevent");
  const excecoes = new Map<string, ICAL.Component[]>();
  const principais: ICAL.Component[] = [];
  for (const v of vevents) {
    if (v.hasProperty("recurrence-id")) {
      const uid = textoDe(v, "uid");
      excecoes.set(uid, [...(excecoes.get(uid) ?? []), v]);
    } else principais.push(v);
  }
  const uidsPrincipais = new Set(principais.map((p) => textoDe(p, "uid")));
  // exceção sem o evento principal no arquivo: vale como evento avulso
  for (const [uid, lista] of excecoes) if (!uidsPrincipais.has(uid)) principais.push(...lista);

  const eventos: EventoLido[] = [];
  let cortada = false;
  const deMs = de.getTime();
  const ateMs = ate.getTime();

  const adicionar = (uid: string, comp: ICAL.Component, ini: ICAL.Time, fimT: ICAL.Time | null) => {
    if (cancelado(comp)) return;
    const inicio = instante(ini);
    let fim = fimT ? instante(fimT) : null;
    if (!fim || fim.getTime() <= inicio.getTime()) fim = new Date(inicio.getTime() + (ini.isDate ? 86_400_000 : 3_600_000));
    if (fim.getTime() <= deMs || inicio.getTime() >= ateMs) return;
    if (eventos.length >= MAX_EVENTOS) {
      cortada = true;
      return;
    }
    eventos.push({
      chave: `${uid}|${inicio.toISOString()}`,
      titulo: textoDe(comp, "summary") || "(sem título)",
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      diaInteiro: ini.isDate,
    });
  };

  for (const comp of principais) {
    if (cancelado(comp)) continue;
    const uid = textoDe(comp, "uid") || crypto.randomUUID();
    let ev: ICAL.Event;
    try {
      ev = new ICAL.Event(comp);
    } catch {
      continue;
    }
    if (!ev.startDate) continue;

    if (!comp.hasProperty("recurrence-id") && ev.isRecurring()) {
      for (const exc of excecoes.get(uid) ?? []) {
        try {
          ev.relateException(exc);
        } catch {
          // exceção que não casa com a repetição: ignorada
        }
      }
      const it = ev.iterator();
      let voltas = 0;
      for (let prox = it.next(); prox && voltas < 20_000; prox = it.next(), voltas++) {
        const det = ev.getOccurrenceDetails(prox);
        if (instante(det.startDate).getTime() >= ateMs) break;
        adicionar(uid, det.item.component, det.startDate, det.endDate);
        if (cortada) break;
      }
    } else {
      adicionar(uid, comp, ev.startDate, ev.endDate);
    }
    if (cortada) break;
  }

  eventos.sort((a, b) => a.inicio.localeCompare(b.inicio));
  return { nome, arquivo, automatica, eventos, cortada };
}

// ---------------------------------------------------------------- sugestões

export type TipoImportacao = "atendimento" | "bloqueio" | "ignorar";

/** Horário fechado ou coisa da própria profissional: vira compromisso (tipo "bloqueio"), não cliente. */
const PARECE_COMPROMISSO = new RegExp(
  [
    "almo[cç]o|folga|f[eé]rias|n[aã]o atend|fechad|bloque|recesso|viagem|pessoal|feriado",
    // rotina e saúde dela
    "academia|nata[cç][aã]o|pilates|muscula[cç]|crossfit|yoga|ioga|treino|hidrogin|funcional",
    "m[eé]dic|dentista|consulta|exame|terapia|psic[oó]log|fisioterap|nutricionista|vacina",
    "escola|faculdade|reuni[aã]o|igreja|culto|cart[oó]rio|despachante|compromisso|festa|casamento|anivers",
  ].join("|"),
  "i",
);
/** Título que é só um serviço ("Cílios", "Cabelo meu"): quase sempre é a profissional se cuidando, não uma cliente. */
const SO_SERVICO =
  /^(meu |minha |meus |minhas )?(c[ií]lios|sobrancelhas?|cabelo|unhas?|p[eé]s?|m[aã]os?|depila[cç][aã]o|massagem|limpeza de pele|manicure|pedicure|escova|progressiva|luzes)( meu| minha| meus| minhas)?$/i;
/** "Dr. Lidiane", "Dra Ana": consulta dela. */
const DOUTOR = /^dra?\.?\s/i;

/** O que fazer com cada compromisso, por padrão. A pessoa pode trocar na prévia. */
export function sugerirTipo(e: Pick<EventoLido, "titulo" | "diaInteiro">, automatica: boolean): TipoImportacao {
  if (automatica) return "ignorar";
  if (e.diaInteiro) return /n[aã]o atend|folga|f[eé]rias|fechad|recesso|viagem/i.test(e.titulo) ? "bloqueio" : "ignorar";
  const { nome } = separarTitulo(e.titulo);
  if (!/\p{L}/u.test(nome.replace(/\d+\s*h/gi, ""))) return "ignorar"; // título só com hora ("17h30"): não dá para saber o que é
  return PARECE_COMPROMISSO.test(e.titulo) || SO_SERVICO.test(nome.trim()) || DOUTOR.test(nome) ? "bloqueio" : "atendimento";
}

/**
 * Nome e observação a partir do título, tirando a hora que muita gente escreve na frente:
 * "8h Thay" → "Thay"; "16h30 Babi" → "Babi"; "10 HR tia Cida" → "tia Cida"; "14 Valmiza" → "Valmiza";
 * "15h Ana Clara, mão e pé" → nome "Ana Clara", observação "mão e pé".
 */
// o "h" depois dos minutos ("7h30h") só conta se vier sozinho: "14h00 Helena" não pode virar "elena"
const HORA = String.raw`\d{1,2}\s*(?:(?:horas?|hrs?)(?=\s|$)|[:h.]\s*\d{2}(?:h(?=\s|$))?|h(?=\s|$|\d|[-–—:|,.]))?\s*(?:min(?=\s|$))?`;

export function separarTitulo(titulo: string): { nome: string; observacao: string | null } {
  const semHora = titulo
    // na frente: "8h", "16h30", "7h30h", "10 HR", "15h às 16h"
    .replace(new RegExp(`^\\s*(?:[àa]s\\s*)?${HORA}(?:\\s*(?:[àa]s|a|até|-|–)\\s*${HORA})?\\s*[-–—:|,.]?\\s*`, "i"), "")
    // no fim: "Tamires 8h", "unha Elenice 13h"
    .replace(/\s*(?:[àa]s\s*)?\d{1,2}\s*h(?:\s*\d{2})?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const base = semHora.length > 0 ? semHora : titulo.trim();
  const [nome, ...resto] = base.split(/\s*,\s*|\s+[-–—/|]\s+/);
  const observacao = resto.join(", ").trim();
  return { nome: (nome || base).slice(0, 80), observacao: observacao ? observacao.slice(0, 500) : null };
}

export function nomeDoTitulo(titulo: string): string {
  return separarTitulo(titulo).nome;
}

// ---------------------------------------------------------------- arquivos

const NAO_E_AGENDA = "Esse arquivo não é a agenda do Google. Escolha o arquivo .zip (ou .ics) que o Google Agenda baixou.";

/**
 * Abre .ics ou .zip (exportação do Google: um .ics por agenda) e devolve os textos.
 * Reconhece pelo conteúdo, não pelo nome: o celular às vezes troca a extensão ou o tipo do arquivo baixado.
 */
export async function textosDoArquivo(arquivo: File): Promise<{ nome: string; texto: string }[]> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const ehZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK": começo de todo .zip
  const { unzipSync, strFromU8 } = await import("fflate");
  if (!ehZip) {
    const texto = strFromU8(bytes).replace(/^﻿/, "");
    if (!texto.includes("BEGIN:VCALENDAR")) throw new Error(NAO_E_AGENDA);
    return [{ nome: arquivo.name, texto }];
  }
  let conteudo: Record<string, Uint8Array>;
  try {
    conteudo = unzipSync(bytes, { filter: (f) => /\.ics$/i.test(f.name) && f.originalSize < 30_000_000 });
  } catch {
    throw new Error("Não consegui abrir esse .zip (pode ter baixado pela metade). Exporte de novo no Google Agenda e tente outra vez.");
  }
  return Object.entries(conteudo).map(([nome, dados]) => ({ nome: nome.split("/").pop() ?? nome, texto: strFromU8(dados).replace(/^﻿/, "") }));
}
