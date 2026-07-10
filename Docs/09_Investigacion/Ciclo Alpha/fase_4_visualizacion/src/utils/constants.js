export const PALETTE = {
  // Nuevo esquema (coordina con CSS :root)
  bg:          '#090c14',
  bgCard:      '#0f1420',
  bgCard2:     '#141a2a',
  border:      '#1d2438',
  borderLight: '#2a324d',
  text:        '#c4cce6',
  textHi:      '#e8ecf7',
  textMuted:   '#556080',
  textSub:     '#7b87a8',

  // Colores de datos (sin cambio — mantienen coherencia con sesiones)
  green:       '#3fb950',
  greenDim:    'rgba(63,185,80,0.15)',
  greenLine:   'rgba(63,185,80,0.55)',

  orange:      '#f0883e',
  orangeDim:   'rgba(240,136,62,0.15)',
  orangeLine:  'rgba(240,136,62,0.55)',

  blue:        '#58a6ff',
  blueDim:     'rgba(88,166,255,0.15)',
  blueLine:    'rgba(88,166,255,0.55)',

  red:         '#f85149',
  redDim:      'rgba(248,81,73,0.05)',
  purple:      '#bc8cff',
  teal:        '#39d353',
  grid:        '#151c2e',

  // Colores de fases
  c1:          '#34d399',
  c2:          '#60a5fa',
  c3:          '#c084fc',
  c4:          '#fbbf24',
}

export const SESSION_COLORS = {
  alimentacion: {
    fill: PALETTE.greenDim,
    line: PALETTE.greenLine,
    solid: PALETTE.green,
    label: 'Alimentación',
    symbol: '◆',
  },
  servido: {
    fill: PALETTE.orangeDim,
    line: PALETTE.orangeLine,
    solid: PALETTE.orange,
    label: 'Servido',
    symbol: '▲',
  },
  hidratacion: {
    fill: PALETTE.blueDim,
    line: PALETTE.blueLine,
    solid: PALETTE.blue,
    label: 'Hidratación',
    symbol: '●',
  },
}

// Datos de experimentos ML (valores reales de Fase 3)
export const EXPERIMENTS = [
  {
    id: 1,
    label: 'Exp 01\nLínea base',
    fecha: '2026-04-26 20:29',
    f1_a: 0.0000,
    auc_a: 0.8098,
    f1_b: 0.5688,
    f1_alim: 0.3984,
    f1_serv: 0.3333,
    f1_reposo: 0.9745,
    nota: 'Threshold 0.5 por defecto — modelo colapsa a reposo',
  },
  {
    id: 2,
    label: 'Exp 02\nThreshold',
    fecha: '2026-04-26 20:45',
    f1_a: 0.5550,
    auc_a: 0.9024,
    f1_b: 0.6367,
    f1_alim: 0.5223,
    f1_serv: 0.4000,
    f1_reposo: null,
    nota: 'Threshold ajustado a 0.42',
  },
  {
    id: 3,
    label: 'Exp 03\nMejor base ★',
    fecha: '2026-04-26 21:04',
    f1_a: 0.5600,
    auc_a: 0.8798,
    f1_b: 0.6712,
    f1_alim: 0.5256,
    f1_serv: 0.5000,
    f1_reposo: 0.9879,
    nota: 'Drop features + duplicación servido ×3',
    best: true,
  },
  {
    id: 4,
    label: 'Exp 04\nSMOTE',
    fecha: '2026-04-26 21:29',
    f1_a: 0.5693,
    auc_a: 0.8802,
    f1_b: 0.6456,
    f1_alim: 0.5488,
    f1_serv: 0.4000,
    f1_reposo: 0.9879,
    nota: 'SMOTE local + calibración isotónica',
  },
  {
    id: 5,
    label: 'Exp 05\nNueva ingesta',
    fecha: '2026-04-26 23:33',
    f1_a: 0.5693,
    auc_a: 0.8802,
    f1_b: 0.6456,
    f1_alim: 0.5488,
    f1_serv: 0.4000,
    f1_reposo: 0.9879,
    nota: 'Nueva ingesta mejora Fase 1 pero no Fase 2',
  },
]

// Importancia de features (Experimento 03, Modelo B — posición en top-10)
// Normalizado sobre 100 basado en orden relativo observado
export const FEATURE_IMPORTANCE = [
  { name: 'rolling_std_5',   importance: 100, desc: 'Variabilidad inmediata de la señal' },
  { name: 'rolling_std_10',  importance: 94,  desc: 'Variabilidad extendida' },
  { name: 'plateau_duration',importance: 86,  desc: 'Tiempo consecutivo en estado estable' },
  { name: 'hour_sin',        importance: 72,  desc: 'Patrón horario cíclico (sin)' },
  { name: 'hour_cos',        importance: 68,  desc: 'Patrón horario cíclico (cos)' },
  { name: 'weight_grams',    importance: 55,  desc: 'Peso bruto del bowl' },
  { name: 'net_weight',      importance: 48,  desc: 'Peso neto del contenido' },
  { name: 'rolling_mean_5',  importance: 42,  desc: 'Tendencia suave a 5 lecturas' },
  { name: 'delta_w_10',      importance: 34,  desc: 'Cambio acumulado en 10 lecturas' },
  { name: 'delta_w',         importance: 26,  desc: 'Cambio inmediato entre lecturas' },
]

// Umbrales de Fase 4
export const FASE4_THRESHOLDS = {
  f1_a:    { value: 0.70, label: 'F1 activo ≥ 0.70' },
  auc_a:   { value: 0.85, label: 'AUC-ROC ≥ 0.85' },
  f1_b:    { value: 0.60, label: 'Macro F1 ≥ 0.60' },
  f1_alim: { value: 0.65, label: 'F1 alimentacion ≥ 0.65' },
}
