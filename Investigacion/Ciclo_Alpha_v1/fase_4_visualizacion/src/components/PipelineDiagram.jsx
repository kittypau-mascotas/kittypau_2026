const PHASES = [
  {
    id:    'fase1',
    num:   '01',
    color: 'var(--c1)',
    title: 'Extracción',
    desc:  'Descarga lecturas, eventos y sesiones desde Supabase. Genera los artefactos parquet de referencia.',
    stats: ['96,807 lecturas', '202 eventos manuales', '95 sesiones'],
  },
  {
    id:    'fase2',
    num:   '02',
    color: 'var(--c2)',
    title: 'Dataset',
    desc:  'Ingeniería de features + split temporal supervisado en 3 splits: train / val / test.',
    stats: ['12 features activas', '30,377 train · 6,510 val', '3 clases etiquetadas'],
  },
  {
    id:    'fase3',
    num:   '03',
    color: 'var(--c3)',
    title: 'Modelos',
    desc:  'Entrena Modelo A (binario) y Modelo B (multiclase) con LightGBM. 5 experimentos documentados.',
    stats: ['LightGBM 4.3.0', 'Macro F1: 0.6712 (Exp 03)', '5 experimentos'],
  },
  {
    id:      'fase4',
    num:     '04',
    color:   'var(--c4)',
    title:   'Visualización',
    desc:    'Dashboard interactivo con todos los datos del pipeline. Esta página.',
    stats:   ['Datos reales de Fases 1–3', 'Plotly + Recharts', 'Interactivo'],
    current: true,
  },
]

export function PipelineDiagram({ onSelectPhase }) {
  return (
    <div className="pipeline-wrap fade-up">
      <div className="pipeline-label">Pipeline de investigación</div>
      <div className="pipeline-track">
        {PHASES.map((phase, i) => (
          <>
            <PhaseNode
              key={phase.id}
              phase={phase}
              onClick={phase.current ? undefined : () => onSelectPhase(phase.id)}
            />
            {i < PHASES.length - 1 && (
              <div key={`arrow-${i}`} className="pipeline-arrow">→</div>
            )}
          </>
        ))}
      </div>
    </div>
  )
}

function PhaseNode({ phase, onClick }) {
  return (
    <div
      className={`phase-node ${phase.current ? 'current' : ''}`}
      style={{ '--phase-color': phase.color }}
      onClick={onClick}
    >
      <div className="phase-num">FASE {phase.num}</div>
      <div className="phase-title">{phase.title}</div>
      <div className="phase-desc">{phase.desc}</div>
      <div className="phase-stats">
        {phase.stats.map(s => (
          <div key={s} className="phase-stat">{s}</div>
        ))}
      </div>
      {phase.current ? (
        <div className="phase-current-chip">
          <span style={{ fontSize: 10 }}>★</span> Página actual
        </div>
      ) : (
        <div className="phase-link">Ver detalle →</div>
      )}
    </div>
  )
}
