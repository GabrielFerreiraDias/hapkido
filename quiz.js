(function (root) {
  "use strict";

  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function createQuestion(golpe, type, golpes, notas, random = Math.random) {
    const nota = notas.find(item => item.golpes.includes(golpe.id));
    if (type === "pista" && !nota) type = "nome";
    const field = type === "significado" ? "traducao" : "romanizacao";
    let candidates = golpes.filter(item => item.id !== golpe.id && item[field] !== golpe[field]);
    if (type === "pista") candidates = candidates.filter(item => !nota.golpes.includes(item.id));
    const unique = [...new Map(candidates.map(item => [item[field], item])).values()];
    if (unique.length < 3) throw new Error("Não há alternativas distintas suficientes.");
    const alternatives = shuffle([golpe, ...shuffle(unique, random).slice(0, 3)], random)
      .map(item => ({ id: item.id, label: item[field] }));
    return {
      golpe, type, alternatives,
      title: type === "significado" ? "Qual é o significado deste nome?"
        : type === "pista" ? "Qual nome corresponde a esta informação?" : "Qual é o nome desta técnica?",
      prompt: type === "significado" ? golpe.romanizacao
        : type === "pista" ? `A nota “${nota.termo}” indica: “${nota.explicacao}”. Qual destas técnicas é um exemplo?`
          : golpe.traducao,
      explanation: `${golpe.romanizacao}: ${golpe.traducao}${nota ? ` Nota do material: “${nota.termo}” — ${nota.explicacao}.` : ""}`
    };
  }

  function createGame(golpes, notas, quantity, random = Math.random) {
    if (golpes.length < 4) throw new Error("São necessárias pelo menos quatro técnicas.");
    if (quantity !== "all" && ![10, 20, 30].includes(Number(quantity))) {
      throw new Error("Quantidade de perguntas inválida.");
    }
    const count = quantity === "all" ? golpes.length : Math.min(Number(quantity), golpes.length);
    const selected = shuffle(golpes, random).slice(0, count);
    const eligible = shuffle(selected.filter(golpe => notas.some(nota => nota.golpes.includes(golpe.id))), random);
    const clueIds = new Set(eligible.slice(0, Math.min(3, Math.floor(count / 3))).map(golpe => golpe.id));
    let direction = Math.floor(random() * 2);
    return {
      questions: selected.map(golpe => createQuestion(golpe,
        clueIds.has(golpe.id) ? "pista" : direction++ % 2 === 0 ? "significado" : "nome",
        golpes, notas, random)),
      index: 0, score: 0, hits: 0, misses: 0, streak: 0, bestStreak: 0, answers: [], finished: false
    };
  }

  function answer(game, id) {
    if (game.finished || game.answers.length > game.index) throw new Error("Pergunta já respondida.");
    const question = game.questions[game.index];
    if (!question || !question.alternatives.some(item => item.id === id)) throw new Error("Alternativa inválida.");
    const correct = id === question.golpe.id;
    let bonus = 0;
    if (correct) {
      game.hits++;
      game.streak++;
      bonus = ({ 3: 5, 5: 10, 10: 20 })[game.streak] || 0;
      game.score += 10 + bonus;
      game.bestStreak = Math.max(game.bestStreak, game.streak);
    } else {
      game.misses++;
      game.streak = 0;
    }
    const result = { id, golpeId: question.golpe.id, correct, bonus };
    game.answers.push(result);
    return result;
  }

  function advance(game) {
    if (game.finished || game.answers.length !== game.index + 1) throw new Error("Responda antes de avançar.");
    if (game.index + 1 === game.questions.length) {
      game.finished = true;
      return false;
    }
    game.index++;
    return true;
  }

  function emptyProgress() {
    return { version: 1, highScore: 0, games: 0, hits: 0, misses: 0, bestStreak: 0, mistakes: {} };
  }

  function validateProgress(value) {
    if (!value || value.version !== 1) throw new Error("Formato de progresso incompatível.");
    for (const key of ["highScore", "games", "hits", "misses", "bestStreak"]) {
      if (!Number.isSafeInteger(value[key]) || value[key] < 0) throw new Error("Progresso inválido.");
    }
    if (!value.mistakes || typeof value.mistakes !== "object" || Array.isArray(value.mistakes)) {
      throw new Error("Histórico de erros inválido.");
    }
    for (const count of Object.values(value.mistakes)) {
      if (!Number.isSafeInteger(count) || count < 0) throw new Error("Contagem de erros inválida.");
    }
    return value;
  }

  root.HapkidoQuiz = { shuffle, createQuestion, createGame, answer, advance, emptyProgress, validateProgress };
})(globalThis);
