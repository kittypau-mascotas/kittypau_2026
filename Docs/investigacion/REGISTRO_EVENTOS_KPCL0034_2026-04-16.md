# Registro de eventos manuales KPCL0034 (2026-04-16)

Este documento deja trazabilidad de todo el proceso aplicado sobre `KPCL0034` para categorizacion manual de eventos y visualizacion en graficos.

## Resumen ejecutivo

- Scope: solo `KPCL0034`.
- Fuente de escritura: `public.audit_events` con `event_type = manual_bowl_category`.
- Lote manual consolidado: `49` eventos unicos.
- Ajuste posterior aplicado: inicio de comida cambiado de `2026-04-12 11:50:06` a `2026-04-12 11:45:43`.
- Regla de visualizacion en grafico: markers por `evento` para evitar ruido por lecturas msivas.

## Proceso realizado (end-to-end)

1. Se consolidaron timestamps manuales entregados para `KPCL0034`.
2. Se normalizo anio del lote (`2024` -> `2026`) para que coincida con el experimento real.
3. Se insertaron categorias manuales en `audit_events` via:
   - `Docs/investigacion/backfill_kpcl_categories_batch_2026_04_16.py`
4. Se corrigio deduplicacion por normalizacion de timestamp (`Z` vs `+00:00`) en el script.
5. Se limpio la duplicidad residual del primer intento de carga.
6. Se verifico que el lote quedara asociado solo a `KPCL0034` (no `KPCL0036`).
7. Se aplico correccion de horario solicitada:
   - `inicio_alimentacin` de `2026-04-12 11:50:06` -> `2026-04-12 11:45:43`.
8. Se refresco dataset historico para consumo de scripts/graficos.

## Mapeo de categorias usado

- `inicio comida` -> `inicio_alimentacin`
- `termino comida` -> `termino_alimentacin`
- `inicio servido` -> `inicio_servido`
- `termino servido` -> `termino_servido`

## Lote canonico de eventos manuales KPCL0034 (49)

Formato: `timestamp UTC -> categoria`

```text
2026-04-08 03:18:43 -> inicio_servido
2026-04-08 03:19:13 -> termino_servido

2026-04-11 00:14:24 -> inicio_alimentacin
2026-04-11 00:15:54 -> termino_alimentacin
2026-04-11 12:49:38 -> inicio_alimentacin
2026-04-11 12:53:58 -> termino_alimentacin
2026-04-11 18:02:30 -> inicio_alimentacin
2026-04-11 18:08:00 -> termino_alimentacin
2026-04-11 21:48:31 -> inicio_alimentacin
2026-04-11 21:53:31 -> termino_alimentacin

2026-04-12 01:35:09 -> inicio_alimentacin
2026-04-12 01:38:41 -> termino_alimentacin
2026-04-12 04:05:40 -> inicio_alimentacin
2026-04-12 04:10:41 -> termino_alimentacin
2026-04-12 11:45:43 -> inicio_alimentacin
2026-04-12 11:55:36 -> termino_alimentacin
2026-04-12 14:24:38 -> termino_alimentacin
2026-04-12 21:27:10 -> inicio_alimentacin
2026-04-12 21:31:10 -> termino_alimentacin
2026-04-12 21:52:40 -> inicio_alimentacin
2026-04-12 21:56:40 -> termino_alimentacin

2026-04-13 10:22:47 -> inicio_alimentacin
2026-04-13 10:28:47 -> termino_alimentacin
2026-04-13 12:21:17 -> inicio_servido
2026-04-13 13:27:18 -> inicio_alimentacin
2026-04-13 13:31:48 -> termino_alimentacin
2026-04-13 19:05:27 -> inicio_alimentacin
2026-04-13 19:12:59 -> termino_alimentacin

2026-04-14 00:05:59 -> inicio_alimentacin
2026-04-14 00:09:59 -> termino_alimentacin
2026-04-14 06:26:52 -> inicio_alimentacin
2026-04-14 06:32:12 -> termino_alimentacin
2026-04-14 11:52:43 -> inicio_alimentacin
2026-04-14 11:57:44 -> termino_alimentacin
2026-04-14 12:07:43 -> inicio_servido
2026-04-14 12:08:14 -> termino_servido
2026-04-14 12:25:17 -> termino_servido
2026-04-14 17:15:15 -> inicio_alimentacin
2026-04-14 17:18:15 -> termino_alimentacin
2026-04-14 21:44:47 -> inicio_alimentacin
2026-04-14 21:50:47 -> termino_alimentacin

2026-04-15 00:49:28 -> inicio_alimentacin
2026-04-15 00:53:28 -> termino_alimentacin
2026-04-15 10:45:39 -> inicio_alimentacin
2026-04-15 10:49:09 -> termino_alimentacin
2026-04-15 13:58:10 -> inicio_alimentacin
2026-04-15 14:01:40 -> termino_alimentacin
2026-04-15 21:27:44 -> inicio_alimentacin
2026-04-15 21:31:44 -> termino_alimentacin
```

## Notas de consistencia

- La pareja `2026-04-13 12:21:17 -> inicio_servido` y `2026-04-14 12:25:17 -> termino_servido` queda documentada tal como fue ingresada en el lote manual.
- `KPCL0036` no forma parte de este lote manual.
- Si se corrige un timestamp puntual, debe quedar trazado en este archivo y en el script de backfill correspondiente.

## Scripts/archivos relacionados

- `Docs/investigacion/backfill_kpcl_categories_batch_2026_04_16.py`
- `Docs/investigacion/refresh_kpcl_experimento.py`
- `Docs/investigacion/plot_kpcl_experimento.py`
- `Docs/investigacion/kpcl0034_historico_completo_20260416_005117.csv`
