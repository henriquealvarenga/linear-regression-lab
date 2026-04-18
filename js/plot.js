// ─────────────────────────────────────────────────────────────
//  plot.js — Visualização D3: scatter plot, reta, resíduos
//  Analogia R: plots.R
// ─────────────────────────────────────────────────────────────

// ── Constantes do layout SVG ──────────────────────────────────
const MARGIN = { top: 22, right: 22, bottom: 50, left: 58 };

// Seeds correntes por dataset — começa com as originais de datasets.js
// Usar um array separado evita mutar DATASETS ao chamar newData()
const _currentSeeds = DATASETS.map(ds => ds.seed);
const SVG_W  = 520, SVG_H = 370;
const IW     = SVG_W - MARGIN.left - MARGIN.right;
const IH     = SVG_H - MARGIN.top  - MARGIN.bottom;

// ── Referências D3 (inicializadas em initPlot) ────────────────
let gGrid, gClipped, gResiduals, gSolLine, gUserLine, gPoints;
let gXAxis, gYAxis, xLabel, yLabel;
let xSc, ySc;  // escalas atuais (exportadas para heatmap.js)

/**
 * Configura o SVG e todos os grupos D3.
 * Deve ser chamado UMA vez, após o DOM estar pronto.
 */
function initPlot() {
  const svg = d3.select('#mainSvg').attr('viewBox', `0 0 ${SVG_W} ${SVG_H}`);

  svg.append('defs').append('clipPath').attr('id', 'plotClip')
     .append('rect').attr('width', IW).attr('height', IH);

  const root = svg.append('g')
    .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  // Ordem das camadas (painters model do SVG)
  gGrid      = root.append('g');
  gClipped   = root.append('g').attr('clip-path', 'url(#plotClip)');
  gResiduals = gClipped.append('g');
  gSolLine   = gClipped.append('g');
  gUserLine  = gClipped.append('g');
  gPoints    = gClipped.append('g');
  gXAxis     = root.append('g').attr('transform', `translate(0,${IH})`);
  gYAxis     = root.append('g');

  xLabel = root.append('text')
    .attr('text-anchor', 'middle').attr('x', IW / 2).attr('y', IH + 44)
    .style('font-size', '11px').style('fill', '#64748b');

  yLabel = root.append('text')
    .attr('text-anchor', 'middle')
    .attr('transform', `translate(-44,${IH / 2}) rotate(-90)`)
    .style('font-size', '11px').style('fill', '#64748b');
}

// ─────────────────────────────────────────────────────────────
//  INICIALIZAR DATASET
// ─────────────────────────────────────────────────────────────

function initDataset(idx) {
  state.dsIdx       = idx;
  state.showSolution = false;

  const ds  = DATASETS[idx];
  let   pts = generatePoints(ds.n, ds.xMin, ds.xMax, ds.fn, ds.noise, _currentSeeds[idx]);
  if (ds.postProcess) pts = ds.postProcess(pts);
  state.pts = pts;

  const ols         = olsFit(pts);
  state.solSlope    = ols.slope;
  state.solIntercept = ols.intercept;

  // Reta inicial: horizontal na média de y
  const ym      = d3.mean(pts, d => d.y);
  state.slope    = 0;
  state.intercept = ym;

  // Escalas
  const xPad = (ds.xMax - ds.xMin) * 0.07;
  const yPad = (ds.yMax - ds.yMin) * 0.09;
  xSc = d3.scaleLinear().domain([ds.xMin - xPad, ds.xMax + xPad]).range([0, IW]);
  ySc = d3.scaleLinear().domain([ds.yMin - yPad, ds.yMax + yPad]).range([IH, 0]);

  // Eixos
  gXAxis.transition().duration(350)
    .call(d3.axisBottom(xSc).ticks(6).tickFormat(d3.format('.3~g')));
  gYAxis.transition().duration(350)
    .call(d3.axisLeft(ySc).ticks(6).tickFormat(d3.format('.3~g')));

  xLabel.text(ds.xLabel);
  yLabel.text(ds.yLabel);

  // Grade
  gGrid.selectAll('*').remove();
  gGrid.selectAll('.gy').data(ySc.ticks(6)).join('line')
    .attr('class', 'gy')
    .attr('x1', 0).attr('x2', IW)
    .attr('y1', d => ySc(d)).attr('y2', d => ySc(d))
    .style('stroke', '#f1f5f9').style('stroke-width', 1);
  gGrid.selectAll('.gx').data(xSc.ticks(6)).join('line')
    .attr('class', 'gx')
    .attr('x1', d => xSc(d)).attr('x2', d => xSc(d))
    .attr('y1', 0).attr('y2', IH)
    .style('stroke', '#f1f5f9').style('stroke-width', 1);

  // Reset UI
  const dsDsc = document.getElementById('dsDescription');
  if (dsDsc) dsDsc.textContent = ds.desc;

  document.querySelectorAll('.dataset-tab')
    .forEach((t, i) => t.classList.toggle('active', i === idx));

  const panel  = document.getElementById('solutionPanel');
  const btnSol = document.getElementById('btnSolution');
  if (panel)  panel.style.display = 'none';
  if (btnSol) {
    btnSol.textContent = '✨ Mostrar Solução Ótima';
    btnSol.className   = 'btn btn-outline';
  }
  gSolLine.selectAll('*').remove();

  // Reset cache do heatmap
  state.baseHeatmapImage = null;
  state.hmMeta           = null;
  if (state.heatmapOpen) scheduleHeatmap();

  resetChallenge();
  renderAll();
}

// ─────────────────────────────────────────────────────────────
//  RENDERIZAÇÃO
// ─────────────────────────────────────────────────────────────

function renderAll() {
  renderPoints();
  renderLine();
  renderResiduals();
  updateStats();
}

function renderPoints() {
  gPoints.selectAll('circle')
    .data(state.pts)
    .join(
      e => e.append('circle')
        .attr('r', 0).attr('fill', '#1e293b')
        .attr('stroke', 'white').attr('stroke-width', 2).attr('opacity', 0.82)
        .call(s => s.transition().duration(380)
          .attr('r', 5)
          .attr('cx', d => xSc(d.x))
          .attr('cy', d => ySc(d.y))),
      u => u.transition().duration(350)
        .attr('cx', d => xSc(d.x))
        .attr('cy', d => ySc(d.y)),
      x => x.transition().duration(200).attr('r', 0).remove()
    );
}

function renderResiduals() {
  // A classe CSS é atribuída apenas no enter (elemento novo).
  // Todas as posições (x1, x2, y1, y2) são aplicadas à seleção mesclada
  // para garantir atualização correta ao trocar de dataset.
  gResiduals.selectAll('line')
    .data(state.pts)
    .join(
      enter => enter.append('line').attr('class', 'residual-line'),
      update => update
    )
    .attr('x1', d => xSc(d.x))
    .attr('x2', d => xSc(d.x))
    .attr('y1', d => ySc(d.y))
    .attr('y2', d => ySc(state.slope * d.x + state.intercept));
}

function renderLine() {
  const [x0, x1] = xSc.domain();
  const y0 = state.slope * x0 + state.intercept;
  const y1 = state.slope * x1 + state.intercept;

  gUserLine.selectAll('*').remove();

  // Área de arraste (invisível, larga — fácil de clicar)
  gUserLine.append('line')
    .attr('x1', xSc(x0)).attr('y1', ySc(y0))
    .attr('x2', xSc(x1)).attr('y2', ySc(y1))
    .style('stroke', 'transparent').style('stroke-width', 18)
    .style('cursor', 'ns-resize')
    .call(d3.drag()
      .on('start', function(ev) {
        this._y0 = ySc.invert(ev.y);
        this._b0 = state.intercept;
      })
      .on('drag', function(ev) {
        const dy = ySc.invert(ev.y) - this._y0;
        state.intercept = this._b0 + dy;
        onLineMoved();
      }));

  // Reta visível
  gUserLine.append('line')
    .attr('class', 'user-line-vis')
    .attr('x1', xSc(x0)).attr('y1', ySc(y0))
    .attr('x2', xSc(x1)).attr('y2', ySc(y1))
    .style('stroke', '#2563eb').style('stroke-width', 2.5)
    .style('pointer-events', 'none');

  // Handle esquerdo (gira a reta)
  gUserLine.append('circle').attr('class', 'lh')
    .attr('cx', xSc(x0)).attr('cy', ySc(y0)).attr('r', 9)
    .style('fill', '#2563eb').style('stroke', 'white').style('stroke-width', 2.5)
    .style('cursor', 'ns-resize')
    .call(d3.drag()
      .on('start', function() {
        this._fixedY1 = state.slope * x1 + state.intercept;
      })
      .on('drag', function(ev) {
        const newY0     = ySc.invert(ev.y);
        state.slope     = (this._fixedY1 - newY0) / (x1 - x0);
        state.intercept = newY0 - state.slope * x0;
        onLineMoved();
      }));

  // Handle direito (gira a reta)
  gUserLine.append('circle').attr('class', 'rh')
    .attr('cx', xSc(x1)).attr('cy', ySc(y1)).attr('r', 9)
    .style('fill', '#2563eb').style('stroke', 'white').style('stroke-width', 2.5)
    .style('cursor', 'ns-resize')
    .call(d3.drag()
      .on('start', function() {
        this._fixedY0 = state.slope * x0 + state.intercept;
      })
      .on('drag', function(ev) {
        const newY1     = ySc.invert(ev.y);
        state.slope     = (newY1 - this._fixedY0) / (x1 - x0);
        state.intercept = this._fixedY0 - state.slope * x0;
        onLineMoved();
      }));
}

function updateLineVisuals() {
  const [x0, x1] = xSc.domain();
  const y0 = state.slope * x0 + state.intercept;
  const y1 = state.slope * x1 + state.intercept;

  gUserLine.select('.user-line-vis')
    .attr('x1', xSc(x0)).attr('y1', ySc(y0))
    .attr('x2', xSc(x1)).attr('y2', ySc(y1));
  gUserLine.select('.lh').attr('cx', xSc(x0)).attr('cy', ySc(y0));
  gUserLine.select('.rh').attr('cx', xSc(x1)).attr('cy', ySc(y1));
  gUserLine.select('line')  // hit area
    .attr('x1', xSc(x0)).attr('y1', ySc(y0))
    .attr('x2', xSc(x1)).attr('y2', ySc(y1));
}

/** Chamado a cada movimento da reta — atualiza visuais e stats. */
function onLineMoved() {
  updateLineVisuals();
  renderResiduals();
  updateStats();
  // Atualiza ponto no heatmap se estiver aberto (definido em heatmap.js)
  if (state.heatmapOpen && state.baseHeatmapImage) throttledHeatmapDot();
}

// ─────────────────────────────────────────────────────────────
//  PAINEL DE ESTATÍSTICAS
// ─────────────────────────────────────────────────────────────

function updateStats() {
  // RSS calculado uma vez e cacheado — rSquared e updatePlayHeader reutilizam.
  const r  = rss(state.pts, state.slope, state.intercept);
  const r2 = rSquared(state.pts, state.slope, state.intercept, r);
  state.currentRSS = r;

  const el = id => document.getElementById(id);

  if (el('valSlope'))     el('valSlope').textContent     = state.slope.toFixed(4);
  if (el('valIntercept')) el('valIntercept').textContent = state.intercept.toFixed(4);
  if (el('valRSS'))       el('valRSS').textContent       = r.toFixed(2);
  if (el('valR2'))        el('valR2').textContent        = r2.toFixed(4);

  // Barra de progresso (modo Liga e desafio)
  const ch = state.challenge;
  if (ch.initRSS !== null) {
    const solR = rss(state.pts, state.solSlope, state.solIntercept);
    const pct  = Math.max(0, Math.min(100,
      100 * (1 - (r - solR) / (ch.initRSS - solR))));
    const bar  = el('progBar');
    if (bar) bar.style.width = pct + '%';
    if (ch.active && el('scoreLive'))
      el('scoreLive').textContent = `RSS: ${r.toFixed(1)}  |  Progresso: ${pct.toFixed(0)}%`;
  }
}

// ─────────────────────────────────────────────────────────────
//  SOLUÇÃO ÓTIMA
// ─────────────────────────────────────────────────────────────

function toggleSolution() {
  state.showSolution = !state.showSolution;
  const panel  = document.getElementById('solutionPanel');
  const btn    = document.getElementById('btnSolution');

  if (state.showSolution) {
    const [x0, x1] = xSc.domain();
    gSolLine.selectAll('*').remove();
    gSolLine.append('line')
      .attr('x1', xSc(x0))
      .attr('y1', ySc(state.solSlope * x0 + state.solIntercept))
      .attr('x2', xSc(x1))
      .attr('y2', ySc(state.solSlope * x1 + state.solIntercept))
      .style('stroke', '#059669').style('stroke-width', 2.5)
      .style('stroke-dasharray', '7,4').style('opacity', 0.85)
      .style('pointer-events', 'none');

    if (document.getElementById('solSlope'))
      document.getElementById('solSlope').textContent = state.solSlope.toFixed(4);
    if (document.getElementById('solIntercept'))
      document.getElementById('solIntercept').textContent = state.solIntercept.toFixed(4);
    if (document.getElementById('solRSS'))
      document.getElementById('solRSS').textContent =
        rss(state.pts, state.solSlope, state.solIntercept).toFixed(2);

    if (panel)  panel.style.display = 'block';
    if (btn) { btn.textContent = '🙈 Ocultar Solução'; btn.className = 'btn btn-outline active'; }
  } else {
    gSolLine.selectAll('*').remove();
    if (panel)  panel.style.display = 'none';
    if (btn) { btn.textContent = '✨ Mostrar Solução Ótima'; btn.className = 'btn btn-outline'; }
  }
}

// ─────────────────────────────────────────────────────────────
//  NOVOS DADOS
// ─────────────────────────────────────────────────────────────

function newData() {
  // Avança a seed corrente sem mutar o array DATASETS original
  _currentSeeds[state.dsIdx] = (_currentSeeds[state.dsIdx] * 7 + 13) % 99991 + 1;
  initDataset(state.dsIdx);
}
