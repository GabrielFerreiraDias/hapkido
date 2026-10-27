import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import "../quiz.js";
import "../data/banco.js";

const engine = globalThis.HapkidoQuiz;
const { golpes, dicionario } = globalThis.HAPKIDO_DATA;

test("banco local corresponde aos JSONs e às 26 técnicas do TXT", async () => {
  const source = await readFile(new URL("../golpes.txt", import.meta.url), "utf8");
  const lines = source.split(/\r?\n/).map(line => line.trim()).filter(line => line.includes(":"));
  assert.equal(golpes.length, 26);
  assert.equal(lines.length, 26);
  for (const [index, line] of lines.entries()) {
    const colon = line.indexOf(":");
    assert.equal(golpes[index].romanizacao, line.slice(0, colon).trim());
    const normalize = value => value.replace(/\s+/g, " ").replace(/\s+\./g, ".").trim();
    assert.equal(normalize(golpes[index].traducao), normalize(line.slice(colon + 1)));
  }
  assert.deepEqual(golpes, JSON.parse(await readFile(new URL("../data/golpes.json", import.meta.url), "utf8")));
  assert.deepEqual(dicionario, JSON.parse(await readFile(new URL("../data/dicionario.json", import.meta.url), "utf8")));
});

test("quantidades limitadas ao banco, sem repetição e com quatro alternativas únicas", () => {
  for (let iteration = 0; iteration < 50; iteration++) {
    for (const [quantity, total] of [["10", 10], ["20", 20], ["30", 26], ["all", 26]]) {
      const game = engine.createGame(golpes, dicionario.notas, quantity);
      assert.equal(game.questions.length, total);
      assert.equal(new Set(game.questions.map(question => question.golpe.id)).size, total);
      assert.ok(game.questions.some(question => question.type === "nome"));
      assert.ok(game.questions.some(question => question.type === "significado"));
      for (const question of game.questions) {
        assert.equal(question.alternatives.length, 4);
        assert.equal(new Set(question.alternatives.map(option => option.id)).size, 4);
        assert.equal(new Set(question.alternatives.map(option => option.label)).size, 4);
        assert.equal(question.alternatives.filter(option => option.id === question.golpe.id).length, 1);
        if (question.type === "pista") {
          const note = dicionario.notas.find(item => item.golpes.includes(question.golpe.id));
          assert.equal(question.alternatives.filter(option => note.golpes.includes(option.id)).length, 1);
        }
      }
    }
  }
});

test("partida completa contabiliza marcos 3, 5 e 10, sem pontuar resposta duplicada", () => {
  const game = engine.createGame(golpes, dicionario.notas, "10");
  for (let i = 0; i < 10; i++) {
    const id = game.questions[game.index].golpe.id;
    const result = engine.answer(game, id);
    assert.equal(result.bonus, ({ 3: 5, 5: 10, 10: 20 })[i + 1] || 0);
    assert.throws(() => engine.answer(game, id));
    assert.equal(engine.advance(game), i < 9);
  }
  assert.equal(game.score, 135);
  assert.equal(game.hits, 10);
  assert.equal(game.misses, 0);
  assert.equal(game.bestStreak, 10);
  assert.ok(game.finished);
  assert.throws(() => engine.advance(game));
});

test("erro não pontua, zera combo e permite conquistar marcos em nova sequência", () => {
  const game = engine.createGame(golpes, dicionario.notas, "10");
  assert.throws(() => engine.advance(game));
  assert.throws(() => engine.answer(game, "inexistente"));
  for (let i = 0; i < 10; i++) {
    const question = game.questions[game.index];
    engine.answer(game, i === 3 ? question.alternatives.find(option => option.id !== question.golpe.id).id : question.golpe.id);
    if (i === 3) {
      assert.equal(game.streak, 0);
      assert.equal(game.score, 35);
    }
    engine.advance(game);
  }
  assert.equal(game.score, 110);
  assert.equal(game.hits, 9);
  assert.equal(game.misses, 1);
  assert.equal(game.bestStreak, 6);
});

test("tipo pista usa somente notas reais, sem alternativas ambíguas", () => {
  for (const note of dicionario.notas) {
    for (const id of note.golpes) {
      const golpe = golpes.find(item => item.id === id);
      const question = engine.createQuestion(golpe, "pista", golpes, dicionario.notas);
      assert.equal(question.type, "pista");
      assert.ok(question.prompt.includes(note.explicacao));
      assert.equal(question.alternatives.filter(option => note.golpes.includes(option.id)).length, 1);
    }
  }
  assert.equal(engine.createQuestion(golpes.find(item => item.id === "pakumchi"), "pista", golpes, dicionario.notas).type, "nome");
});

test("progresso pode ser serializado e dados inválidos são rejeitados", () => {
  const progress = engine.emptyProgress();
  progress.mistakes["ap-tiagui"] = 2;
  assert.deepEqual(engine.validateProgress(JSON.parse(JSON.stringify(progress))), progress);
  for (const value of [null, {}, { ...progress, hits: -1 }, { ...progress, games: 1.5 },
    { ...progress, mistakes: [] }, { ...progress, mistakes: { teste: "1" } }]) {
    assert.throws(() => engine.validateProgress(value));
  }
});
