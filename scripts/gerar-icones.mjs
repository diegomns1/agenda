// Gera os ícones do PWA em public/icons a partir de um SVG desenhado em código.
// Uso: node scripts/gerar-icones.mjs
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const COR = "#C2185B";
const FUNDO = "#FCE4EC";

/** Calendário com coração, no estilo do ícone do app. `margem` maior = versão maskable. */
function svg(tamanho, { maskable = false, monocromatico = false } = {}) {
  const m = maskable ? 0.18 : 0.1; // margem segura
  const raio = maskable ? 0 : tamanho * 0.22;
  const fundo = monocromatico ? "transparent" : COR;
  const traco = monocromatico ? "#ffffff" : "#ffffff";
  const s = tamanho * (1 - 2 * m);
  const x = tamanho * m;
  const y = tamanho * m;
  // calendário ocupa a área s×s
  const cw = s * 0.78;
  const ch = s * 0.72;
  const cx = x + (s - cw) / 2;
  const cy = y + (s - ch) / 2 + s * 0.04;
  const espessura = Math.max(2, s * 0.075);
  const r = s * 0.12;
  const coracao = `
    M ${cx + cw / 2} ${cy + ch * 0.86}
    C ${cx + cw * 0.22} ${cy + ch * 0.66}, ${cx + cw * 0.3} ${cy + ch * 0.42}, ${cx + cw * 0.5} ${cy + ch * 0.52}
    C ${cx + cw * 0.7} ${cy + ch * 0.42}, ${cx + cw * 0.78} ${cy + ch * 0.66}, ${cx + cw / 2} ${cy + ch * 0.86} Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 ${tamanho} ${tamanho}">
  <rect width="${tamanho}" height="${tamanho}" rx="${raio}" fill="${fundo}"/>
  <rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${r}" fill="none" stroke="${traco}" stroke-width="${espessura}"/>
  <line x1="${cx}" y1="${cy + ch * 0.3}" x2="${cx + cw}" y2="${cy + ch * 0.3}" stroke="${traco}" stroke-width="${espessura}"/>
  <line x1="${cx + cw * 0.28}" y1="${cy - s * 0.09}" x2="${cx + cw * 0.28}" y2="${cy + s * 0.06}" stroke="${traco}" stroke-width="${espessura}" stroke-linecap="round"/>
  <line x1="${cx + cw * 0.72}" y1="${cy - s * 0.09}" x2="${cx + cw * 0.72}" y2="${cy + s * 0.06}" stroke="${traco}" stroke-width="${espessura}" stroke-linecap="round"/>
  <path d="${coracao}" fill="${traco}"/>
</svg>`;
}

await mkdir("public/icons", { recursive: true });

const tarefas = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-maskable-192.png", 192, { maskable: true }],
  ["icon-maskable-512.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, {}],
  ["badge-72.png", 72, { monocromatico: true, maskable: true }],
];

for (const [nome, tamanho, opcoes] of tarefas) {
  await sharp(Buffer.from(svg(tamanho, opcoes))).png().toFile(`public/icons/${nome}`);
  console.log("ok", nome);
}

await writeFile("public/icons/icon.svg", svg(512));
// favicon simples (32px) para a aba do navegador
await sharp(Buffer.from(svg(64))).resize(32, 32).png().toFile("public/icons/favicon-32.png");
console.log("ok favicon-32.png, icon.svg");
void FUNDO;
