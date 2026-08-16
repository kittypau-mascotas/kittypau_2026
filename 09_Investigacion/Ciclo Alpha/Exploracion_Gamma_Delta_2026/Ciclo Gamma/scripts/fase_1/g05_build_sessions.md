# g05_build_sessions — PY [OBSOLETO]

> ⚠️ **Reemplazado el 2026-06-16.** Este script asumía que las anotaciones ya
> existían antes de Fase 1 (modelo de anotación manual desde cero, descartado).
> La Fase 1 vigente de Gamma vive en
> [`Ciclo Gamma/fase_1_extraccion/scripts/`](../../fase_1_extraccion/scripts/),
> con la lógica equivalente repartida en `g09_build_sessions_labeled.md` (post-
> retiquetado) y el resto del pipeline de unificación + inferencia con Modelo A
> (`g01` a `g10`). Mantenido aquí solo como referencia histórica.

**Destino:** `Data Science/gamma/fase_1_extraccion/scripts/g05_build_sessions.py`
**Prerequisito:** `g03_extract_readings.py` + `g04_extract_events.py` ejecutados
**Salida:** `gamma/fase_1_extraccion/data/raw/sessions_labeled.parquet`

---

```python
"""
g05_build_sessions.py — Fase 1 Gamma
Agrupa lecturas en sesiones usando GAP_CUTOFF_S y asigna labels desde events_labeled.
"""
import sys
import pandas as pd
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import (
    GAMMA_ROOT, FASE1_RAW, GAP_CUTOFF_S, RESAMPLE_TARGET_S,
    MIN_CONSUMED_G, MIN_SESSION_S, KPCL0034_CODE
)

VENTANA_MATCH_S = 60  # segundos — margen para asignar evento a sesión


def cargar_artefactos():
    readings = pd.read_parquet(FASE1_RAW / "readings_raw.parquet")
    readings["ts_utc"] = pd.to_datetime(readings["ts_utc"], utc=True)
    readings = readings.sort_values("ts_utc").reset_index(drop=True)

    events = pd.read_parquet(FASE1_RAW / "events_labeled.parquet")
    events["ts_utc"] = pd.to_datetime(events["ts_utc"], utc=True)
    events = events.sort_values("ts_utc").reset_index(drop=True)
    return readings, events


def segmentar_en_sesiones(df: pd.DataFrame) -> pd.DataFrame:
    """
    Divide la serie en sesiones usando GAP_CUTOFF_S.
    Calcula peso inicio/fin y consumido_g por sesión.
    """
    diff_s = df["ts_utc"].diff().dt.total_seconds().fillna(0)
    df = df.copy()
    df["_gap"] = diff_s > GAP_CUTOFF_S
    df["_sesion_id"] = df["_gap"].cumsum()

    sesiones = []
    for sesion_id, grupo in df.groupby("_sesion_id"):
        if len(grupo) < 2:
            continue
        duracion_s = (grupo["ts_utc"].iloc[-1] - grupo["ts_utc"].iloc[0]).total_seconds()
        if duracion_s < MIN_SESSION_S:
            continue

        peso_inicio = grupo["weight_grams"].iloc[0]
        peso_fin    = grupo["weight_grams"].iloc[-1]
        consumido_g = peso_inicio - peso_fin  # positivo si se consumió, negativo si se sirvió

        sesiones.append({
            "sesion_id":    sesion_id,
            "ts_inicio":    grupo["ts_utc"].iloc[0],
            "ts_fin":       grupo["ts_utc"].iloc[-1],
            "duracion_s":   duracion_s,
            "n_lecturas":   len(grupo),
            "peso_inicio_g": peso_inicio,
            "peso_fin_g":    peso_fin,
            "consumido_g":   consumido_g,
            "periodo":      grupo["_periodo"].iloc[0] if "_periodo" in grupo.columns else "desconocido",
            "session_type": "reposo",  # default — se actualiza con eventos
        })

    return pd.DataFrame(sesiones)


def asignar_labels_desde_eventos(sesiones: pd.DataFrame, eventos: pd.DataFrame) -> pd.DataFrame:
    """
    Asigna session_type a cada sesión buscando el evento más cercano a ts_inicio.
    Categorías canónicas: alimentacion, servido, reposo (default).
    """
    sesiones = sesiones.copy()

    # Filtrar eventos relevantes
    ev_alim = eventos[eventos["category"].isin([
        "inicio_alimentacion", "termino_alimentacion",
        "alimentacion"  # etiqueta de sesión completa de Gamma
    ])]
    ev_serv = eventos[eventos["category"].isin([
        "inicio_servido", "termino_servido",
        "servido"
    ])]

    def tipo_por_proximidad(ts_inicio, ev_df, ventana_s=VENTANA_MATCH_S):
        if ev_df.empty:
            return False
        deltas = (ev_df["ts_utc"] - ts_inicio).abs().dt.total_seconds()
        return deltas.min() <= ventana_s

    for idx, row in sesiones.iterrows():
        if tipo_por_proximidad(row["ts_inicio"], ev_alim):
            sesiones.loc[idx, "session_type"] = "alimentacion"
        elif tipo_por_proximidad(row["ts_inicio"], ev_serv):
            sesiones.loc[idx, "session_type"] = "servido"
        elif row["consumido_g"] < -MIN_CONSUMED_G:
            # Subida de peso sin evento → candidato a servido no anotado
            sesiones.loc[idx, "session_type"] = "servido_sin_anotar"
        elif row["consumido_g"] > MIN_CONSUMED_G:
            # Bajada de peso sin evento → posible alimentación no anotada
            sesiones.loc[idx, "session_type"] = "alim_sin_anotar"

    return sesiones


def reportar_distribucion(sesiones: pd.DataFrame) -> None:
    print("\n── Distribución de sesiones ──────────────────────────")
    dist = sesiones["session_type"].value_counts()
    for tipo, n in dist.items():
        marca = "✅" if tipo in ("alimentacion", "servido", "reposo") else "⚠️ "
        print(f"  {marca} {tipo:25s}: {n:4d}")

    # Por período
    if "periodo" in sesiones.columns:
        print("\n── Por período ────────────────────────────────────────")
        tabla = sesiones.pivot_table(
            index="periodo", columns="session_type", aggfunc="size", fill_value=0
        )
        print(tabla.to_string())


def main():
    print("=== g05_build_sessions.py — Ciclo Gamma ===\n")
    FASE1_RAW.mkdir(parents=True, exist_ok=True)

    readings, eventos = cargar_artefactos()
    print(f"Lecturas: {len(readings):,}")
    print(f"Eventos:  {len(eventos):,}")

    sesiones = segmentar_en_sesiones(readings)
    print(f"\nSesiones detectadas: {len(sesiones):,}")

    sesiones = asignar_labels_desde_eventos(sesiones, eventos)
    reportar_distribucion(sesiones)

    # Anomalías de sesiones
    anom = sesiones[sesiones["consumido_g"] < 0]
    if len(anom):
        out_anom = GAMMA_ROOT / "fase_1_extraccion/outputs/anomalias_sesiones.csv"
        out_anom.parent.mkdir(parents=True, exist_ok=True)
        anom.to_csv(out_anom, index=False)
        print(f"\n⚠️  {len(anom)} sesiones con consumido_g < 0 → anomalias_sesiones.csv")

    out = FASE1_RAW / "sessions_labeled.parquet"
    sesiones.to_parquet(out, index=False)
    print(f"\n✅ sessions_labeled.parquet → {out}")
    print("   Próximo: g06_quality_report.py")


if __name__ == "__main__":
    main()
```
