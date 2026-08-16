/**
 * useResearchData.js
 *
 * Carga los archivos JSON generados por prepare_data.py desde public/data/.
 * Cada archivo corresponde a artefactos de las fases anteriores:
 *   - readings_chart.json  ← Fase 1 (readings_raw.parquet, decimado LTTB)
 *   - sessions.json        ← Fase 1 (sessions_labeled.parquet)
 *   - events.json          ← Fase 1 (events_labeled.parquet)
 *   - kpis.json            ← calculado por prepare_data.py
 *   - daily.json           ← calculado por prepare_data.py
 *   - histogram.json       ← calculado por prepare_data.py
 *   - feature_importance.json ← Fase 3 (feature_importance.csv)
 *   - dataset_meta.json    ← Fase 2 (dataset_meta.json)
 */
import { useState, useEffect } from 'react'

async function fetchJSON(path) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${path}`)
  return res.json()
}

const DATA_FILES = [
  'readings_chart',
  'sessions',
  'events',
  'kpis',
  'daily',
  'histogram',
  'feature_importance',
  'dataset_meta',
]

export function useResearchData() {
  const [state, setState] = useState({
    readings:           null,  // { timestamps_ms, weight_grams, n_original, n_chart, first_ts, last_ts }
    sessions:           [],    // [{id, type, start_at, end_at, duration_sec, consumed_g, is_valid}]
    events:             [],    // [{ts, category, weight}]
    kpis:               null,  // { total_alim, avg_duration_min, ... }
    daily:              [],    // [{day, total, count, rolling3}]
    histogram:          [],    // [{range, alimentacion, servido}]
    featureImportance:  null,  // { modelo_a: [...], modelo_b: [...] }
    datasetMeta:        null,  // { class_distribution, n_train, ... }
    loading:            true,
    error:              null,
    missingFiles:       [],
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const results   = {}
      const missing   = []
      const fileMap   = {
        'readings_chart':     'readings',
        'sessions':           'sessions',
        'events':             'events',
        'kpis':               'kpis',
        'daily':              'daily',
        'histogram':          'histogram',
        'feature_importance': 'featureImportance',
        'dataset_meta':       'datasetMeta',
      }

      for (const key of DATA_FILES) {
        try {
          results[fileMap[key]] = await fetchJSON(`/data/${key}.json`)
        } catch (e) {
          console.warn(`[useResearchData] No se pudo cargar /data/${key}.json:`, e.message)
          missing.push(key)
          results[fileMap[key]] = key === 'sessions' || key === 'events' || key === 'daily' || key === 'histogram'
            ? []
            : null
        }
      }

      if (cancelled) return

      setState({
        ...results,
        loading:      false,
        error:        missing.length === DATA_FILES.length
          ? 'No se encontró ningún archivo en /data/. Ejecuta: python prepare_data.py'
          : null,
        missingFiles: missing,
      })
    }

    load()
    return () => { cancelled = true }
  }, [])

  return state
}
