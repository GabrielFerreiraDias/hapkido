import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const golpes = JSON.parse(await readFile(new URL("data/golpes.json", root), "utf8"));
const dicionario = JSON.parse(await readFile(new URL("data/dicionario.json", root), "utf8"));
if (golpes.length < 4 || new Set(golpes.map(golpe => golpe.id)).size !== golpes.length) {
  throw new Error("O banco precisa de pelo menos quatro técnicas com IDs únicos.");
}
for (const golpe of golpes) {
  if (!golpe.romanizacao || !golpe.traducao) throw new Error(`Técnica incompleta: ${golpe.id}`);
}
for (const nota of dicionario.notas) {
  if (nota.golpes.some(id => !golpes.some(golpe => golpe.id === id))) {
    throw new Error(`Referência desconhecida na nota ${nota.termo}`);
  }
}
await writeFile(new URL("data/banco.js", root),
  `// Gerado por tools/prepare-data.mjs. Edite os arquivos JSON de origem.\nglobalThis.HAPKIDO_DATA = ${JSON.stringify({ golpes, dicionario }, null, 2)};\n`);
console.log(`Banco preparado: ${golpes.length} técnicas e ${dicionario.notas.length} notas.`);
