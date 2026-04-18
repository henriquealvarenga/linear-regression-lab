// ─────────────────────────────────────────────────────────────
//  game.js — Motor do Linear Regression Lab
//
//  Fluxo:
//    home → briefing → play → round-result
//          → quiz (rounds 1–3) → briefing → ...
//          → final-score (após round 4)
//
//  Pontuação por round (máx 150 pts):
//    base        = % do ótimo alcançado (0–100 pts)
//    speed bonus = (secs_restantes / timeLimit) × 50 × (pct/100)
// ─────────────────────────────────────────────────────────────

const MAX_SPEED_BONUS = 50;

// ── Estado do jogo (separado do state.js) ────────────────────
const liga = {
  round:             0,     // 0-indexed (0–6)
  scores:            [],    // pontuação de cada round
  totalScore:        0,
  timer:             null,
  secs:              0,
  timeLimit:         15,
  active:            false,
  quizQ:             0,     // índice da pergunta atual dentro da transição
  lastAnswerCorrect: false  // controla o fluxo do botão "Continuar"
};

// ─────────────────────────────────────────────────────────────
//  UTILITÁRIOS
// ─────────────────────────────────────────────────────────────

function show(id, visible) {
  const el = document.getElementById(id);
  if (el) el.style.display = visible ? 'block' : 'none';
}

/** Exibe uma tela do jogo e oculta as demais. */
function showGameScreen(id) {
  document.querySelectorAll('.game-screen')
    .forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

/** Compatibilidade: plot.js chama resetChallenge() em initDataset(). */
function resetChallenge() {
  clearInterval(state.challenge.timer);
  Object.assign(state.challenge, { active: false, timer: null, secs: 90, initRSS: null });
}

// ─────────────────────────────────────────────────────────────
//  TELA: HOME
// ─────────────────────────────────────────────────────────────

function startLiga() {
  clearInterval(liga.timer);         // garante que nenhum timer anterior vaze
  liga.round             = 0;
  liga.scores            = [];
  liga.totalScore        = 0;
  liga.active            = false;
  liga.quizQ             = 0;        // reseta índice do quiz para o próximo jogo
  liga.lastAnswerCorrect = false;
  showBriefing();
}

// ─────────────────────────────────────────────────────────────
//  TELA: BRIEFING (antes de cada round)
// ─────────────────────────────────────────────────────────────

function showBriefing() {
  const ds    = DATASETS[liga.round];
  const stars = '⭐'.repeat(ds.difficulty) + '☆'.repeat(4 - ds.difficulty);

  const el = id => document.getElementById(id);
  if (el('brief-round-label'))  el('brief-round-label').textContent  = `Rodada ${liga.round + 1} de ${DATASETS.length}`;
  if (el('brief-icon'))         el('brief-icon').textContent         = ds.icon;
  if (el('brief-title'))        el('brief-title').textContent        = ds.title;
  if (el('brief-desc'))         el('brief-desc').textContent         = ds.desc;
  if (el('brief-time'))         el('brief-time').textContent         = `${ds.timeLimit}s`;
  if (el('brief-difficulty'))   el('brief-difficulty').textContent   = stars;

  const hintEl = el('brief-hint');
  if (hintEl) {
    hintEl.textContent   = ds.hint || '';
    hintEl.style.display = ds.hint ? 'block' : 'none';
  }

  if (el('brief-score-so-far'))
    el('brief-score-so-far').textContent =
      liga.scores.length ? `Pontuação até agora: ${liga.totalScore} pts` : '';

  showGameScreen('screen-briefing');
}

// ─────────────────────────────────────────────────────────────
//  TELA: JOGO (play)
// ─────────────────────────────────────────────────────────────

function startRound() {
  const ds       = DATASETS[liga.round];
  liga.timeLimit = ds.timeLimit;
  liga.secs      = ds.timeLimit;
  liga.active    = true;

  // Fecha e trava o heatmap durante o round — evita que o ponto OLS
  // seja visível antes de o jogador terminar o ajuste.
  if (state.heatmapOpen) {
    state.heatmapOpen = false;
    const hBody   = document.getElementById('heatmapBody');
    const hHeader = document.getElementById('heatmapHeader');
    const hToggle = document.getElementById('heatmapToggle');
    if (hBody)   hBody.classList.remove('open');
    if (hHeader) hHeader.classList.remove('open');
    if (hToggle) hToggle.textContent = '▼ Mostrar';
  }
  const hHeader = document.getElementById('heatmapHeader');
  if (hHeader) hHeader.classList.add('game-locked');

  // Carrega dados e inicializa gráfico
  initDataset(liga.round);

  // Define RSS inicial (reta horizontal na média de y)
  const ym = d3.mean(state.pts, d => d.y);
  state.slope     = 0;
  state.intercept = ym;
  state.challenge.initRSS = rss(state.pts, 0, ym);

  // Mostra barra de progresso no sidebar
  const pw   = document.getElementById('progWrap');
  const pl   = document.getElementById('progLabel');
  const hint = document.getElementById('rssHint');
  if (pw)   pw.style.display   = 'block';
  if (pl)   pl.style.display   = 'flex';
  if (hint) hint.textContent   = '% do ótimo alcançado';

  // Garante que a solução está oculta
  const sp = document.getElementById('solutionPanel');
  if (sp) sp.style.display = 'none';
  state.showSolution = false;
  if (typeof gSolLine !== 'undefined') gSolLine.selectAll('*').remove();

  updatePlayHeader();
  renderLine();
  renderResiduals();
  updateStats();

  showGameScreen('screen-play');

  // Timer do round
  liga.timer = setInterval(() => {
    liga.secs--;
    updatePlayHeader();
    if (liga.secs <= 0) endRound();
  }, 1000);
}

/** Atualiza o cabeçalho do play: round, timer, % do ótimo. */
function updatePlayHeader() {
  const el = id => document.getElementById(id);

  if (el('play-round-label'))
    el('play-round-label').textContent = `Rodada ${liga.round + 1} / ${DATASETS.length}`;

  const timerNum = el('play-timer-num');
  if (timerNum) {
    timerNum.textContent = Math.max(0, liga.secs);
    timerNum.classList.toggle('urgent', liga.secs <= 5);
  }

  if (el('play-timer-bar'))
    el('play-timer-bar').style.width =
      (Math.max(0, liga.secs) / liga.timeLimit * 100) + '%';

  // % do ótimo em tempo real
  // Usa state.currentRSS (calculado em updateStats) para evitar recomputar RSS.
  if (state.pts.length && state.challenge.initRSS) {
    const r    = state.currentRSS !== null ? state.currentRSS
                                           : rss(state.pts, state.slope, state.intercept);
    const solR = rss(state.pts, state.solSlope, state.solIntercept);
    const pct  = Math.max(0, Math.min(100,
      100 * (1 - (r - solR) / (state.challenge.initRSS - solR))));
    if (el('play-pct-live'))
      el('play-pct-live').textContent = `${pct.toFixed(0)}%`;
  }
}

// ─────────────────────────────────────────────────────────────
//  FIM DO ROUND
// ─────────────────────────────────────────────────────────────

function endRound() {
  clearInterval(liga.timer);
  liga.active = false;

  // Destrava o heatmap — solução OLS será revelada na tela de resultado
  const hHeader = document.getElementById('heatmapHeader');
  if (hHeader) hHeader.classList.remove('game-locked');

  const r     = rss(state.pts, state.slope, state.intercept);
  const solR  = rss(state.pts, state.solSlope, state.solIntercept);
  const initR = state.challenge.initRSS;
  const pct   = Math.max(0, Math.min(100,
    100 * (1 - (r - solR) / (initR - solR))));

  const base       = Math.round(pct);
  const speedBonus = Math.round(
    (Math.max(0, liga.secs) / liga.timeLimit) * MAX_SPEED_BONUS * (pct / 100)
  );
  const roundScore = base + speedBonus;

  liga.scores.push(roundScore);
  liga.totalScore += roundScore;

  // Revela a solução OLS no gráfico
  if (!state.showSolution) toggleSolution();

  showRoundResult(pct, base, speedBonus, roundScore);
}

// ─────────────────────────────────────────────────────────────
//  TELA: RESULTADO DO ROUND
// ─────────────────────────────────────────────────────────────

function showRoundResult(pct, base, bonus, total) {
  let emoji, msg;
  if      (pct >= 95) { emoji = '🥇'; msg = 'Impressionante! Você chegou quase ao ótimo.'; }
  else if (pct >= 80) { emoji = '🥈'; msg = 'Excelente ajuste! Continue assim.'; }
  else if (pct >= 60) { emoji = '🥉'; msg = 'Bom trabalho! A intuição melhora com a prática.'; }
  else                { emoji = '📚'; msg = 'Continue praticando — fica mais fácil com o tempo.'; }

  const el = id => document.getElementById(id);
  if (el('rr-emoji'))   el('rr-emoji').textContent   = emoji;
  if (el('rr-round'))   el('rr-round').textContent   = `Rodada ${liga.round + 1} de ${DATASETS.length}`;
  if (el('rr-pct'))     el('rr-pct').textContent     = `${pct.toFixed(0)}% do ótimo`;
  if (el('rr-base'))    el('rr-base').textContent    = base;
  if (el('rr-bonus'))   el('rr-bonus').textContent   = bonus;
  if (el('rr-total'))   el('rr-total').textContent   = total;
  if (el('rr-accum'))   el('rr-accum').textContent   = liga.totalScore;
  if (el('rr-msg'))     el('rr-msg').textContent     = msg;

  const btn = el('rr-continue-btn');
  if (btn) btn.textContent = liga.round < DATASETS.length - 1
    ? 'Próximo: Pergunta Rápida →'
    : 'Ver Placar Final →';

  showGameScreen('screen-round-result');
}

function afterRoundResult() {
  if (liga.round < DATASETS.length - 1) {
    liga.quizQ = 0;
    showQuizQuestion();
  } else {
    showFinalScore();
  }
}

// ─────────────────────────────────────────────────────────────
//  TELA: QUIZ
// ─────────────────────────────────────────────────────────────

function showQuizQuestion() {
  const q = QUIZ[liga.round][liga.quizQ];

  const el = id => document.getElementById(id);
  if (el('quiz-transition-label'))
    el('quiz-transition-label').textContent =
      `O que você aprendeu — Rodada ${liga.round + 1}`;
  if (el('quiz-q-counter'))
    el('quiz-q-counter').textContent =
      `Pergunta ${liga.quizQ + 1} de ${QUIZ[liga.round].length}`;
  if (el('quiz-question'))
    el('quiz-question').textContent = q.question;

  // Renderiza as opções A/B/C/D
  const optWrap = el('quiz-options');
  if (optWrap) {
    optWrap.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn         = document.createElement('button');
      btn.className     = 'quiz-option';
      btn.innerHTML     = `<span class="quiz-letter">${['A','B','C','D'][i]}</span>${opt}`;
      btn.onclick       = () => answerQuiz(i);
      optWrap.appendChild(btn);
    });
  }

  // Reseta feedback e botão continuar
  const fb = el('quiz-feedback');
  if (fb) { fb.innerHTML = ''; fb.className = 'quiz-feedback'; }

  const contBtn = el('quiz-continue-btn');
  if (contBtn) contBtn.style.display = 'none';

  showGameScreen('screen-quiz');
}

function answerQuiz(optionIdx) {
  const q       = QUIZ[liga.round][liga.quizQ];
  const options = document.querySelectorAll('.quiz-option');
  const fb      = document.getElementById('quiz-feedback');
  const contBtn = document.getElementById('quiz-continue-btn');

  options.forEach(b => { b.disabled = true; });

  const isCorrect = optionIdx === q.correct;
  liga.lastAnswerCorrect = isCorrect;

  options[optionIdx].classList.add(isCorrect ? 'correct' : 'wrong');
  if (!isCorrect) options[q.correct].classList.add('correct');

  // Mostra status + explicação
  if (fb) {
    const statusLine = isCorrect
      ? '<div class="qfb-status correct">✅ Correto!</div>'
      : '<div class="qfb-status wrong">❌ Não foi dessa vez — veja a resposta correta acima.</div>';
    const explainLine = q.feedback
      ? `<div class="qfb-explain">${q.feedback}</div>`
      : '';
    fb.innerHTML   = statusLine + explainLine;
    fb.className   = 'quiz-feedback shown';
  }

  // Mostra botão continuar
  if (contBtn) {
    contBtn.textContent = isCorrect ? 'Continuar →' : 'Tentar Novamente →';
    contBtn.style.display = 'inline-block';
  }
}

/** Chamado pelo botão "Continuar →" / "Tentar Novamente →" */
function quizContinue() {
  const contBtn = document.getElementById('quiz-continue-btn');
  const fb      = document.getElementById('quiz-feedback');
  const options = document.querySelectorAll('.quiz-option');

  if (!liga.lastAnswerCorrect) {
    // Deixa tentar de novo
    options.forEach(b => {
      b.disabled = false;
      b.classList.remove('correct', 'wrong');
    });
    if (fb)      { fb.innerHTML = ''; fb.className = 'quiz-feedback'; }
    if (contBtn) { contBtn.style.display = 'none'; }
    return;
  }

  // Avança para próxima pergunta ou próximo round
  if (contBtn) contBtn.style.display = 'none';
  liga.quizQ++;
  if (liga.quizQ >= QUIZ[liga.round].length) {
    liga.round++;
    showBriefing();
  } else {
    showQuizQuestion();
  }
}

// ─────────────────────────────────────────────────────────────
//  CONFIRMAÇÃO ANTECIPADA (botão durante o jogo)
// ─────────────────────────────────────────────────────────────

/** Permite encerrar o round antes do tempo — mantém bônus de velocidade. */
function confirmRound() {
  if (!liga.active) return;
  endRound();
}

// ─────────────────────────────────────────────────────────────
//  TELA: PLACAR FINAL
// ─────────────────────────────────────────────────────────────

function showFinalScore() {
  const max = (100 + MAX_SPEED_BONUS) * DATASETS.length; // 1050 pontos máximo (7 rounds)
  const pct = Math.round(liga.totalScore / max * 100);

  let badge, badgeMsg;
  if      (pct >= 90) { badge = '🏆 Mestre da Regressão';   badgeMsg = 'Ajuste perfeito em todos os rounds. Você dominou os mínimos quadrados!'; }
  else if (pct >= 70) { badge = '🥇 Expert em Regressão';   badgeMsg = 'Excelente desempenho! Você tem ótima intuição para regressão linear.'; }
  else if (pct >= 50) { badge = '🥈 Analista Promissor';    badgeMsg = 'Bom trabalho! Continue praticando — a intuição vem com o tempo.'; }
  else if (pct >= 30) { badge = '🥉 Aprendiz de Regressão'; badgeMsg = 'Você está no caminho certo. Tente de novo para melhorar!'; }
  else                { badge = '📚 Em Formação';            badgeMsg = 'Revise a teoria e tente novamente — todo especialista começa aqui!'; }

  const el = id => document.getElementById(id);
  if (el('final-badge'))       el('final-badge').textContent       = badge;
  if (el('final-badge-msg'))   el('final-badge-msg').textContent   = badgeMsg;
  if (el('final-total-score')) el('final-total-score').textContent = `${liga.totalScore} / ${max} pts`;
  // Atualiza o texto dinâmico do total no placar
  if (el('final-pct'))         el('final-pct').textContent         = `${pct}%`;

  const breakdown = el('final-breakdown');
  if (breakdown) {
    breakdown.innerHTML = liga.scores.map((s, i) =>
      `<div class="final-round-row">
        <span>${DATASETS[i].icon} Round ${i + 1} — ${DATASETS[i].title}</span>
        <span class="final-round-pts">${s} pts</span>
      </div>`
    ).join('');
  }

  showGameScreen('screen-final');
}

// ─────────────────────────────────────────────────────────────
//  EASTER EGG — 7 cliques no logo da home
// ─────────────────────────────────────────────────────────────

let _eeClicks = 0;
let _eeTimer  = null;

function easterEggClick() {
  _eeClicks++;
  clearTimeout(_eeTimer);

  if (_eeClicks >= 7) {
    _eeClicks = 0;
    document.getElementById('easter-egg-overlay').classList.add('open');
  } else {
    // Reseta a contagem se o usuário parar de clicar por 2,5 segundos
    _eeTimer = setTimeout(() => { _eeClicks = 0; }, 2500);
  }
}

function closeEasterEgg(event) {
  // Fecha ao clicar no overlay (fora do modal) ou no botão ×
  if (!event || event.target === document.getElementById('easter-egg-overlay')) {
    document.getElementById('easter-egg-overlay').classList.remove('open');
  }
}

// ─────────────────────────────────────────────────────────────
//  EXTENSÃO: updatePlayHeader a cada arraste durante o jogo
// ─────────────────────────────────────────────────────────────

(function () {
  const _orig = onLineMoved;
  onLineMoved = function () {
    _orig();
    if (liga.active) updatePlayHeader();
  };
})();
