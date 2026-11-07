// Gera os ícones do PWA em public/icons a partir da marca oficial (public/marca).
// Uso: node scripts/gerar-icones.mjs
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";

const VINHO = "#702D50";

const iconeApp = await readFile("public/marca/icone-app.svg"); // quadrado vinho com o símbolo
const simbolo = await readFile("public/marca/simbolo.svg", "utf8"); // só o símbolo (creme + rosa)

/** Versão maskable: fundo vinho até a borda e símbolo menor (zona segura de 20%). */
function svgMaskable(tamanho) {
  const s = tamanho * 0.62;
  const x = (tamanho - s) / 2;
  const inner = simbolo.replace("<svg ", `<svg x="${x}" y="${x}" width="${s}" height="${s}" `);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 ${tamanho} ${tamanho}">
  <rect width="${tamanho}" height="${tamanho}" fill="${VINHO}"/>
  ${inner}
</svg>`;
}

/** Badge monocromático (Android mostra só a silhueta branca). */
function svgBadge(tamanho) {
  const s = tamanho * 0.9;
  const x = (tamanho - s) / 2;
  const branco = simbolo.replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="#FFFFFF"');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 ${tamanho} ${tamanho}">
  ${branco.replace("<svg ", `<svg x="${x}" y="${x}" width="${s}" height="${s}" `)}
</svg>`;
}

await mkdir("public/icons", { recursive: true });

const tarefas = [
  ["icon-192.png", () => sharp(iconeApp).resize(192, 192)],
  ["icon-512.png", () => sharp(iconeApp).resize(512, 512)],
  ["apple-touch-icon.png", () => sharp(iconeApp).resize(180, 180)],
  ["favicon-32.png", () => sharp(iconeApp).resize(32, 32)],
  ["icon-maskable-192.png", () => sharp(Buffer.from(svgMaskable(192)))],
  ["icon-maskable-512.png", () => sharp(Buffer.from(svgMaskable(512)))],
  ["badge-72.png", () => sharp(Buffer.from(svgBadge(72)))],
];

for (const [nome, fabrica] of tarefas) {
  await fabrica().png().toFile(`public/icons/${nome}`);
  console.log("ok", nome);
}
