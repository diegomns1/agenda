/**
 * Feriados nacionais e datas comemorativas boas para quem atende (Dia das Mães, Namorados, Black Friday...).
 * Calculado na hora (inclusive Páscoa e Carnaval); não depende de API nem de banco.
 */

export type DataEspecial = {
  data: string; // AAAA-MM-DD
  nome: string;
  /** Feriado nacional (ou ponto facultativo muito comum, como o Carnaval). */
  feriado: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (ano: number, mes: number, dia: number) => `${ano}-${pad(mes)}-${pad(dia)}`;

function somar(dataIso: string, dias: number) {
  const d = new Date(`${dataIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Domingo de Páscoa (algoritmo de Meeus/Butcher). */
function pascoa(ano: number) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(ano, mes, dia);
}

/** n-ésimo dia da semana do mês (0 = domingo). Ex.: 2º domingo de maio. */
function enesimo(ano: number, mes: number, diaSemana: number, n: number) {
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const dia = 1 + ((diaSemana - primeiro + 7) % 7) + (n - 1) * 7;
  return iso(ano, mes, dia);
}

const cache = new Map<number, DataEspecial[]>();

export function datasEspeciais(ano: number): DataEspecial[] {
  const guardado = cache.get(ano);
  if (guardado) return guardado;
  const p = pascoa(ano);
  const lista: DataEspecial[] = [
    // feriados nacionais
    { data: iso(ano, 1, 1), nome: "Ano Novo", feriado: true },
    { data: somar(p, -48), nome: "Carnaval", feriado: true },
    { data: somar(p, -47), nome: "Carnaval", feriado: true },
    { data: somar(p, -46), nome: "Quarta de Cinzas", feriado: false },
    { data: somar(p, -2), nome: "Sexta-feira Santa", feriado: true },
    { data: p, nome: "Páscoa", feriado: false },
    { data: iso(ano, 4, 21), nome: "Tiradentes", feriado: true },
    { data: iso(ano, 5, 1), nome: "Dia do Trabalho", feriado: true },
    { data: somar(p, 60), nome: "Corpus Christi", feriado: true },
    { data: iso(ano, 9, 7), nome: "Independência", feriado: true },
    { data: iso(ano, 10, 12), nome: "N. Sra. Aparecida", feriado: true },
    { data: iso(ano, 11, 2), nome: "Finados", feriado: true },
    { data: iso(ano, 11, 15), nome: "Proclamação da República", feriado: true },
    { data: iso(ano, 11, 20), nome: "Consciência Negra", feriado: true },
    { data: iso(ano, 12, 25), nome: "Natal", feriado: true },
    // datas que movimentam a agenda
    { data: iso(ano, 3, 8), nome: "Dia da Mulher", feriado: false },
    { data: enesimo(ano, 5, 0, 2), nome: "Dia das Mães", feriado: false },
    { data: iso(ano, 6, 12), nome: "Dia dos Namorados", feriado: false },
    { data: enesimo(ano, 8, 0, 2), nome: "Dia dos Pais", feriado: false },
    { data: iso(ano, 9, 15), nome: "Dia do Cliente", feriado: false },
    { data: iso(ano, 10, 12), nome: "Dia das Crianças", feriado: false },
    { data: somar(enesimo(ano, 11, 4, 4), 1), nome: "Black Friday", feriado: false },
    { data: iso(ano, 12, 24), nome: "Véspera de Natal", feriado: false },
    { data: iso(ano, 12, 31), nome: "Véspera de Ano Novo", feriado: false },
  ];
  lista.sort((a, b) => a.data.localeCompare(b.data) || Number(b.feriado) - Number(a.feriado));
  cache.set(ano, lista);
  return lista;
}

/** Datas especiais de um dia (pode haver duas, ex.: 12/10). */
export function datasDoDia(dataIso: string): DataEspecial[] {
  return datasEspeciais(Number(dataIso.slice(0, 4))).filter((d) => d.data === dataIso);
}
