import { diaDaSemana, somarDias, type DataISO } from "@/lib/datas";

/*
 * Comandos prontos do assistente: entende as frases mais comuns SEM chamar a IA (custo zero, resposta na hora).
 * Só reconhece pedidos de CONSULTA. Qualquer pedido de mudança (marcar, remarcar, cancelar, bloquear) ou frase
 * que não se encaixe volta null e segue para a IA.
 * Arquivo sem "server-only": a parte de entender a frase é pura e testável com `npx tsx`.
 */

export type Comando =
  | { tipo: "agenda"; inicio: DataISO; fim: DataISO; rotulo: string }
  | { tipo: "livres"; dia: DataISO; rotulo: string }
  | { tipo: "proximo" }
  | { tipo: "faturamento"; mesesAtras: 0 | 1 }
  | { tipo: "confirmar" }
  | { tipo: "recusar" };

/** minúsculas, sem acento, sem pontuação, espaços simples */
export function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SEMANA: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

/** Pedidos que mudam algo: sempre vão para a IA (ela monta a proposta com Confirmar). */
const MUDANCA = /\b(marca|marcar|marque|agenda pra|agendar|agende|remarca|remarcar|muda|mudar|mude|troca|trocar|passa|passar|cancela|cancelar|desmarca|desmarcar|bloqueia|bloquear|bloqueie|libera|liberar|encaixa|encaixar|coloca|colocar|adiciona|cadastra)\b/;

/** Palavras que indicam um nome de cliente ou um detalhe que só a IA entende ("da Bruna", "depois do almoço"). */
const DETALHE = /\b(da|do|de) [a-z]{3,}\b/;

function proximoDiaDaSemana(hoje: DataISO, alvo: number) {
  const atual = diaDaSemana(hoje);
  return somarDias(hoje, (alvo - atual + 7) % 7);
}

/** Acha o dia citado na frase. Sem dia citado, devolve null (quem chama decide o padrão). */
export function acharDia(t: string, hoje: DataISO): { dia: DataISO; rotulo: string } | null {
  if (/\bdepois de amanha\b/.test(t)) return { dia: somarDias(hoje, 2), rotulo: "depois de amanhã" };
  if (/\bamanha\b/.test(t)) return { dia: somarDias(hoje, 1), rotulo: "amanhã" };
  if (/\bhoje\b/.test(t)) return { dia: hoje, rotulo: "hoje" };
  for (const [nome, n] of Object.entries(SEMANA)) {
    if (new RegExp(`\\b${nome}( feira)?\\b`).test(t)) {
      const dia = proximoDiaDaSemana(hoje, n);
      return { dia, rotulo: dia === hoje ? "hoje" : nome === "sabado" ? "sábado" : nome === "terca" ? "terça" : nome };
    }
  }
  // "dia 15", "15/11", "15/11/2026"
  const barra = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  const dia = barra ?? t.match(/\bdia (\d{1,2})\b/);
  if (dia) {
    const d = Number(dia[1]);
    const [anoH, mesH, diaH] = hoje.split("-").map(Number);
    let mes = barra ? Number(barra[2]) : mesH;
    let ano = barra?.[3] ? Number(barra[3].length === 2 ? `20${barra[3]}` : barra[3]) : anoH;
    if (!barra && d < diaH) mes += 1; // "dia 3" quando hoje é 20 = mês que vem
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
    if (d < 1 || d > 31 || mes < 1 || mes > 12) return null;
    const iso = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const valida = new Date(`${iso}T12:00:00Z`).getUTCDate() === d;
    return valida ? { dia: iso, rotulo: `${String(d).padStart(2, "0")}/${String(mes).padStart(2, "0")}` } : null;
  }
  return null;
}

/** Entende a frase. null = não é um comando pronto (vai para a IA). */
export function interpretar(texto: string, hoje: DataISO): Comando | null {
  const t = normalizar(texto);
  if (!t || t.length > 90) return null;

  // respostas curtas a uma proposta ("sim", "pode confirmar", "não")
  if (/^(sim|pode|confirma|confirmar|confirmo|pode confirmar|ok|isso|isso mesmo|fechado|beleza|pode sim|sim pode)$/.test(t)) return { tipo: "confirmar" };
  if (/^(nao|nao quero|cancela isso|deixa|deixa pra la|esquece|nao precisa)$/.test(t)) return { tipo: "recusar" };

  if (MUDANCA.test(t)) return null;

  // faturamento / resumo do mês
  if (/\b(faturei|faturamento|faturou|ganhei|entrou|recebi|lucro|quanto (eu )?(fiz|tirei)|resumo do mes)\b/.test(t)) {
    return { tipo: "faturamento", mesesAtras: /\bmes passado\b/.test(t) ? 1 : 0 };
  }

  // próximo atendimento
  if (/\b(proxim[oa]s? (cliente|atendimento|horario|sessao|aula|consulta|paciente|aluno|aluna)|quem (e|vem) (a )?(seguir|agora|depois)|quem e (o|a) proxim[oa])\b/.test(t)) {
    return { tipo: "proximo" };
  }

  // "agenda da Bruna", "livres depois do almoço", "de manhã": detalhe que só a IA entende
  const semDatas = t
    .replace(/\b(de|da|do|pra|para|na|no) (depois de amanha|hoje|amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo)( feira)?\b/g, " ")
    .replace(/\b(da|desta|dessa) semana\b|\b(do|deste|desse) mes\b|\bdia \d+\b/g, " ");
  if (DETALHE.test(semDatas)) return null;

  // horários livres
  if (/\b(livre|livres|vago|vagos|vaga|vagas|disponive(l|is)|tem horario|horarios?)\b/.test(t) && !/\b(quem|atendo|marcad)/.test(t)) {
    const d = acharDia(t, hoje) ?? { dia: hoje, rotulo: "hoje" };
    return { tipo: "livres", dia: d.dia, rotulo: d.rotulo };
  }

  // agenda de um dia / da semana
  if (/\b(agenda|quem (eu )?atendo|atendimentos?|marcados?|compromissos?|o que (eu )?tenho|clientes de|sessoes|aulas|consultas|tenho hoje|tenho amanha)\b/.test(t)) {
    if (/\bproxima semana\b|\bsemana que vem\b/.test(t)) {
      const dow = diaDaSemana(hoje);
      const segunda = somarDias(hoje, dow === 0 ? 1 : 8 - dow);
      return { tipo: "agenda", inicio: segunda, fim: somarDias(segunda, 6), rotulo: "na semana que vem" };
    }
    if (/\b(essa|esta|nessa|nesta|na|da) semana\b/.test(t)) {
      return { tipo: "agenda", inicio: hoje, fim: somarDias(hoje, 6), rotulo: "nos próximos 7 dias" };
    }
    const d = acharDia(t, hoje) ?? { dia: hoje, rotulo: "hoje" };
    return { tipo: "agenda", inicio: d.dia, fim: d.dia, rotulo: d.rotulo };
  }

  return null;
}

/** Atalhos que aparecem como botões na tela (todos resolvidos sem IA). */
export const ATALHOS = ["Agenda de hoje", "Agenda de amanhã", "Próximo cliente", "Horários livres amanhã", "Quanto entrou este mês"];

// ---------------------------------------------------------------------------
// Pistas para a IA: dia e horário lidos da frase SEM IA (contas de calendário não ficam com o modelo).
// Ex.: "marcar Duda sexta às 11h alongamento" → dia 2026-11-13, horário 11:00.
// O "11" de "às 11" é hora; só vira dia com "dia 11" ou "11/12".
// ---------------------------------------------------------------------------

const DIAS_EXTENSO = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function hhmm(h: number, m: number) {
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` : null;
}

/** Horários citados na frase, na ordem em que aparecem ("das 14 às 16h" → 14:00, 16:00). */
export function acharHorarios(texto: string): string[] {
  // minúsculas e sem acento, mas mantendo ":" (normalizar() tira)
  const t = ` ${texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9:/ ]+/g, " ").replace(/\s+/g, " ")} `;
  const achados: { pos: number; hora: string }[] = [];
  const add = (pos: number, h: number, m: number, periodo?: string) => {
    if (periodo && /tarde|noite/.test(periodo) && h < 12) h += 12;
    const v = hhmm(h, m);
    if (v && !achados.some((a) => Math.abs(a.pos - pos) < 3)) achados.push({ pos, hora: v });
  };
  const minutos = (m?: string, meia?: string) => (meia ? 30 : m ? Number(m) : 0);

  for (const r of t.matchAll(/\bmeio ?dia( e meia)?\b/g)) add(r.index!, 12, r[1] ? 30 : 0);
  // 11:30 / 11h / 11h30 / 11 horas / 11hs (com "e meia" e "da tarde" opcionais)
  for (const r of t.matchAll(/\b(\d{1,2})(?::(\d{2})|\s?(?:h|hs|hrs?|horas?)(?:\s?(\d{2})\b|\b))( e meia)?( da (?:manha|tarde|noite))?/g)) {
    add(r.index!, Number(r[1]), minutos(r[2] ?? r[3], r[4]), r[5]);
  }
  // "às 11", "as 11", "pras 3 da tarde", "a partir das 14" (número solto depois de às/as/das/pras/ate)
  for (const r of t.matchAll(/\b(?:as|a|das|pras?|para as|ate as|ate)\s(\d{1,2})(?![\d/:])( e meia)?( da (?:manha|tarde|noite))?/g)) {
    add(r.index! + r[0].indexOf(r[1]), Number(r[1]), minutos(undefined, r[2]), r[3]);
  }
  // "sexta 11", "amanhã 9 e meia": número logo depois do dia é horário (a voz costuma tirar o "às")
  for (const r of t.matchAll(/\b(?:hoje|amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo)(?: feira)? (\d{1,2})(?![\d/:])( e meia)?( da (?:manha|tarde|noite))?/g)) {
    add(r.index! + r[0].lastIndexOf(r[1]), Number(r[1]), minutos(undefined, r[2]), r[3]);
  }
  // "3 da tarde" sem "às"
  for (const r of t.matchAll(/\b(\d{1,2})( e meia)? (da (?:manha|tarde|noite))/g)) add(r.index!, Number(r[1]), minutos(undefined, r[2]), r[3]);

  return achados.sort((a, b) => a.pos - b.pos).map((a) => a.hora);
}

/** Todos os dias citados, na ordem ("de hoje para sexta" → hoje, sexta). */
export function acharDias(texto: string, hoje: DataISO): { dia: DataISO; rotulo: string }[] {
  const t = normalizar(texto);
  const dias: { dia: DataISO; rotulo: string }[] = [];
  const RE = /\b(?:depois de amanha|amanha|hoje|domingo|segunda|terca|quarta|quinta|sexta|sabado)\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\bdia \d{1,2}\b/g;
  for (const r of t.matchAll(RE)) {
    const d = acharDia(r[0], hoje);
    if (d && !dias.some((x) => x.dia === d.dia)) dias.push(d);
  }
  return dias;
}

/** Texto curto com o dia e o horário entendidos, para ir junto da mensagem para a IA. null se não achou nada. */
export function pistasDaFrase(texto: string, hoje: DataISO): string | null {
  const partes: string[] = [];
  const dias = acharDias(texto, hoje).map(({ dia }) => {
    const [ano, mes, d] = dia.split("-");
    return `${DIAS_EXTENSO[diaDaSemana(dia)]} ${d}/${mes}/${ano} (${dia})`;
  });
  if (dias.length) partes.push(`${dias.length > 1 ? "dias citados, na ordem" : "dia citado"} = ${dias.join(" e depois ")}`);
  const horas = acharHorarios(texto);
  if (horas.length) partes.push(`${horas.length > 1 ? "horários citados, na ordem" : "horário citado"} = ${horas.join(", ")}`);
  return partes.length ? partes.join("; ") : null;
}
