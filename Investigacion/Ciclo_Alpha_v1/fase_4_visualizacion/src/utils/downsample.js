/**
 * Largest-Triangle-Three-Buckets (LTTB) downsampling.
 * Preserva los picos y valles más visualmente importantes.
 * @param {Array<{x: number, y: number}>} data  — ordenado por x
 * @param {number} threshold                     — puntos de salida deseados
 * @returns {Array<{x: number, y: number}>}
 */
export function lttb(data, threshold) {
  const len = data.length
  if (threshold >= len || threshold <= 0) return data

  const sampled = []
  let sampledIndex = 0

  // Siempre incluir el primer punto
  sampled[sampledIndex++] = data[0]

  const bucketSize = (len - 2) / (threshold - 2)
  let a = 0 // índice del punto previamente seleccionado

  for (let i = 0; i < threshold - 2; i++) {
    // Bucket actual [start, end)
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1
    const avgRangeEnd   = Math.min(Math.floor((i + 2) * bucketSize) + 1, len)

    // Punto promedio del siguiente bucket
    let avgX = 0, avgY = 0
    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += data[j].x
      avgY += data[j].y
    }
    const count = avgRangeEnd - avgRangeStart
    avgX /= count
    avgY /= count

    // Bucket actual
    const rangeStart = Math.floor(i * bucketSize) + 1
    const rangeEnd   = Math.floor((i + 1) * bucketSize) + 1

    const pointAX = data[a].x
    const pointAY = data[a].y

    let maxArea = -1
    let maxIdx  = rangeStart

    for (let j = rangeStart; j < rangeEnd; j++) {
      const area = Math.abs(
        (pointAX - avgX) * (data[j].y - pointAY) -
        (pointAX - data[j].x) * (avgY - pointAY)
      ) * 0.5
      if (area > maxArea) {
        maxArea = area
        maxIdx  = j
      }
    }

    sampled[sampledIndex++] = data[maxIdx]
    a = maxIdx
  }

  // Siempre incluir el último punto
  sampled[sampledIndex] = data[len - 1]

  return sampled
}
