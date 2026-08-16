// Reconstrucción de sesiones desde el campo `evento` del CSV
// Lógica equivalente a build_sessions() en el pipeline Python

const INTERVAL_TYPES = ['alimentacion', 'servido', 'hidratacion']

/**
 * Reconstruye sesiones de tipo intervalo desde la lista de eventos.
 * @param {Array<{ts: Date, category: string, weight: number}>} events
 * @returns {Array<Session>}
 */
export function buildSessions(events) {
  const sessions = []

  for (const type of INTERVAL_TYPES) {
    const starts = events.filter(e => e.category === `inicio_${type}`)
    const ends   = events.filter(e => e.category === `termino_${type}`)

    let endIdx = 0
    for (const start of starts) {
      // Avanzar hasta encontrar un termino posterior al inicio
      while (endIdx < ends.length && ends[endIdx].ts <= start.ts) {
        endIdx++
      }
      if (endIdx < ends.length) {
        const end = ends[endIdx]
        const duration_sec = (end.ts - start.ts) / 1000
        if (duration_sec > 0) {
          sessions.push({
            id:           `${type}_${start.ts.getTime()}`,
            type,
            start_at:     start.ts,
            end_at:       end.ts,
            duration_sec,
            duration_min: duration_sec / 60,
            weight_start: start.weight,
            weight_end:   end.weight,
            consumed_g:   type === 'servido'
              ? Math.max(0, end.weight - start.weight)  // servido: sube
              : Math.max(0, start.weight - end.weight), // consumo: baja
          })
        }
        endIdx++
      }
    }
  }

  return sessions.sort((a, b) => a.start_at - b.start_at)
}

/**
 * Calcula KPIs desde el array de sesiones y lecturas.
 */
export function calcKPIs(sessions, readings) {
  const alim = sessions.filter(s => s.type === 'alimentacion')
  const serv = sessions.filter(s => s.type === 'servido')
  const hidr = sessions.filter(s => s.type === 'hidratacion')

  const totalConsumed = alim.reduce((a, s) => a + s.consumed_g, 0)
  const totalServed   = serv.reduce((a, s) => a + s.consumed_g, 0)
  const avgDuration   = alim.length
    ? alim.reduce((a, s) => a + s.duration_min, 0) / alim.length
    : 0
  const avgRate = alim.length
    ? alim.filter(s => s.duration_min > 0)
           .reduce((a, s) => a + s.consumed_g / s.duration_min, 0) /
      alim.filter(s => s.duration_min > 0).length
    : 0

  // Aprovechamiento: total consumido / total servido
  const aprovPct = totalServed > 0 ? (totalConsumed / totalServed) * 100 : null

  // Sesiones por día
  let sesPerDay = 0
  if (alim.length >= 2) {
    const first = alim[0].start_at
    const last  = alim[alim.length - 1].start_at
    const days  = Math.max(1, (last - first) / (1000 * 60 * 60 * 24))
    sesPerDay   = alim.length / days
  }

  return {
    totalAlim:    alim.length,
    totalServ:    serv.length,
    totalHidr:    hidr.length,
    totalConsumed: Math.round(totalConsumed),
    totalServed:   Math.round(totalServed),
    avgDuration:   Math.round(avgDuration * 10) / 10,
    avgRate:       Math.round(avgRate * 100) / 100,
    aprovPct:      aprovPct !== null ? Math.round(aprovPct * 10) / 10 : null,
    sesPerDay:     Math.round(sesPerDay * 10) / 10,
    totalReadings: readings.length,
  }
}

/**
 * Agrega sesiones de alimentación por día.
 */
export function dailyConsumption(sessions) {
  const map = new Map()
  for (const s of sessions) {
    if (s.type !== 'alimentacion') continue
    const day = s.start_at.toISOString().slice(0, 10)
    if (!map.has(day)) map.set(day, { day, total: 0, count: 0 })
    const d = map.get(day)
    d.total += s.consumed_g
    d.count += 1
  }
  const arr = Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day))

  // Media móvil 3 días
  return arr.map((d, i) => {
    const window = arr.slice(Math.max(0, i - 2), i + 1)
    return { ...d, rolling3: Math.round(window.reduce((s, x) => s + x.total, 0) / window.length) }
  })
}

/**
 * Genera buckets para histograma de duración de sesiones.
 */
export function durationHistogram(sessions, bucketMin = 2) {
  const maxMin = 40
  const buckets = []
  for (let i = 0; i < maxMin; i += bucketMin) {
    buckets.push({ range: `${i}–${i + bucketMin}`, min: i, max: i + bucketMin, alimentacion: 0, servido: 0 })
  }
  for (const s of sessions) {
    const idx = Math.min(Math.floor(s.duration_min / bucketMin), buckets.length - 1)
    if (s.type === 'alimentacion') buckets[idx].alimentacion++
    else if (s.type === 'servido') buckets[idx].servido++
  }
  return buckets.filter(b => b.alimentacion > 0 || b.servido > 0)
}
