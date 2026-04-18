// ─────────────────────────────────────────────────────────────
//  quiz.js — Perguntas do quiz entre rounds da Liga
//
//  Estrutura: 6 transições (entre 7 rounds) × 4 perguntas
//  Progressão: muito fácil → fácil → moderado → correlação r
//              → R² → pensamento crítico
//
//  Cada pergunta: { question, options[4], correct (0-indexed), feedback }
// ─────────────────────────────────────────────────────────────

const QUIZ = [

  // ── Transição 1 → 2 ─────────────────────────── muito fácil ──
  [
    {
      question: 'O que é uma reta de regressão?',
      options: [
        'Uma linha que passa exatamente por todos os pontos',
        'Uma linha que descreve a tendência geral dos dados',
        'Uma linha que liga o primeiro ao último ponto',
        'Uma linha horizontal na média de y'
      ],
      correct: 1,
      feedback: 'A reta de regressão não passa por todos os pontos — isso seria interpolação. Ela descreve a tendência geral e resume a relação entre x e y para o conjunto inteiro de dados.'
    },
    {
      question: 'Os segmentos laranjas no gráfico representam:',
      options: [
        'Os valores previstos pelo modelo',
        'A inclinação da reta',
        'Os resíduos — diferença entre o valor observado e o previsto',
        'Os outliers do dataset'
      ],
      correct: 2,
      feedback: 'Os segmentos laranjas são os resíduos: a distância vertical entre cada ponto observado e o valor previsto pela reta. Resíduos pequenos = bom ajuste. O objetivo é minimizá-los!'
    },
    {
      question: 'O que significa a sigla RSS?',
      options: [
        'Resultado da Soma Simples',
        'Razão entre Slope e Score',
        'Residual Sum of Squares — Soma dos Quadrados dos Resíduos',
        'Regressão por Soma de Segmentos'
      ],
      correct: 2,
      feedback: 'RSS = Residual Sum of Squares = Soma dos Quadrados dos Resíduos. É a principal medida de qualidade do ajuste em regressão linear — quanto menor, mais próxima a reta está dos dados.'
    },
    {
      question: 'O que acontece com o RSS quando você aproxima a reta dos pontos?',
      options: [
        'Aumenta',
        'Diminui',
        'Permanece igual',
        'Torna-se negativo'
      ],
      correct: 1,
      feedback: 'Quando a reta se aproxima dos pontos, os resíduos ficam menores — e como o RSS é a soma dos quadrados desses resíduos, ele também diminui. Minimizar o RSS é exatamente o objetivo do método dos mínimos quadrados!'
    }
  ],

  // ── Transição 2 → 3 ──────────────────────────────── fácil ──
  [
    {
      question: 'O intercepto β₀ de uma reta de regressão representa:',
      options: [
        'A inclinação da reta',
        'O valor médio de y',
        'O valor previsto de y quando x = 0',
        'O erro total do modelo'
      ],
      correct: 2,
      feedback: 'β₀ é onde a reta cruza o eixo y — o valor previsto de y quando x = 0. Atenção: em contextos clínicos, x = 0 muitas vezes não tem sentido prático (ex: 0 horas de sono, 0 mg de dose), então β₀ deve ser interpretado com cuidado.'
    },
    {
      question: 'A inclinação β₁ indica:',
      options: [
        'Onde a reta cruza o eixo y',
        'Quanto y muda a cada uma unidade de aumento em x',
        'O número de pontos no dataset',
        'O valor mínimo de y'
      ],
      correct: 1,
      feedback: 'β₁ (inclinação) indica a variação esperada em y para cada unidade de aumento em x. Se β₁ = 3, a cada 1 unidade a mais em x, y aumenta em média 3 unidades. É o coeficiente mais interpretável da regressão!'
    },
    {
      question: 'Se a inclinação β₁ é positiva, significa que:',
      options: [
        'Quando x aumenta, y tende a diminuir',
        'Quando x aumenta, y tende a aumentar',
        'Não há relação entre x e y',
        'O modelo está errado'
      ],
      correct: 1,
      feedback: 'Inclinação positiva significa relação direta: mais x → mais y. No Round 1 (sono × cognição), β₁ positivo indicou que dormir mais está associado a maior escore cognitivo — a reta sobe da esquerda para a direita.'
    },
    {
      question: 'No round anterior, β₁ foi negativo. Isso indica que mais exercício está associado a:',
      options: [
        'Maior glicemia',
        'Menor glicemia',
        'Nenhuma mudança na glicemia',
        'Glicemia negativa'
      ],
      correct: 1,
      feedback: 'β₁ negativo indica relação inversa: quando x sobe, y cai. No Round 2, mais exercício aeróbico → menor glicemia em jejum. Isso tem base fisiológica: o exercício aumenta a sensibilidade à insulina e facilita a captação de glicose pelos músculos.'
    }
  ],

  // ── Transição 3 → 4 ──────────────────────────── moderado ──
  [
    {
      question: 'O RSS é calculado como:',
      options: [
        'Soma simples dos resíduos',
        'Média dos valores de y',
        'Soma dos quadrados dos resíduos',
        'Diferença entre o maior e o menor resíduo'
      ],
      correct: 2,
      feedback: 'RSS = Σ(yᵢ − ŷᵢ)² — somamos o quadrado de cada resíduo. Isso é diferente de simplesmente somar os resíduos, pois resíduos positivos e negativos não se cancelariam, e erros grandes seriam penalizados de forma desproporcional.'
    },
    {
      question: 'Por que o método dos mínimos quadrados eleva os resíduos ao quadrado antes de somar?',
      options: [
        'Para facilitar o cálculo manual',
        'Para penalizar erros grandes mais do que erros pequenos e evitar cancelamento de sinais',
        'Para que a soma seja sempre igual a 1',
        'É uma convenção sem justificativa matemática'
      ],
      correct: 1,
      feedback: 'Elevar ao quadrado faz duas coisas importantes: (1) elimina o sinal — resíduos positivos e negativos não se cancelam; (2) penaliza erros grandes desproporcionalmente — um resíduo de 10 contribui 100 para o RSS, enquanto um resíduo de 1 contribui apenas 1.'
    },
    {
      question: 'O que é um outlier?',
      options: [
        'Um ponto que está exatamente sobre a reta',
        'O ponto com maior valor de x',
        'Um ponto muito distante do padrão geral dos demais',
        'O ponto com menor valor de y'
      ],
      correct: 2,
      feedback: 'Outliers são observações que se afastam muito do padrão geral dos dados. Podem ser erros de medição, casos clinicamente raros (como hipertensos graves não tratados no Round 3) ou simplesmente variabilidade natural extrema. Identificá-los é fundamental antes de qualquer análise.'
    },
    {
      question: 'Os outliers no Round 3 (IMC × Pressão) afetaram a reta porque:',
      options: [
        'O modelo os ignorou automaticamente',
        'Eles puxaram a reta em direção a si, distorcendo o ajuste',
        'Reduziram o RSS',
        'Aumentaram o R²'
      ],
      correct: 1,
      feedback: 'O método dos mínimos quadrados penaliza erros grandes — então pontos distantes têm influência desproporcional na reta. Outliers "puxam" a reta em direção a si, distorcendo o ajuste para os demais pontos. Por isso existem métodos de regressão robusta que reduzem esse efeito.'
    }
  ],

  // ── Transição 4 → 5 ─────────────────── correlação de Pearson ──
  [
    {
      question: 'O que o coeficiente r de Pearson mede?',
      options: [
        'A inclinação da reta de regressão',
        'A força e a direção da associação linear entre x e y',
        'O erro médio absoluto do modelo',
        'O número de outliers no dataset'
      ],
      correct: 1,
      feedback: 'r de Pearson mede a força e a direção da associação linear: varia de −1 a +1. r = +1 é correlação positiva perfeita; r = −1 é correlação negativa perfeita; r próximo de 0 indica ausência de associação linear. É um dos indicadores mais usados em pesquisa clínica.'
    },
    {
      question: 'Um coeficiente r negativo indica que:',
      options: [
        'Não há associação entre x e y',
        'Quando x aumenta, y tende a diminuir',
        'O modelo tem erros negativos',
        'β₀ é negativo'
      ],
      correct: 1,
      feedback: 'r negativo indica relação inversa: quando x sobe, y tende a cair — e a reta desce da esquerda para a direita. No Round 2 (exercício × glicemia), o r seria negativo: mais exercício está associado a menor glicemia.'
    },
    {
      question: 'r = 0 indica que:',
      options: [
        'O RSS é zero',
        'Não há absolutamente nenhuma relação entre x e y',
        'Não há associação linear — mas pode existir uma relação não-linear',
        'β₁ = 1'
      ],
      correct: 2,
      feedback: 'Cuidado: r = 0 significa ausência de correlação *linear* — mas pode existir uma relação não-linear forte. Por exemplo, uma parábola simétrica tem r ≈ 0 apesar da relação clara. Sempre visualize os dados antes de concluir que não há associação!'
    },
    {
      question: 'Qual valor de r indica a associação linear mais fraca?',
      options: [
        'r = −0,85',
        'r = +0,72',
        'r = −0,15',
        'r = +0,60'
      ],
      correct: 2,
      feedback: 'A força da correlação depende do valor absoluto |r|. Quanto mais próximo de 0, mais fraca a associação, independente do sinal. Aqui: |−0,85| = 0,85; |+0,72| = 0,72; |−0,15| = 0,15; |+0,60| = 0,60. O menor é |−0,15| = 0,15 — a associação mais fraca.'
    }
  ],

  // ── Transição 5 → 6 ─────────────────────────── R² ──────────
  [
    {
      question: 'O que R² (coeficiente de determinação) representa?',
      options: [
        'A inclinação da reta ao quadrado',
        'A proporção da variabilidade de y explicada pelo modelo linear',
        'O número de resíduos ao quadrado',
        'O valor máximo possível do RSS'
      ],
      correct: 1,
      feedback: 'R² mede a proporção da variabilidade total de y que é "explicada" pela relação linear com x. R² = 0,80 significa que 80% da variação de y está associada à variação em x — os outros 20% se devem a fatores não incluídos no modelo ou à variabilidade aleatória.'
    },
    {
      question: 'R² = 0,49 significa que:',
      options: [
        'O modelo erra 49% das vezes',
        '49% da variabilidade de y é explicada pelo modelo',
        'r de Pearson é igual a 0,49',
        'β₁² = 0,49'
      ],
      correct: 1,
      feedback: 'R² = 0,49 significa que 49% da variabilidade de y é explicada pela variável x no modelo. Os outros 51% se devem a outros fatores não incluídos ou à variabilidade aleatória. Em pesquisa clínica, R² = 0,49 já indica associação moderada-forte.'
    },
    {
      question: 'Na regressão linear simples, qual é a relação entre R² e o r de Pearson?',
      options: [
        'R² = r / 2',
        'R² = r² — o coeficiente de determinação é o quadrado da correlação',
        'São sempre iguais',
        'R² = √r'
      ],
      correct: 1,
      feedback: 'Em regressão linear simples (uma variável explicativa), R² = r². Assim, r = 0,7 implica R² = 0,49 — 49% da variabilidade explicada. Essa relação conecta a força da correlação à qualidade do ajuste do modelo!'
    },
    {
      question: 'R² = 0 significa que:',
      options: [
        'O modelo é perfeito',
        'O RSS é zero',
        'O modelo não explica nada — equivale a usar a média de y como previsão',
        'β₀ = 0'
      ],
      correct: 2,
      feedback: 'R² = 0 significa que o modelo linear não explica nada da variabilidade de y — equivalente a usar simplesmente a média ȳ como previsão para todos os pontos. É o pior cenário possível: a variável x não ajuda a prever y.'
    }
  ],

  // ── Transição 6 → 7 ─────────────────── pensamento crítico ──
  [
    {
      question: 'O que torna a reta do método dos mínimos quadrados especial?',
      options: [
        'Ela sempre passa pela origem (0, 0)',
        'Ela minimiza o RSS — e existe uma solução única e analítica para qualquer dataset',
        'Ela passa pelo maior número de pontos',
        'Ela tem sempre inclinação positiva'
      ],
      correct: 1,
      feedback: 'A reta OLS tem uma propriedade matemática elegante: minimiza a soma dos quadrados dos resíduos, e existe uma fórmula analítica direta (β₁ = Σ[(xᵢ−x̄)(yᵢ−ȳ)] / Σ[(xᵢ−x̄)²]) que dá a solução única sem necessidade de tentativa e erro.'
    },
    {
      question: '"Associação não implica causalidade." Isso significa que:',
      options: [
        'Se r é alto, há causa e efeito comprovados',
        'Uma correlação entre x e y pode ter outras explicações além de causalidade direta',
        'Regressão só funciona com relações de causa e efeito',
        'R² alto prova que x causa y'
      ],
      correct: 1,
      feedback: 'Correlação ≠ causalidade! Uma terceira variável (confundidor) pode criar associação espúria. Exemplo clássico: países que consomem mais chocolate per capita têm mais prêmios Nobel — mas chocolate não causa genialidade. Sempre interprete associações com cautela clínica e epidemiológica.'
    },
    {
      question: 'Uma limitação importante da regressão linear é que:',
      options: [
        'Só funciona com amostras grandes',
        'Só modela relações em linha reta — relações curvilíneas exigem outros modelos',
        'Não utiliza os dados reais',
        'Só pode ser usada com variáveis categóricas'
      ],
      correct: 1,
      feedback: 'Regressão linear modela apenas relações em linha reta. Se os dados têm forma curvilínea (parábola, curva dose-resposta sigmoide, exponencial), o modelo linear será inadequado: o R² será baixo e os resíduos terão padrão sistemático. Nesses casos, usar regressão polinomial ou transformações de variáveis.'
    },
    {
      question: 'Por qual ponto a reta dos mínimos quadrados sempre passa obrigatoriamente?',
      options: [
        'Pela origem (0, 0)',
        'Pelo ponto de maior y',
        'Pelo ponto (x̄, ȳ) — as médias de x e de y',
        'Pelo ponto de menor x'
      ],
      correct: 2,
      feedback: 'Propriedade matemática fundamental: a reta dos mínimos quadrados sempre passa pelo centróide dos dados (x̄, ȳ) — as médias de x e de y. Isso é uma consequência direta das fórmulas de β₀ e β₁. A reta sempre "ancora" nesse ponto central!'
    }
  ]

];
