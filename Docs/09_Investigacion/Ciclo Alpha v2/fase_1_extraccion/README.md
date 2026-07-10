---
fase: 1
nombre: Extracción de Datos
estado: pendiente
ciclo: Alpha v2
---

# Fase 1 — Extracción de Datos

> **Objetivo:** Datos crudos de Supabase para Alpha v2.
> Esta fase hereda el pipeline de `Ciclo Alpha/fase_1_extraccion/`.

---

## Diferencias respecto a Ciclo Alpha

| Aspecto | Ciclo Alpha | Ciclo Alpha v2 |
|---------|------------|----------------|
| Período | Abr 8 – May 1, 2026 | Abr 8 – Junio 2026 (extendido) |
| Lecturas | 124,682 | ~134,164 (con Delta dataset) |
| Sesiones servido | 18 reales | ~63 reales (objetivo: ≥ 100 antes de train) |
| Objetivo | clasificación per-reading | segmentación de eventos |

---

## Scripts (heredados de Ciclo Alpha)

Ejecutar desde `Ciclo Alpha/fase_1_extraccion/`:

```powershell
python 01_setup_env.py
python 02_get_device_uuid.py
python 03_extract_readings.py      # → readings_raw.parquet
python 04_extract_events.py        # → events_labeled.parquet
python 05_build_sessions.py        # → sessions_labeled.parquet
python 06_quality_report.py
```

---

## Outputs esperados

| Artefacto | Contenido |
|-----------|-----------|
| `data/readings_raw.parquet` | Serie temporal completa KPCL0034 |
| `data/sessions_labeled.parquet` | Sesiones ground truth (alimentacion + servido) |
| `data/events_labeled.parquet` | Eventos raw de `audit_events` |

---

## Correcciones aplicadas vs Ciclo Alpha (pipeline heredado)

Al reutilizar los scripts de `Ciclo Alpha/fase_1_extraccion/`, verificar que estas
correcciones de Gamma estén aplicadas:

| Corrección | Razón | Archivo a modificar |
|-----------|-------|---------------------|
| Usar `uuid_mapping.json` con ambos UUIDs | `3a460074` (May–Jun) ≠ `9510a455` (Abril) — mismo device, dos registros | `02_get_device_uuid.py` |
| Normalizar timezone en `audit_events.created_at` | Mezcla de `+00`, `-04`, `-04:00` en la BD | `04_extract_events.py` |
| No rellenar gap Mayo 1–25 | Es un gap real de transmisión, no un error | `03_extract_readings.py` |
| `clock_invalid=True` → forzar `ingested_at` | 71.17% de lecturas tienen reloj inválido | `03_extract_readings.py` |
| Resamplear a 30s ANTES de pasar a Fase 2 | Cadencia variable de Abril (14.7s) vs Mayo–Jun (30s) contamina rolling features | `05_build_sessions.py` o nuevo script |

---

## Regla crítica

- Siempre usar `ingested_at` como timestamp canónico (71% de lecturas tienen `clock_invalid=True`)
- Siempre resamplear a 30s antes de cualquier feature
- No mezclar lecturas de KPCL0035 o KPCL0036 — solo KPCL0034 (Bandida food_bowl)
- UUIDs de KPCL0034: `9510a455` (Abril) y `3a460074` (Mayo–Junio)

---

## Acción previa recomendada

Antes de iniciar el pipeline, verificar en Supabase:
```sql
SELECT event_type, COUNT(*) 
FROM public.audit_events 
WHERE payload->>'category' IN ('inicio_servido', 'termino_servido')
GROUP BY event_type;
```

Si hay < 100 sesiones de servido reales → anotar más con `app_anotacion_gamma.py`
antes de correr Alpha v2. El modelo no puede aprender lo que no hay en los datos.
