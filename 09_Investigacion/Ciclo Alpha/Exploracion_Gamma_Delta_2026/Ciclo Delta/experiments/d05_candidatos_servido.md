# Ciclo Delta — Experimento D-09: Candidatos de servido nuevos

**Fecha:** 2026-06-22
**Estado:** ✅ Completado — 2 candidatos nuevos (umbral no alcanzado: necesitaba ≥10)
**Prerequisito:** D-08 completo (cross-check Gamma ejecutado)
**Script:** [../fase_4_validacion/scripts/d02_candidatos_servido.md](../fase_4_validacion/scripts/d02_candidatos_servido.md)

---

## Objetivo

Usar el cluster Delta de mayor `delta_w` promedio para generar candidatos
de sesiones de `servido` que Gamma no tenia etiquetadas, aumentando el
conjunto de entrenamiento para el proximo ciclo supervisado.

## Logica de deteccion

El cluster "candidato a servido" se identifica por:
- Mayor promedio de `delta_w` (subida de peso)
- `rolling_std_10` alto (transicion activa)
- `net_weight` en aumento

Lecturas consecutivas de ese cluster (gap < `GAP_CUTOFF_S`) con
`delta_peso_total > 5g` y duracion > 30s se proponen como sesiones nuevas.

## Parametros utilizados

| Parametro | Valor | Motivo |
|---|---|---|
| `GAP_CUTOFF_S` | 300 | Heredado de Gamma — separacion entre sesiones |
| `MIN_LECTURAS` | 3 | Minimo para considerar una sesion valida |
| `MIN_DELTA_PESO_G` | 5.0 | Gramos minimos de subida para ser servido |
| `MIN_DURACION_S` | 30 | Duracion minima de la sesion |

## Resultados

| Metrica | Valor | Umbral | Estado |
|---|---|---|---|
| Candidatos totales encontrados | **12** | — | — |
| Candidatos ya etiquetados en Gamma | 10 | — | — |
| Candidatos NUEVOS (no en Gamma) | **2** | ≥ 10 | ⚠️ bajo umbral |
| Rango temporal candidatos nuevos | Jun 01–02, 2026 | — | — |
| Gramos estimados (candidatos nuevos) | 43g (18g + 25g) | — | — |
| Cluster identificado como servido | Cluster 0 (delta_w medio = +4.61g) | — | ✅ |

### Todos los candidatos (12 en total)

| ts_inicio (UTC) | ts_termino | delta_peso_g | duracion_s | n_lecturas | nuevo |
|-----------------|------------|-------------|-----------|-----------|-------|
| 2026-04-09 23:07 | 23:28 | 45g | 1260s | 40 | — |
| 2026-04-27 04:49 | 05:03 | 48g | 870s | 30 | — |
| 2026-04-28 21:03 | 21:18 | 40g | 870s | 30 | — |
| 2026-05-04 01:43 | 01:58 | 49g | 870s | 30 | — |
| 2026-05-30 00:42 | 00:56 | 19g | 840s | 29 | — |
| 2026-05-31 14:41 | 14:55 | 25g | 870s | 30 | — |
| **2026-06-01 09:14** | **09:24** | **18g** | **600s** | 14 | ✅ NUEVO |
| **2026-06-02 12:36** | **12:41** | **25g** | **330s** | 12 | ✅ NUEVO |
| 2026-06-02 21:11 | 21:16 | 13g | 300s | 11 | — |
| 2026-06-05 23:15 | 23:29 | 43g | 870s | 30 | — |
| 2026-06-10 17:45 | 17:58 | 11g | 750s | 26 | — |
| 2026-06-13 04:24 | 04:29 | 14g | 270s | 10 | — |

## Hallazgos

- **10 de 12 candidatos ya estaban etiquetados en Gamma** — valida que el cluster detecta sesiones reales de servido.
- **Solo 2 candidatos nuevos**: ambos en Junio 2026. El dataset de Mayo–Junio tiene menos densidad de anotaciones retroactivas.
- Los candidatos nuevos son de duración media-corta (330–600s) y gramos moderados (18–25g) — perfil de servido pequeño.
- El umbral de ≥ 10 candidatos nuevos no se alcanzó. La razón principal: el período Abr–May ya estaba bien anotado en Gamma via `app_anotacion.py`.
- Delta como detector de servido nuevo es más valioso en períodos sin anotación retroactiva.

## Salidas

- [x] `fase_4_validacion/outputs/candidatos_servido_delta.csv` — 12 candidatos totales
- [x] `fase_4_validacion/outputs/candidatos_servido_delta_nuevos.csv` — 2 candidatos nuevos

> Los 2 candidatos nuevos deben revisarse manualmente con `app_anotacion_gamma.py`
> antes de incorporarlos como etiquetas. La revisión determina si son servido real
> o ruido del sensor.

## Decision

Solo 2 candidatos nuevos — umbral ≥10 no alcanzado. Se incorporan los 2 para revisión humana en Gamma pero no justifican reentrenamiento solo por este aporte. El aporte real de Delta es la validación de pureza del Cluster 0 (50.1% servido) como base para bootstrapping supervisado en Ciclo Epsilon.

## Referencias

- [../fase_4_validacion/scripts/d02_candidatos_servido.md](../fase_4_validacion/scripts/d02_candidatos_servido.md)
- [d04_cross_check_gamma.md](d04_cross_check_gamma.md)
- [../EXPERIMENT_TRACKER_DELTA.md](../EXPERIMENT_TRACKER_DELTA.md)
- `../../../Ciclo Gamma/` — destino final del CSV via app_anotacion_gamma.py
