// Baixa os papéis de parede dos temas dos stories (gerados no Higgsfield) e deixa em
// public/stories/temas/<id>.jpg (1080x1920) + <id>-mini.jpg (miniatura do seletor).
// Uso: node scripts/baixar-fundos-stories.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const BASE = "https://d8j0ntlcm91z4.cloudfront.net/user_37slbYBbAAm8mqBtvNuXnt69fMp/";
const FUNDOS = {
  natal: "hf_20261108_015540_328ef47a-9873-4853-a0c6-599536e60366.png",
  "ano-novo": "hf_20261108_015542_2ee6f0d2-2b96-4c82-b4ea-9e6e2713f44e.png",
  "dia-da-mulher": "hf_20261108_015616_1fd12c19-2af5-4acb-8fbb-933cef09002d.png",
  "outubro-rosa": "hf_20261108_015540_524845c1-2be8-4c6e-acb4-da70f6fffa0d.png",
  "novembro-azul": "hf_20261108_015541_5c0483f6-ba1e-40a7-9fdc-1d6612cf5043.png",
  "dia-das-maes": "hf_20261108_015616_6c7d91f7-b224-4f0d-ac77-42e8b5006c39.png",
  namorados: "hf_20261108_015541_2f768202-ac06-4be7-860e-cb0793cb1e1c.png",
  pascoa: "hf_20261108_015542_0a1e8503-c285-4ee0-98f2-ebe21932f546.png",
  carnaval: "hf_20261108_015616_d7d0f224-0e25-4aa1-8db1-5874cd021c4f.png",
  "black-friday": "hf_20261108_015540_80980df0-cb26-434d-bb90-218a8709bd96.png",
  verao: "hf_20261108_015541_3f2c8111-8df7-4fc8-b493-d51294d31d8a.png",
  "festa-junina": "hf_20261108_015645_eba9753c-4573-47ae-9195-8b04609d353b.png",
  "dia-dos-pais": "hf_20261108_015645_3b2491e5-7725-41de-b1a7-d99ddf7ae9be.png",
  floral: "hf_20261108_015645_1a2cf3ee-53da-43e1-8ef3-1ed09be5e278.png",
  marmore: "hf_20261108_015711_fb29ca7d-c4fa-4c60-90f4-c44d97a75a8c.png",
};

const destino = join(process.cwd(), "public", "stories", "temas");
await mkdir(destino, { recursive: true });

for (const [id, arquivo] of Object.entries(FUNDOS)) {
  const r = await fetch(BASE + arquivo);
  if (!r.ok) {
    console.error(`falhou ${id}: ${r.status}`);
    continue;
  }
  const original = Buffer.from(await r.arrayBuffer());
  const grande = await sharp(original).resize(1080, 1920, { fit: "cover" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  const mini = await sharp(original).resize(180, 320, { fit: "cover" }).jpeg({ quality: 70, mozjpeg: true }).toBuffer();
  await writeFile(join(destino, `${id}.jpg`), grande);
  await writeFile(join(destino, `${id}-mini.jpg`), mini);
  console.log(`${id}: ${Math.round(grande.length / 1024)} KB`);
}
