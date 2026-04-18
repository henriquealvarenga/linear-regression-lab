// ─────────────────────────────────────────────────────────────
//  datasets.js — Definição dos 6 datasets clínicos da Liga
//  Analogia R: data_prep.R
//
//  Timers: 25 / 25 / 20 / 20 / 15 / 15 segundos
//  QUIZ movido para js/quiz.js
// ─────────────────────────────────────────────────────────────

const DATASETS = [

  // ── Round 1 ── Introdutório ──────────────────────────────────
  {
    id:    0,
    icon:  '😴',
    title: 'Sono × Cognição',
    desc:  'Horas de sono por noite × Escore de atenção cognitiva (0–100) em 25 pacientes de clínica neurológica. Avaliação com versão simplificada do MEEM.',
    xLabel: 'Horas de sono / noite',
    yLabel: 'Escore cognitivo',
    xMin: 4,  xMax: 9,
    yMin: 35, yMax: 105,
    fn:    x => 9 * x + 18,
    noise: 7,
    n:     25,
    seed:  42,
    difficulty:  1,
    timeLimit:   25,
    hasOutliers: false
  },

  // ── Round 2 ── Relação negativa ──────────────────────────────
  {
    id:    1,
    icon:  '🏃',
    title: 'Exercício × Glicemia',
    desc:  'Minutos de exercício aeróbico por dia × Glicemia em jejum (mg/dL) em 30 pacientes pré-diabéticos em acompanhamento ambulatorial.',
    xLabel: 'Exercício aeróbico (min/dia)',
    yLabel: 'Glicemia em jejum (mg/dL)',
    xMin: 0,  xMax: 65,
    yMin: 75, yMax: 155,
    fn:    x => -0.85 * x + 126,
    noise: 10,
    n:     30,
    seed:  137,
    difficulty:  2,
    timeLimit:   25,
    hasOutliers: false,
    hint: '⚠️ A relação é negativa neste dataset — a reta deve descer da esquerda para a direita.'
  },

  // ── Round 3 ── Com outliers ──────────────────────────────────
  {
    id:    2,
    icon:  '⚖️',
    title: 'IMC × Pressão Arterial',
    desc:  'IMC (kg/m²) × Pressão arterial sistólica (mmHg) em 28 participantes de check-up corporativo — inclui alguns valores atípicos (hipertensos não tratados).',
    xLabel: 'IMC (kg/m²)',
    yLabel: 'Pressão sistólica (mmHg)',
    xMin: 18, xMax: 38,
    yMin: 95, yMax: 185,
    fn:    x => 2.9 * x + 63,
    noise: 11,
    n:     28,
    seed:  999,
    difficulty:  3,
    timeLimit:   20,
    hasOutliers: true,
    hint: '⚠️ Este dataset tem outliers propositais — observe como eles puxam a reta!',
    postProcess: pts => {
      pts[2].y  += 35;
      pts[9].y  += 28;
      pts[17].y -= 25;
      return pts;
    }
  },

  // ── Round 4 ── Escala pequena ────────────────────────────────
  {
    id:    3,
    icon:  '🧘',
    title: 'Estresse × Cortisol',
    desc:  'Escore de estresse percebido (PSS-10, 0–40) × Cortisol salivar matinal (μg/dL) em 22 participantes de estudo de medicina do trabalho.',
    xLabel: 'Escore de estresse (PSS-10)',
    yLabel: 'Cortisol matinal (μg/dL)',
    xMin: 5,   xMax: 40,
    yMin: 0.2, yMax: 2.6,
    fn:    x => 0.047 * x + 0.28,
    noise: 0.28,
    n:     22,
    seed:  256,
    difficulty:  4,
    timeLimit:   20,
    hasOutliers: false,
    hint: '⚠️ Valores muito pequenos no eixo Y (μg/dL) — atenção à escala!'
  },

  // ── Round 5 ── Relação negativa + ruído ──────────────────────
  {
    id:    4,
    icon:  '☀️',
    title: 'Vitamina D × Depressão',
    desc:  'Vitamina D sérica (ng/mL) × Escore PHQ-9 de sintomas depressivos (0–27) em 26 adultos atendidos em ambulatório de psiquiatria.',
    xLabel: 'Vitamina D sérica (ng/mL)',
    yLabel: 'Escore PHQ-9 (depressão)',
    xMin: 10, xMax: 58,
    yMin: 0,  yMax: 22,
    fn:    x => -0.25 * x + 19,
    noise: 3.8,
    n:     26,
    seed:  888,
    difficulty:  4,
    timeLimit:   15,
    hasOutliers: false,
    hint: '⚠️ Relação negativa com bastante ruído — a tendência existe, mas a reta não fica óbvia!'
  },

  // ── Round 6 ── Escala comprimida ─────────────────────────────
  {
    id:    5,
    icon:  '🫁',
    title: 'Freq. Respiratória × SpO₂',
    desc:  'Frequência respiratória (irpm) × Saturação de oxigênio — SpO₂ (%) em 20 pacientes internados em enfermaria clínica.',
    xLabel: 'Frequência respiratória (irpm)',
    yLabel: 'SpO₂ (%)',
    xMin: 12, xMax: 28,
    yMin: 90, yMax: 100,
    fn:    x => -0.35 * x + 104,
    noise: 1.5,
    n:     20,
    seed:  314,
    difficulty:  4,
    timeLimit:   15,
    hasOutliers: false,
    hint: '⚠️ Escala do eixo Y muito comprimida (90–100%) — ajuste com precisão!'
  },

  // ── Round 7 ── Dose-resposta ──────────────────────────────────
  {
    id:    6,
    icon:  '💊',
    title: 'Dose × Redução da PA',
    desc:  'Dose de anti-hipertensivo (mg) × Redução da pressão arterial sistólica (mmHg) em 24 pacientes em início de tratamento farmacológico para hipertensão arterial sistêmica.',
    xLabel: 'Dose (mg)',
    yLabel: 'Redução da PA sistólica (mmHg)',
    xMin: 5,  xMax: 40,
    yMin: 0,  yMax: 30,
    fn:    x => 0.55 * x + 2,
    noise: 3.8,
    n:     24,
    seed:  777,
    difficulty:  4,
    timeLimit:   15,
    hasOutliers: false,
    hint: '⚠️ Relação dose-resposta positiva — quanto maior a dose, maior a redução esperada da PA.'
  }

];
