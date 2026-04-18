// ─────────────────────────────────────────────────────────────
//  heatmap.js — Paisagem do RSS (espaço de parâmetros)
//  Futuro: animação do gradiente descendente aqui
// ─────────────────────────────────────────────────────────────

let hmDotTimer    = null;
let _legendBuilt  = false;

function toggleHeatmap() {
  if (typeof liga !== 'undefined' && liga.active) return; // bloqueado durante round
  state.heatmapOpen = !state.heatmapOpen;
  document.getElementById('heatmapHeader')
    .classList.toggle('open', state.heatmapOpen);
  document.getElementById('heatmapBody')
    .classList.toggle('open', state.heatmapOpen);
  document.getElementById('heatmapToggle').textContent =
    state.heatmapOpen ? '▲ Ocultar' : '▼ Mostrar';

  if (state.heatmapOpen) scheduleHeatmap();
}

function scheduleHeatmap() {
  setTimeout(buildHeatmap, 60);
}

/**
 * Constrói o heatmap do RSS no canvas.
 * Computa uma grade N×N de valores RSS e pinta com escala plasma.
 * Cacheia a imagem base (sem o ponto branco) para updates rápidos.
 */
function buildHeatmap() {
  const canvas = document.getElementById('heatmapCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cW  = canvas.width, cH = canvas.height;

  // Intervalo centrado na solução OLS
  const sC = state.solSlope,    bC = state.solIntercept;
  const sRange = Math.max(Math.abs(sC) * 2.5, 1.5);
  const bRange = Math.max(Math.abs(bC) * 0.45, 8);
  const sMin = sC - sRange, sMax = sC + sRange;
  const bMin = bC - bRange, bMax = bC + bRange;

  const N = 80;
  let rMin = Infinity, rMax = -Infinity;
  const grid = [];

  for (let row = 0; row < N; row++) {
    grid[row] = [];
    for (let col = 0; col < N; col++) {
      const s = sMin + (sMax - sMin) * col / (N - 1);
      const b = bMax - (bMax - bMin) * row / (N - 1); // topo = bMax
      const v = rss(state.pts, s, b);
      grid[row][col] = v;
      if (v < rMin) rMin = v;
      if (v > rMax) rMax = v;
    }
  }

  // Renderiza pixels com escala logarítmica (melhor contraste)
  const img    = ctx.createImageData(cW, cH);
  const logMin = Math.log1p(rMin), logMax = Math.log1p(rMax);

  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const t  = (Math.log1p(grid[row][col]) - logMin) / (logMax - logMin);
      const [r, g, b] = plasmaColor(t);
      const px = Math.floor(col * cW / N);
      const py = Math.floor(row * cH / N);
      const pw = Math.ceil(cW / N) + 1;
      const ph = Math.ceil(cH / N) + 1;
      for (let dy = 0; dy < ph && py + dy < cH; dy++) {
        for (let dx = 0; dx < pw && px + dx < cW; dx++) {
          const i = ((py + dy) * cW + (px + dx)) * 4;
          img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  // Salva metadados para updates do ponto
  state.hmMeta = { sMin, sMax, bMin, bMax, cW, cH };

  // Ponto verde = solução OLS
  const solPx = (state.solSlope     - sMin) / (sMax - sMin) * cW;
  const solPy = (1 - (state.solIntercept - bMin) / (bMax - bMin)) * cH;
  ctx.beginPath(); ctx.arc(solPx, solPy, 7, 0, 2 * Math.PI);
  ctx.fillStyle = '#10b981'; ctx.fill();
  ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'white'; ctx.font = 'bold 10px sans-serif';
  ctx.fillText('OLS', solPx + 9, solPy + 4);

  // Cacheia imagem base (com ponto OLS, sem ponto do usuário)
  state.baseHeatmapImage = ctx.getImageData(0, 0, cW, cH);

  // Labels dos eixos
  const el = id => document.getElementById(id);
  if (el('hmSlopeMin')) el('hmSlopeMin').textContent = sMin.toFixed(2);
  if (el('hmSlopeMax')) el('hmSlopeMax').textContent = sMax.toFixed(2);
  if (el('hmIntMin'))   el('hmIntMin').textContent   = bMin.toFixed(2);
  if (el('hmIntMax'))   el('hmIntMax').textContent   = bMax.toFixed(2);

  buildLegend();
  drawHeatmapDot();
}

/**
 * Atualiza apenas o ponto branco (posição atual do usuário).
 * Restaura imagem cacheada e redesenha o ponto — operação rápida.
 */
function drawHeatmapDot() {
  if (!state.baseHeatmapImage || !state.hmMeta) return;
  const { sMin, sMax, bMin, bMax, cW, cH } = state.hmMeta;
  const canvas = document.getElementById('heatmapCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  ctx.putImageData(state.baseHeatmapImage, 0, 0);

  const px = Math.max(0, Math.min(cW, (state.slope     - sMin) / (sMax - sMin) * cW));
  const py = Math.max(0, Math.min(cH, (1 - (state.intercept - bMin) / (bMax - bMin)) * cH));

  // Mira (crosshair)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, cH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(cW, py); ctx.stroke();
  ctx.setLineDash([]);

  // Ponto branco = posição atual
  ctx.beginPath(); ctx.arc(px, py, 7, 0, 2 * Math.PI);
  ctx.fillStyle = 'white'; ctx.fill();
  ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2; ctx.stroke();
}

/** Atualiza o ponto com throttle (50ms) para não sobrecarregar durante drag. */
function throttledHeatmapDot() {
  clearTimeout(hmDotTimer);
  hmDotTimer = setTimeout(drawHeatmapDot, 50);
}

/** Renderiza a barra de legenda de cores — executada apenas uma vez.
 *  A escala plasma é sempre a mesma, independente do dataset. */
function buildLegend() {
  if (_legendBuilt) return;
  const lc  = document.getElementById('legendCanvas');
  if (!lc) return;
  const ctx = lc.getContext('2d');
  for (let x = 0; x < 120; x++) {
    const [r, g, b] = plasmaColor(1 - x / 120); // esquerda=alto RSS, direita=baixo
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, 0, 1, 10);
  }
  _legendBuilt = true;
}

/**
 * Escala de cores Plasma (matplotlib).
 * t=0 → roxo escuro (RSS baixo, bom ajuste)
 * t=1 → amarelo claro (RSS alto, ajuste ruim)
 */
function plasmaColor(t) {
  const stops = [
    [13,   8, 135],
    [84,   2, 163],
    [139, 10, 165],
    [185, 50, 137],
    [219, 92, 104],
    [244,136,  73],
    [254,188,  43],
    [240,249,  33]
  ];
  const n = stops.length - 1;
  const i = Math.min(Math.floor(t * n), n - 1);
  const f = t * n - i;
  const a = stops[i], b = stops[i + 1];
  return [
    Math.round(a[0] + f * (b[0] - a[0])),
    Math.round(a[1] + f * (b[1] - a[1])),
    Math.round(a[2] + f * (b[2] - a[2]))
  ];
}
