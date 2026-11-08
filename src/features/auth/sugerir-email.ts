/** Domínios mais usados no Brasil, para sugerir a correção de erros comuns de digitação. */
const DOMINIOS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br", "yahoo.com", "icloud.com", "live.com", "uol.com.br", "bol.com.br", "terra.com.br"];

/** Erros vistos com frequência que a distância de edição sozinha não pega bem. */
const TROCAS: Record<string, string> = {
  "gmail.com.br": "gmail.com",
  "gmail.co": "gmail.com",
  "gmai.com": "gmail.com",
  "hotmail.com.br": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "outlook.com.br": "outlook.com",
};

function distancia(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** "ana@gmial.com" → "ana@gmail.com". Devolve null quando o e-mail parece certo ou não dá para adivinhar. */
export function sugerirEmail(email: string): string | null {
  const limpo = email.trim().toLowerCase();
  const arroba = limpo.lastIndexOf("@");
  if (arroba < 1) return null;
  const usuario = limpo.slice(0, arroba);
  const dominio = limpo.slice(arroba + 1);
  if (!dominio || DOMINIOS.includes(dominio)) return null;
  if (TROCAS[dominio]) return `${usuario}@${TROCAS[dominio]}`;
  let melhor: string | null = null;
  let menor = 3;
  for (const d of DOMINIOS) {
    const dist = distancia(dominio, d);
    if (dist > 0 && dist < menor) {
      menor = dist;
      melhor = d;
    }
  }
  return melhor ? `${usuario}@${melhor}` : null;
}
