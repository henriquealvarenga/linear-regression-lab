// ─────────────────────────────────────────────────────────────
//  app.js — Ponto de entrada da aplicação
//  Analogia R: main.R — orquestra todos os outros scripts
//
//  Ordem de carregamento no index.html:
//    d3 → math.js → state.js → datasets.js → plot.js
//         → heatmap.js → game.js → screens.js → app.js
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // 1. Inicializa o SVG D3 (cria grupos, escalas, eixos)
  initPlot();

  // 2. Ativa a página inicial (teoria + como usar + créditos visíveis juntos)
  showSection('teoria');

  // 3. Liga começa na tela home — dataset carrega ao iniciar cada round
  state._initialized = true;

});
