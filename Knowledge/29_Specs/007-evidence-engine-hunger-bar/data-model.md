# Data Model — Motor de Evidencia Real en la Barra de Hambre

**Feature**: [spec.md](./spec.md) | Ver también [research.md](./research.md), [plan.md](./plan.md)

## 1. Entidades

### Segmento de peso (`Segment`, ya existe en `hunger-bar.ts` — se extiende)

Ventana de lecturas consecutivas del comedero sobre la que se decide categoría.

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| `startAt` / `endAt` | `string` (ISO) | ya existe | sin cambios |
| `deltaG` | `number` | ya existe | sin cambios — se sigue usando para filtros rápidos (ej. `meals` en `computeHungerBar`) |
| `durationMin` | `number` | ya existe | sin cambios |
| `weights` | `ReadingPoint[]` | **NUEVO** | sub-array crudo (`readings[sessionStartIdx..i]`) que `detectSegments()` ya recorre — se conserva en vez de descartarse. Insumo para `extraerFeatures()`. |
| `category` | `"alimentacion" \| "servido" \| "ruido"` | ya existe | ahora decidido por `evidenceScore()` en vez de `classifySegment()` legado |
| `confidence` | `number` (0-1) | ya existe | ahora es `confianza` del Evidence Engine (softmax de la categoría ganadora), no el score triangular de magnitud/duración |

### Perfil de referencia calibrado (`CompStats`)

Estadísticas por feature × categoría, calibradas en investigación. Estructura ya fija (ver
`comp_stats_v2.json`):

```ts
type CompStats = Record<
  string, // nombre de feature, ej. "arc_length"
  Partial<Record<"alimentacion" | "servido" | "ruido", {
    n: number;
    mean: number;
    std: number;
    median: number;
  }>>
>;
```

- Fuente única de verdad: `Investigacion/Ciclo_Alpha_v2/fase_0_ruido/data/comp_stats_v2.json`.
- Copia bundleada: `kittypau_app/src/lib/evidence-engine/comp_stats_v2.json` (research.md §7).
- **Recalibración (FR-006)**: reemplazar el archivo copiado por la versión nueva de
  investigación y re-desplegar — ninguna otra pieza de código cambia (SC-004).

### Predicción de comida (`EvidenceResult`, nuevo tipo en `types.ts`)

Resultado de `evidenceScore(features, compStats)`:

```ts
type EvidenceResult = {
  scoreAlimentacion: number; // 0-1, softmax
  scoreServido: number;
  scoreRuido: number;
  prediccion: "alimentacion" | "servido" | "ruido";
  confianza: number; // score de la categoría ganadora
  razon: string; // features que más pesaron en la decisión (debug/UX futuro)
};
```

Mapea 1:1 al dict que devuelve `evidence_score()` en Python (mismos nombres traducidos a
camelCase, sin agregar ni quitar campos).

## 2. Validación / reglas de negocio

- **FR-007 (datos insuficientes)**: si el segmento tiene menos de 3 muestras tras el resampleo
  (mismo piso que usa `_evidence_ventana_cached` en investigación: `len(sub) < 3` → `None`), no
  se llama a `evidenceScore()` — el segmento queda sin clasificar y no participa como candidato
  a "alimentación" (no se fuerza una categoría de baja confianza). Esto preserva el
  comportamiento ya documentado de `status: "sin_datos"` en `computeHungerBar()` cuando no hay
  comidas detectadas.
- **Alcance FR-005**: `evidenceScore()`/`extraerFeatures()` se usan únicamente desde el flujo de
  comedero (food). No se invocan desde ningún flujo de bebedero — no existe ese consumidor hoy,
  y este spec no lo crea.
- **Tolerancia de paridad numérica (research.md §8.2)**: los fixtures de la capa de extracción
  comparan feature por feature con tolerancia relativa `1e-6` para las familias de fórmula
  cerrada (F00-F05, F10, F13, F14) y `1e-3` para las que dependen de aproximaciones numéricas
  sensibles a orden de operaciones en punto flotante (F06 entropías, F07 fractal, F09
  frecuencial, F11 topología) — documentado explícitamente en el propio archivo de test, no un
  numero arbitrario sin justificar.

## 3. Contrato externo (sin cambios)

`GET /api/pets/[id]/hunger-bar` mantiene exactamente el mismo `HungerBarResult` ya documentado en
`hunger-bar.ts` (`status`, `percentage`, `lastMealDetectedAt`, `lastMealConfidence`,
`estimatedNextMealAt`, `intervalUsedMinutes`, `usingFallback`, `sampleSize`, `alertActive`,
`hoursOverdue`). Cambia **el valor** de `lastMealConfidence` (ahora viene de `EvidenceResult.confianza`
en vez del score triangular) — no la forma de la respuesta. Ningún consumidor del frontend
necesita cambios por esto (User Story 2: la confianza sigue siendo un número 0-1 en el mismo
campo).
