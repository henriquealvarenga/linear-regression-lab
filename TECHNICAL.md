# Linear Regression Lab — Documentação Técnica

> **Audiência:** desenvolvedor que precisa entender, manter ou estender o código.  
> **Stack:** JavaScript vanilla · D3.js v7 · HTML5 Canvas · CSS puro · GitHub Pages  
> **DOI:** [10.5281/zenodo.19650334](https://doi.org/10.5281/zenodo.19650334)

---

## 1. Visão Geral

O Linear Regression Lab é uma aplicação web de página única (SPA) sem framework, sem bundler e sem dependências NPM. Todo o código roda diretamente no navegador via `file://` ou qualquer servidor estático. A única dependência externa é o D3.js v7, carregado via CDN.

A aplicação tem duas "páginas" principais:

| Página | Descrição |
|---|---|
| **Teoria** | Hero + cards conceituais + Como Usar + Créditos — rola como uma página longa |
| **Atividade** | O jogo em si — 7 rounds sequenciais com quiz entre eles |

---

## 2. Estrutura de Arquivos

```
LinearRegression/
├── index.html          # Estrutura HTML completa + todas as telas do jogo
├── styles.css          # Todos os estilos (sem pré-processador)
└── js/
    ├── math.js         # Funções matemáticas puras (OLS, RSS, RNG)
    ├── state.js        # Estado global compartilhado
    ├── datasets.js     # Definição dos 7 datasets clínicos
    ├── quiz.js         # Banco de perguntas (6 transições × 4 perguntas)
    ├── plot.js         # Visualização D3: scatter plot, reta, resíduos
    ├── heatmap.js      # Paisagem do RSS (heatmap de parâmetros)
    ├── game.js         # Motor do jogo: rounds, timer, quiz, pontuação
    ├── screens.js      # Navegação entre seções (teoria ↔ atividade)
    └── app.js          # Ponto de entrada — DOMContentLoaded
```

### Ordem de carregamento (importa — sem módulos ES)

```
d3 (CDN) → math.js → state.js → datasets.js → quiz.js
         → plot.js → heatmap.js → game.js → screens.js → app.js
```

Cada arquivo assume que os anteriores já foram carregados. Não há `import`/`export` — tudo vive no escopo global `window`.

---

## 3. Módulo `math.js` — Funções Matemáticas Puras

Nenhuma dependência. Todas as funções são puras (sem efeitos colaterais).

### `seededRNG(seed)`

Gerador de números pseudoaleatórios determinístico baseado em LCG (Linear Congruential Generator).

```js
function seededRNG(seed) {
  let s = seed;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    //   ↑ os parênteses externos são críticos:
    //     sem eles, >>> 0 aplica-se só à constante, não à soma
    return s / 0xFFFFFFFF;
  };
}
```

**Atenção:** o `>>> 0` deve envolver toda a expressão `Math.imul(...) + 1013904223`. Erro clássico: escrever sem os parênteses externos faz o operador de precedência errada.

### `generatePoints(n, xMin, xMax, fn, noise, seed)`

Gera `n` pontos `{x, y}` onde `y = fn(x) + ruído`. Usa `seededRNG` para que o mesmo seed sempre produza os mesmos pontos.

### `olsFit(pts)`

Regressão OLS em passagem única pelos dados (sem D3, sem bibliotecas).

```
β₁ = Σ[(xᵢ − x̄)(yᵢ − ȳ)] / Σ[(xᵢ − x̄)²]
β₀ = ȳ − β₁ · x̄
```

Retorna `{ slope, intercept }`.

### `rss(pts, slope, intercept)`

Soma dos quadrados dos resíduos: `Σ (yᵢ − ŷᵢ)²`

### `rSquared(pts, slope, intercept, precomputedRSS?)`

R² = 1 − RSS/TSS. O quarto parâmetro opcional evita recalcular o RSS quando ele já foi calculado (otimização de performance durante drag).

---

## 4. Módulo `state.js` — Estado Global

Um único objeto `state` acessível por todos os módulos.

```js
const state = {
  // Dataset
  dsIdx: 0,           // índice do dataset atual (0–6)
  pts: [],            // array de pontos {x, y} gerados

  // Reta do usuário
  slope: 0,           // β₁ atual (controlado pelo drag)
  intercept: 0,       // β₀ atual (controlado pelo drag)

  // Solução OLS
  solSlope: 0,        // β₁ ótimo calculado pelo OLS
  solIntercept: 0,    // β₀ ótimo

  showSolution: false, // se true, desenha a reta verde OLS

  // Heatmap
  heatmapOpen: false,
  baseHeatmapImage: null, // ImageData cacheada (sem o ponto branco)
  hmMeta: null,           // { sMin, sMax, bMin, bMax, cW, cH }

  // Cache de performance
  currentRSS: null,   // RSS calculado em updateStats(), relido em updatePlayHeader()
                      // evita recomputar a cada frame de drag

  // Jogo
  challenge: {
    active: false,
    timer: null,
    initRSS: null   // RSS da reta horizontal inicial (base para cálculo de % do ótimo)
  },

  _initialized: false  // garante que initPlot() roda apenas uma vez
};
```

**Regra:** nenhum módulo deve criar variáveis globais de estado fora deste objeto. Se precisar de novo estado persistente, adicione aqui com comentário explicativo.

---

## 5. Módulo `datasets.js` — Os 7 Datasets

Array `DATASETS` com a definição de cada round.

### Estrutura de um dataset

```js
{
  id: 0,                    // índice (0–6)
  icon: '😴',               // emoji do round
  title: 'Sono × Cognição', // nome exibido
  xLabel: 'Horas de Sono',  // rótulo do eixo X
  yLabel: 'Score Cognitivo',// rótulo do eixo Y
  desc: '...',              // texto do briefing
  fn: x => 8*x + 20,       // função verdadeira (sem ruído)
  noise: 8,                 // desvio-padrão do ruído gaussiano
  n: 20,                    // número de pontos
  seed: 42,                 // seed inicial para o RNG
  xMin: 4, xMax: 10,        // domínio X
  yMin: 40, yMax: 120,      // domínio Y
  difficulty: 1,            // 1–4 (exibido como estrelas)
  timeLimit: 25,            // segundos por round
  hint: '...',              // dica opcional no briefing
  postProcess: null         // função opcional para modificar pontos gerados
                            // ex: forçar outliers no Round 3
}
```

### Seeds e `_currentSeeds` (em `plot.js`)

O array `DATASETS` nunca é mutado. Em `plot.js` existe:

```js
const _currentSeeds = DATASETS.map(ds => ds.seed);
```

Quando o jogador clica em "Novo Dataset" (botão de variação), `newData()` avança apenas `_currentSeeds[idx]`, preservando o array original para reinicialização limpa ao começar um novo jogo.

### Como adicionar um novo dataset

1. Adicione um objeto ao array `DATASETS` em `datasets.js`
2. Defina `id`, `icon`, `title`, `fn`, `noise`, `n`, `seed`, `xMin/xMax`, `yMin/yMax`, `difficulty`, `timeLimit`
3. Em `index.html`, adicione um `<div class="liga-round-item">` correspondente na tela home
4. Em `quiz.js`, adicione um array de 4 perguntas em `QUIZ[<novo_índice - 1>]` (quiz roda entre rounds, não há quiz após o último round)
5. Atualize o texto "Máximo: X pts" na tela home (150 pts × número de rounds)

---

## 6. Módulo `quiz.js` — Banco de Perguntas

Estrutura: `QUIZ[transição][pergunta]`

```js
const QUIZ = [
  // QUIZ[0]: perguntas exibidas após o Round 1 (transição 1→2)
  [
    {
      q: 'Texto da pergunta',
      opts: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      answer: 1,          // índice da resposta correta (0-based)
      feedback: 'Explicação exibida após responder (certa ou errada)'
    },
    // ... mais 3 perguntas
  ],
  // QUIZ[1]: após Round 2 ... QUIZ[5]: após Round 6
];
```

São 6 transições × 4 perguntas = 24 perguntas no total. Não há quiz após o Round 7 (último).

---

## 7. Módulo `plot.js` — Visualização D3

### Constantes de layout

```js
const MARGIN = { top: 22, right: 22, bottom: 50, left: 58 };
const SVG_W = 520, SVG_H = 370;
const IW = SVG_W - MARGIN.left - MARGIN.right;  // largura interna
const IH = SVG_H - MARGIN.top  - MARGIN.bottom; // altura interna
```

### Grupos D3 (camadas — ordem importa)

```
gGrid       // grade de fundo (linhas horizontais e verticais)
gClipped    // grupo com clipPath (tudo dentro do domínio do plot)
  gResiduals  // segmentos laranjas (resíduos)
  gSolLine    // reta verde OLS (opcional)
  gUserLine   // reta azul do usuário + handles
  gPoints     // círculos dos dados
gXAxis      // eixo X
gYAxis      // eixo Y
```

### Escalas

`xSc` e `ySc` são D3 linear scales. São declaradas com `let` no escopo do módulo e atualizadas a cada `initDataset()`. O `heatmap.js` as lê diretamente.

### Fluxo de renderização

```
initDataset(idx)
  └─ generatePoints() → state.pts
  └─ olsFit()         → state.solSlope, state.solIntercept
  └─ updateScales()   → xSc, ySc
  └─ renderAll()
       ├─ renderPoints()     — join D3 com animação de entrada
       ├─ renderLine()       — desenha reta + handles de drag
       ├─ renderResiduals()  — segmentos laranja
       └─ updateStats()      — RSS, R², barra de progresso
```

### `onLineMoved()` — chamado a cada frame de drag

```
onLineMoved()
  ├─ updateLineVisuals()   — reposiciona reta e handles (sem re-join D3)
  ├─ renderResiduals()     — atualiza y2 de todos os segmentos
  ├─ updateStats()         — recalcula RSS → state.currentRSS
  └─ throttledHeatmapDot() — atualiza ponto no heatmap (throttle 50ms)
```

### `renderResiduals()` — padrão D3 join correto

```js
gResiduals.selectAll('line')
  .data(state.pts)
  .join(
    enter => enter.append('line').attr('class', 'residual-line'),
    update => update
  )
  // TODAS as posições no merged selection — crítico para troca de dataset
  .attr('x1', d => xSc(d.x))
  .attr('x2', d => xSc(d.x))
  .attr('y1', d => ySc(d.y))
  .attr('y2', d => ySc(state.slope * d.x + state.intercept));
```

**Armadilha:** nunca mova `x1`, `x2` ou `y1` para o `enter` path. Se fizer isso, ao trocar de dataset os elementos reaproveitados pelo D3 via `update` ficam com as coordenadas antigas (bug visual: linhas laranjas fora do lugar).

---

## 8. Módulo `heatmap.js` — Paisagem do RSS

Renderiza um canvas 2D com uma grade N×N de valores RSS coloridos na escala Plasma (matplotlib).

### Cache de performance

`buildHeatmap()` é caro (N=80, 6400 avaliações de RSS). Por isso:

1. Calcula e renderiza a grade completa
2. Salva `state.baseHeatmapImage` (ImageData sem o ponto branco do usuário)
3. `drawHeatmapDot()` restaura a imagem cacheada e apenas redesenha o ponto — operação rápida

`_legendBuilt` garante que a barra de legenda lateral seja construída apenas uma vez por sessão.

### `plasmaColor(t)`

Interpola entre 8 stops fixos da paleta Plasma. `t=0` → roxo escuro (RSS baixo, bom ajuste). `t=1` → amarelo claro (RSS alto).

---

## 9. Módulo `game.js` — Motor do Jogo

### Objeto `liga`

Estado do jogo atual (reiniciado a cada `startLiga()`):

```js
const liga = {
  round: 0,               // round atual 0-indexed (0–6)
  scores: [],             // pontuação de cada round já concluído
  totalScore: 0,
  timer: null,            // referência do setInterval do cronômetro
  secsLeft: 0,            // segundos restantes no round atual
  timeLimit: 15,          // tempo limite do round atual (varia por dataset)
  active: false,          // true somente durante um round em andamento
  quizQ: 0,               // índice da pergunta atual no quiz (0–3)
  lastAnswerCorrect: false // controla o botão "Continuar →"
};
```

### Fluxo do jogo

```
startLiga()
  └─ showBriefing()
       └─ startRound()
            └─ [drag da reta pelo usuário / confirmRound() / timer esgota]
            └─ endRound()
                 └─ showRoundResult()
                      └─ afterRoundResult()
                           ├─ showQuizQuestion()  [rounds 1–6]
                           │    └─ answerQuiz() → quizContinue()
                           │         └─ [próxima pergunta ou próximo round]
                           └─ showFinalScore()    [após round 7]
```

### Sistema de pontuação

**Por round (máximo 150 pts):**

```
base        = (1 − (RSS_usuário − RSS_OLS) / (RSS_inicial − RSS_OLS)) × 100
            → clamped em [0, 100]

speedBonus  = (secsLeft / timeLimit) × 50 × (base / 100)
            → só existe se o usuário confirmou antes do tempo

roundScore  = base + speedBonus
```

- `RSS_inicial` é o RSS da reta horizontal na média de Y — calculado em `startRound()` e armazenado em `state.challenge.initRSS`
- `RSS_OLS` é calculado no momento de `endRound()`

**Total máximo:** 7 rounds × 150 pts = **1050 pts**

### Easter egg

`_eeClicks` conta cliques no logo `7️⃣` da home. 7 cliques em até 3 segundos entre cada clique abre o modal. O timer reseta se o intervalo entre cliques exceder 3 segundos.

---

## 10. Módulo `screens.js` — Navegação

```js
function showSection(id) {
  // 'teoria' | 'como-usar' | 'creditos' → ativa as três seções juntas
  // 'atividade' → ativa apenas o jogo
}
```

**Por que as três seções?** `sec-teoria`, `sec-como-usar` e `sec-creditos` são irmãs no DOM (não aninhadas). Quando ativas simultaneamente com `display: block`, fluem uma após a outra formando uma única página longa. `sec-atividade` (com `display: none`) no meio não ocupa espaço visual.

---

## 11. Arquitetura CSS

### Ordem das seções em `styles.css`

1. Reset + variáveis globais (Inter, smooth scroll, scrollbar, ::selection)
2. Hero (partículas, ícone, título, divisória, botões CTA)
3. Teoria body (cards, fórmulas, CTA)
4. Atividade (tabs, main-card, sidebar, plot area)
5. Sidebar (sliders, stats, heatmap)
6. Telas do jogo (home, briefing, play, round-result, quiz, final)
7. Créditos e Como Usar
8. Easter egg modal
9. Footer

### Convenções

- **Classes de jogo** usam prefixo `liga-` (legado, não renomear sem testar tudo)
- **Resíduos** usam `.residual-line` via CSS (stroke, dasharray, opacity) — nunca via `.style()` no D3
- **Telas do jogo** usam `.game-screen` com `.active` para visibilidade
- **Responsividade** não está implementada (app otimizado para desktop)

---

## 12. Como Estender

### Adicionar um dataset (Round 8+)

1. `datasets.js` → adicionar objeto em `DATASETS`
2. `index.html` → adicionar `<div class="liga-round-item">` na home
3. `quiz.js` → adicionar `QUIZ[6]` com 4 perguntas (se não for o último round)
4. `index.html` → atualizar "Máximo: X pts"
5. `styles.css` → adicionar cor para `.liga-round-item:nth-child(N)`

### Alterar tempo limite

Cada dataset tem `timeLimit` em segundos. O `game.js` lê `DATASETS[liga.round].timeLimit` no início de cada round.

### Alterar o sistema de pontuação

A fórmula está em `endRound()` em `game.js` — variáveis `base` e `speedBonus`. O cap de 150 pts por round é implícito (base máx 100 + bônus máx 50).

### Adicionar perguntas ao quiz

Edite `QUIZ[transição]` em `quiz.js`. Cada elemento do array interno precisa de `q`, `opts` (array de 4 strings), `answer` (índice 0-based) e `feedback`.

---

## 13. Armadilhas Conhecidas

| Problema | Causa | Solução |
|---|---|---|
| Linhas laranjas fora do lugar ao trocar dataset | `x1/y1` no `enter` path do D3 | Manter todos os atributos posicionais no merged selection |
| RNG produz sequências diferentes | Parênteses errados no LCG | `(Math.imul(...) + K) >>> 0` — parênteses externos obrigatórios |
| Heatmap não atualiza ao trocar dataset | Cache `baseHeatmapImage` obsoleto | `initDataset()` já reseta `state.baseHeatmapImage = null` |
| Timer vaza entre rounds | `clearInterval` não chamado | `startLiga()` e `startRound()` chamam `clearInterval(liga.timer)` |
| Quiz começa na pergunta errada no segundo jogo | `liga.quizQ` não resetado | `startLiga()` reseta `liga.quizQ = 0` |
