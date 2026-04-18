// ─────────────────────────────────────────────────────────────
//  state.js — Estado global compartilhado da aplicação
//  Analogia R: environment compartilhado entre scripts
// ─────────────────────────────────────────────────────────────

const state = {
  // ── Dataset atual ──────────────────────────────────────────
  dsIdx:       0,
  pts:         [],       // pontos gerados
  slope:       0,        // β₁ atual (usuário)
  intercept:   0,        // β₀ atual (usuário)
  solSlope:    0,        // β₁ ótimo (OLS)
  solIntercept:0,        // β₀ ótimo (OLS)
  showSolution:false,

  // ── Heatmap ────────────────────────────────────────────────
  heatmapOpen:      false,
  baseHeatmapImage: null,  // ImageData cacheada (sem o ponto branco)
  hmMeta:           null,  // { sMin, sMax, bMin, bMax, cW, cH }

  // ── Cache de cálculos caros ────────────────────────────────
  // RSS da posição atual — calculado em updateStats() e lido em
  // updatePlayHeader() para evitar recomputar a cada frame de drag.
  currentRSS: null,

  // ── Jogo ───────────────────────────────────────────────────
  challenge: {
    active:  false,
    timer:   null,
    initRSS: null   // RSS da reta horizontal inicial — base do cálculo de % do ótimo
  },

  // ── Controle interno ───────────────────────────────────────
  _initialized: false   // garante que D3 inicia apenas uma vez
};
