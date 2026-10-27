(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const engine = globalThis.HapkidoQuiz;
  const data = globalThis.HAPKIDO_DATA;
  const storageKey = "hapkido-memory-v1";
  let game = null;
  let quantity = "10";
  let screen = "inicio";
  let progress;
  let persistenceAvailable = true;
  let audioContext = null;
  let soundEnabled = false;
  const format = number => number.toLocaleString("pt-BR");

  function audioFailure(error) {
    soundEnabled = false;
    $("sound-button").textContent = "Som: indisponível";
    $("sound-button").setAttribute("aria-pressed", "false");
    $("sound-button").disabled = true;
    $("audio-warning").textContent = "Não foi possível ativar o áudio neste navegador. O jogo continua normalmente, com feedback visual.";
    $("audio-warning").hidden = false;
    console.error("Efeitos sonoros indisponíveis.", error);
  }

  async function toggleSound() {
    if (soundEnabled) {
      soundEnabled = false;
    } else {
      try {
        if (!audioContext) audioContext = new AudioContext();
        await audioContext.resume();
        if (audioContext.state !== "running") throw new Error("Áudio bloqueado pelo navegador.");
        soundEnabled = true;
      } catch (error) {
        audioFailure(error);
        return;
      }
    }
    $("sound-button").textContent = `Som: ${soundEnabled ? "ON" : "OFF"}`;
    $("sound-button").setAttribute("aria-pressed", String(soundEnabled));
    $("sound-button").setAttribute("aria-label", soundEnabled ? "Desativar efeitos sonoros" : "Ativar efeitos sonoros");
    if (soundEnabled) playEffect("correct");
  }

  function playEffect(type) {
    if (!soundEnabled || !audioContext) return;
    const notes = type === "bonus" ? [523.25, 659.25, 783.99, 1046.5]
      : type === "correct" ? [659.25, 880] : [220, 164.81];
    try {
      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = audioContext.currentTime + index * 0.09;
        oscillator.type = "square";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.035, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.13);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch (error) {
      audioFailure(error);
    }
  }

  function showStorageWarning(message, error) {
    console.error(message, error);
    $("storage-warning").textContent = message;
    $("storage-warning").hidden = false;
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? engine.validateProgress(JSON.parse(saved)) : engine.emptyProgress();
    } catch (error) {
      persistenceAvailable = false;
      showStorageWarning("Não foi possível ler seu progresso. Este treino funcionará em memória, sem substituir dados salvos. Verifique as permissões de armazenamento do navegador.", error);
      return engine.emptyProgress();
    }
  }

  function saveProgress() {
    if (!persistenceAvailable) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch (error) {
      persistenceAvailable = false;
      showStorageWarning("Não foi possível salvar seu progresso neste navegador. Você pode continuar jogando, mas as novas estatísticas ficarão apenas nesta sessão.", error);
    }
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function statistic(value, label) {
    const element = node("div", "stat");
    element.append(node("strong", "", typeof value === "number" ? format(value) : value), node("span", "", label));
    return element;
  }

  function renderHome() {
    $("home-stats").replaceChildren(
      statistic(progress.highScore, "Maior pontuação"),
      statistic(progress.games, "Partidas concluídas"),
      statistic(progress.hits, "Total de acertos"),
      statistic(progress.misses, "Total de erros"),
      statistic(progress.bestStreak, "Melhor sequência")
    );
    const hardest = data.golpes.filter(golpe => progress.mistakes[golpe.id])
      .sort((a, b) => progress.mistakes[b.id] - progress.mistakes[a.id]).slice(0, 3);
    $("hardest").replaceChildren(node("p", "", hardest.length
      ? `Para reforçar no próximo treino: ${hardest.map(golpe => `${golpe.romanizacao} (${progress.mistakes[golpe.id]} ${progress.mistakes[golpe.id] === 1 ? "erro" : "erros"})`).join(" · ")}.`
      : "Sua jornada começa aqui. Faça um treino para acompanhar sua evolução."));
  }

  function showScreen(id) {
    screen = id;
    for (const element of document.querySelectorAll(".screen")) element.hidden = element.id !== id;
    if (id === "inicio") renderHome();
    if (id === "revisao") renderReview();
    if (id === "quantidade") renderQuantities();
    const heading = $(id).querySelector("h1");
    heading.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function route() {
    const destination = location.hash.slice(1);
    const target = ["inicio", "revisao", "quantidade"].includes(destination) ? destination : "inicio";
    if (screen === "jogo" && game && !game.finished) {
      history.replaceState(null, "", "#jogo");
      pendingDestination = target;
      if (!$("leave-dialog").open) $("leave-dialog").showModal();
      return;
    }
    showScreen(target);
  }

  function navigate(id) {
    history.replaceState(null, "", `#${id}`);
    showScreen(id);
  }

  function renderQuantities() {
    $("quantity-options").replaceChildren();
    for (const [value, label, subtitle] of [
      ["10", "10", "Um treino rápido"], ["20", "20", "Um passo além"],
      ["30", "30", "Usa as 26 disponíveis"], ["all", "Todas", "26 técnicas, sem repetir"]
    ]) {
      const button = node("button", "quantity-option");
      button.setAttribute("aria-pressed", String(quantity === value));
      button.append(node("strong", "", label), node("span", "", subtitle));
      button.addEventListener("click", () => {
        quantity = value;
        for (const option of $("quantity-options").children) option.setAttribute("aria-pressed", String(option === button));
        updateQuantityNote();
      });
      $("quantity-options").append(button);
    }
    updateQuantityNote();
  }

  function updateQuantityNote() {
    const count = quantity === "all" ? data.golpes.length : Math.min(Number(quantity), data.golpes.length);
    $("quantity-note").textContent = quantity === "30"
      ? "O material tem 26 técnicas. Seu treino terá 26 perguntas, sem repetir técnicas."
      : `Seu treino terá ${count} perguntas aleatórias, com 4 alternativas em cada uma.`;
    $("start-button").setAttribute("aria-label", `Começar treino de ${count} perguntas`);
  }

  function startGame() {
    game = engine.createGame(data.golpes, data.dicionario.notas, quantity);
    history.replaceState(null, "", "#jogo");
    showScreen("jogo");
    renderQuestion();
  }

  function updateGameStats() {
    $("score").textContent = format(game.score);
    $("hits").textContent = game.hits;
    $("misses").textContent = game.misses;
    $("streak").textContent = game.streak;
    const milestone = [3, 5, 10].find(value => value > game.streak);
    const bonuses = { 3: 5, 5: 10, 10: 20 };
    $("combo-message").textContent = game.streak === 0 ? "Aqueça a memória!"
      : game.streak === 1 ? "Boa! Continue assim." : `${game.streak} ACERTOS · COMBO!`;
    $("combo-target").textContent = milestone
      ? `${game.streak} / ${milestone} seguidos → +${bonuses[milestone]} pts` : "Todos os bônus da sequência conquistados!";
    $("combo-fill").style.width = `${milestone ? game.streak / milestone * 100 : 100}%`;
    $("combo-meter").setAttribute("aria-valuemax", milestone || 10);
    $("combo-meter").setAttribute("aria-valuenow", Math.min(game.streak, milestone || 10));
    $("combo-meter").setAttribute("aria-valuetext", $("combo-target").textContent);
    $("question-count").textContent = `Pergunta ${game.index + 1} / ${game.questions.length}`;
    $("progress-fill").style.width = `${game.answers.length / game.questions.length * 100}%`;
    $("question-progress").setAttribute("aria-valuemax", game.questions.length);
    $("question-progress").setAttribute("aria-valuenow", game.answers.length);
  }

  function renderQuestion() {
    const question = game.questions[game.index];
    $("question-card").removeAttribute("data-feedback");
    $("arcade-burst").hidden = true;
    updateGameStats();
    $("question-type").textContent = {
      significado: "NOME → SIGNIFICADO", nome: "SIGNIFICADO → NOME", pista: "PISTA DO MATERIAL → NOME"
    }[question.type];
    $("question-title").textContent = question.title;
    $("question-prompt").textContent = question.prompt;
    $("feedback").hidden = true;
    $("feedback").replaceChildren();
    $("next-button").hidden = true;
    $("answers").replaceChildren();
    question.alternatives.forEach((alternative, index) => {
      const button = node("button", "answer");
      button.dataset.id = alternative.id;
      button.setAttribute("aria-keyshortcuts", `${"abcd"[index]} ${index + 1}`);
      button.append(node("span", "answer-letter", "ABCD"[index]), node("span", "answer-label", alternative.label));
      button.addEventListener("click", () => chooseAnswer(alternative.id));
      $("answers").append(button);
    });
    $("question-title").focus({ preventScroll: true });
  }

  function chooseAnswer(id) {
    if (!game || game.answers.length > game.index) return;
    const result = engine.answer(game, id);
    const question = game.questions[game.index];
    $("question-card").dataset.feedback = result.correct ? "correct" : "incorrect";
    $("arcade-burst").textContent = result.correct
      ? result.bonus ? `COMBO! +${10 + result.bonus}` : "+10 · BOA!" : "PRÓXIMA VOCÊ ACERTA!";
    $("arcade-burst").className = `arcade-burst ${result.correct ? "burst-hit" : "burst-miss"}`;
    $("arcade-burst").hidden = false;
    playEffect(result.bonus ? "bonus" : result.correct ? "correct" : "incorrect");
    for (const button of $("answers").children) {
      button.disabled = true;
      if (button.dataset.id === question.golpe.id) {
        button.classList.add("correct");
        button.querySelector(".answer-label").append(node("span", "answer-state", "✓ Resposta correta"));
      } else if (button.dataset.id === id) {
        button.classList.add("incorrect");
        button.querySelector(".answer-label").append(node("span", "answer-state", "✕ Sua resposta"));
      }
    }
    progress.hits += Number(result.correct);
    progress.misses += Number(!result.correct);
    progress.bestStreak = Math.max(progress.bestStreak, game.bestStreak);
    if (!result.correct) progress.mistakes[question.golpe.id] = (progress.mistakes[question.golpe.id] || 0) + 1;
    saveProgress();
    updateGameStats();
    $("feedback").className = `feedback${result.correct ? "" : " is-wrong"}`;
    $("feedback").append(node("strong", "", result.correct ? "Boa! +10 pontos." : "Não foi desta vez. Vamos memorizar?"),
      node("p", "", question.explanation));
    if (result.bonus) $("feedback").append(node("span", "bonus", `🔥 ${game.streak} acertos seguidos! Bônus de +${result.bonus} pontos.`));
    $("feedback").hidden = false;
    $("next-button").textContent = game.index + 1 === game.questions.length ? "Ver resultado →" : "Próxima pergunta →";
    $("next-button").hidden = false;
    $("next-button").focus({ preventScroll: true });
  }

  function nextQuestion() {
    if (!game || game.finished || game.answers.length !== game.index + 1) return;
    if (engine.advance(game)) {
      renderQuestion();
      window.scrollTo({ top: $("jogo").offsetTop, behavior: "instant" });
    } else finishGame();
  }

  function finishGame() {
    const record = game.score > progress.highScore;
    progress.games++;
    progress.highScore = Math.max(progress.highScore, game.score);
    saveProgress();
    const accuracy = Math.round(game.hits / game.questions.length * 100);
    $("result-score").textContent = format(game.score);
    $("record-message").textContent = record ? "✦ Novo recorde pessoal!" : `Seu recorde: ${format(progress.highScore)} pontos`;
    $("result-message").textContent = accuracy === 100 ? "Treino perfeito! Todos os nomes na memória."
      : accuracy >= 70 ? "Muito bem! Mais um passo na sua jornada." : "Continue praticando. A repetição faz parte do caminho.";
    $("result-stats").replaceChildren(statistic(game.hits, "Acertos"), statistic(game.misses, "Erros"),
      statistic(`${accuracy}%`, "Percentual de acerto"), statistic(game.bestStreak, "Maior sequência"));
    $("result-review").replaceChildren();
    const mistakes = game.answers.filter(item => !item.correct);
    if (mistakes.length) {
      const box = node("div", "result-review");
      const list = node("ul");
      for (const mistake of mistakes) {
        const golpe = data.golpes.find(item => item.id === mistake.golpeId);
        list.append(node("li", "", `${golpe.romanizacao} — ${golpe.traducao}`));
      }
      box.append(node("h2", "", "Leve estes nomes para o próximo treino"), list);
      $("result-review").append(box);
    }
    navigate("resultado");
  }

  const normalize = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  function renderReview() {
    const query = normalize($("search").value.trim());
    const filtered = data.golpes.filter(golpe => normalize(`${golpe.romanizacao} ${golpe.traducao}`).includes(query));
    $("review-count").textContent = `${filtered.length} de ${data.golpes.length} técnicas`;
    $("review-list").replaceChildren();
    for (const golpe of filtered) {
      const card = node("article", "technique");
      card.append(node("p", "eyebrow", "NOME · TRANSCRIÇÃO DO MATERIAL"),
        node("h2", "", golpe.romanizacao), node("p", "", golpe.traducao));
      const nota = data.dicionario.notas.find(item => item.golpes.includes(golpe.id));
      if (nota) card.append(node("p", "small-note", `Nota: ${nota.termo} — ${nota.explicacao}.`));
      const count = progress.mistakes[golpe.id];
      if (count) card.append(node("p", "small-note", `No seu histórico: ${count} ${count === 1 ? "erro" : "erros"}.`));
      $("review-list").append(card);
    }
    if (!filtered.length) $("review-list").append(node("p", "empty", "Nenhuma técnica encontrada. Tente outro nome ou significado."));
  }

  let pendingDestination = "inicio";
  try {
    if (!engine || !data || data.golpes.length < 4) throw new Error("Banco de dados ou motor do quiz não carregado.");
    progress = loadProgress();
    for (const nota of data.dicionario.notas) {
      const element = node("article", "dictionary-note");
      element.append(node("h3", "", nota.termo), node("p", "", nota.explicacao),
        node("p", "muted", `Exemplos na fonte: ${nota.exemplosOriginais.join(" / ")}`));
      $("dictionary-notes").append(element);
    }
    $("start-button").addEventListener("click", startGame);
    $("sound-button").addEventListener("click", toggleSound);
    $("quantity-start").addEventListener("click", startGame);
    $("quantity-button").addEventListener("click", () => navigate("quantidade"));
    $("next-button").addEventListener("click", nextQuestion);
    $("play-again").addEventListener("click", startGame);
    $("search").addEventListener("input", renderReview);
    for (const button of document.querySelectorAll(".back-home")) button.addEventListener("click", () => navigate("inicio"));
    for (const id of ["help-button", "home-help"]) $(id).addEventListener("click", () => $("help-dialog").showModal());
    $("close-help").addEventListener("click", () => $("help-dialog").close());
    $("leave-game").addEventListener("click", () => {
      pendingDestination = "inicio";
      $("leave-dialog").showModal();
    });
    $("keep-playing").addEventListener("click", () => $("leave-dialog").close());
    $("confirm-leave").addEventListener("click", () => {
      $("leave-dialog").close();
      game = null;
      navigate(pendingDestination);
    });
    window.addEventListener("hashchange", route);
    document.addEventListener("keydown", event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || screen !== "jogo"
        || document.querySelector("dialog[open]") || !game || game.answers.length > game.index) return;
      if (event.target instanceof HTMLElement && (event.target.matches("input, textarea, select") || event.target.isContentEditable)) return;
      const key = event.key.toLowerCase();
      const index = "abcd".indexOf(key);
      const option = key.length === 1 && index >= 0 ? index : /^[1-4]$/.test(key) ? Number(key) - 1 : -1;
      if (option < 0) return;
      event.preventDefault();
      chooseAnswer(game.questions[game.index].alternatives[option].id);
    });
    updateQuantityNote();
    route();
  } catch (error) {
    console.error("Falha ao iniciar o Hapkido.", error);
    for (const element of document.querySelectorAll(".screen")) element.hidden = true;
    $("fatal-error").textContent = "Não foi possível iniciar o jogo. Confira se data/banco.js, quiz.js e script.js estão junto do index.html. Se você alterou os JSONs, execute node tools/prepare-data.mjs.";
    $("fatal-error").hidden = false;
  }
})();
