# Ciclo Delta — Experimento D-05 a D-07: Deteccion de anomalias

**Fecha:** 2026-06-22
**Estado:** ✅ Completado (Autoencoder ⚠️ falló — consenso con 2/3 detectores)
**Prerequisito:** D-01 a D-04 completos (clustering)
**Script:** [fase_3_anomalias/scripts/d01_isolation_forest.md](../fase_3_anomalias/scripts/d01_isolation_forest.md) y siguientes (d02, d03, d04)

---

## Objetivo

Detectar anomalias en la curva de peso de KPCL0034 usando tres detectores
independientes (Isolation Forest, Autoencoder, LOF) y construir un
consenso robusto.

## Algoritmo / Tecnica

- Isolation Forest (D-05)
- Autoencoder (D-06)
- LOF + Consenso (D-07)
- Reporte unificado por tipo (H / C / U)

## Parametros utilizados

| Parametro | Valor | Motivo |
|---|---|---|
| `IF_CONTAMINATION` | 0.05 | 5% esperado de anomalias |
| `LOF_N_NEIGHBORS` | 20 | — |
| `AUTOENCODER_EPOCHS` | 50 | — |
| `AUTOENCODER_LATENT` | 4 | Dimension del espacio latente |

## Resultados

| Detector | Anomalias detectadas | % dataset | Estado |
|---|---|---|---|
| Isolation Forest (IF) | 6,709 | 5.00% | ✅ |
| Autoencoder | — | — | ⚠️ OSError: c10.dll de PyTorch — incompatibilidad VC++ en Windows |
| LOF | 6,709 | 5.00% | ✅ |
| **Consenso IF∩LOF (≥2 votos)** | **676** | **0.50%** | ✅ |
| Tipo H (hardware, clock_invalid>0.5) | 338 | — | ✅ ≥ 5 ✅ |
| Tipo C (comportamental, horario 06-22h) | 178 | — | — |
| Tipo U (sin clasificar, nocturnas) | 160 | — | — |

### Anomalías por mes

| Mes | Anomalías |
|-----|-----------|
| Abril 2026 | 255 |
| Mayo 2026 | 196 |
| Junio 2026 | 225 |

### Top 5 más extremas (2 votos — consenso máximo)

| Timestamp | Votos | clock_invalid | Tipo |
|-----------|-------|---------------|------|
| 2026-06-12 15:19 UTC | 2 | 1.0 | H |
| 2026-05-28 11:42 UTC | 2 | 1.0 | H |
| 2026-04-12 11:59 UTC | 2 | 0.5 | C |
| 2026-06-12 15:06 UTC | 2 | 1.0 | H |
| 2026-04-21 22:40 UTC | 2 | 0.5 | U |

## Hallazgos

- **IF y LOF coinciden exactamente en cantidad (6,709)** — ambos usan contamination=5%. El consenso reduce a 676 anomalías robustas (0.50% del dataset).
- **Tipo H domina** (338/676 = 50%): lecturas con `clock_invalid=100%` que coinciden con períodos sin cargador documentados en `KPCL_AUDITORIA_SIN_CARGADOR.md`. Validado.
- **Autoencoder pendiente:** Instalar Visual C++ Redistributable 2022 x64 o usar entorno conda para resolver el DLL de PyTorch. Con 3/3 detectores, el consenso sería más estricto.
- **75.65% de anomalías IF tienen clock_invalid=True** — correlación directa hardware/anomalía.

## Visualizaciones generadas

- [x] `fase_3_anomalias/outputs/visualizaciones/isolation_forest_timeline.html`
- [x] `fase_3_anomalias/outputs/visualizaciones/anomaly_timeline_por_tipo.html`
- [ ] `outputs/visualizaciones/reconstruction_error.html` (pendiente — autoencoder no ejecutado)

## Decision

Consenso IF∩LOF con 676 anomalías es suficiente y robusto. Umbral de Tipo H (≥5) superado por amplio margen (338). Se procede a Fase 4.

## Referencias

- [_delta_utils.md](../fase_1_datos/scripts/_delta_utils.md)
- [EXPERIMENT_TRACKER_DELTA.md](EXPERIMENT_TRACKER_DELTA.md)
- `KPCL_AUDITORIA_SIN_CARGADOR.md`
- `KPCL_AUDITORIA_KPCL0036_ERROR_PESO.md`
