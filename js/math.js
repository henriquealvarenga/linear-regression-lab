// ─────────────────────────────────────────────────────────────
//  math.js — Funções matemáticas puras (sem DOM, sem D3)
//  Analogia R: utils.R
// ─────────────────────────────────────────────────────────────

/**
 * Gerador de números pseudo-aleatórios com semente determinística.
 * Permite reproduzir os mesmos dados a cada execução.
 */
function seededRNG(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Gera n pontos (x, y) com ruído gaussiano aproximado.
 * @param {number} n        - número de pontos
 * @param {number} xMin     - mínimo de x
 * @param {number} xMax     - máximo de x
 * @param {Function} fn     - função verdadeira y = fn(x)
 * @param {number} noise    - desvio padrão aproximado do ruído
 * @param {number} seed     - semente para reprodutibilidade
 */
function generatePoints(n, xMin, xMax, fn, noise, seed) {
  const rng = seededRNG(seed);
  return Array.from({ length: n }, () => {
    const x = xMin + (xMax - xMin) * rng();
    const y = fn(x) + noise * (rng() - 0.5) * 3.46; // std ≈ noise
    return { x: +x.toFixed(2), y: +y.toFixed(2) };
  });
}

/**
 * Ajuste OLS (Mínimos Quadrados Ordinários).
 * Passagem única: calcula médias e acumula numerador/denominador juntos.
 * Retorna { slope: β₁, intercept: β₀ }.
 */
function olsFit(pts) {
  const n = pts.length;
  let sumX = 0, sumY = 0;
  for (const d of pts) { sumX += d.x; sumY += d.y; }
  const mx = sumX / n;
  const my = sumY / n;
  let num = 0, den = 0;
  for (const d of pts) {
    const dx = d.x - mx;
    num += dx * (d.y - my);
    den += dx * dx;
  }
  const slope     = num / den;
  const intercept = my - slope * mx;
  return { slope, intercept };
}

/**
 * Soma dos Quadrados dos Resíduos (RSS).
 * Quanto menor, melhor o ajuste.
 */
function rss(pts, slope, intercept) {
  let sum = 0;
  for (const d of pts) {
    const e = d.y - (slope * d.x + intercept);
    sum += e * e;
  }
  return sum;
}

/**
 * Coeficiente de Determinação R².
 * Proporção da variância de y explicada pelo modelo.
 * R² = 1 - RSS / TSS
 *
 * @param {number} [precomputedRSS] - RSS já calculado (evita recomputar).
 */
function rSquared(pts, slope, intercept, precomputedRSS) {
  let sumY = 0;
  for (const d of pts) sumY += d.y;
  const yMean = sumY / pts.length;
  let tss = 0;
  for (const d of pts) {
    const dy = d.y - yMean;
    tss += dy * dy;
  }
  if (tss === 0) return 1;
  const r = precomputedRSS !== undefined ? precomputedRSS
                                         : rss(pts, slope, intercept);
  return 1 - r / tss;
}
