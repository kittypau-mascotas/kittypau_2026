"""
01_genera_candidatos.py — Alpha v2

Lee data/lecturas.csv (exportado manualmente desde Supabase/HiveMQ),
detecta TODOS los segmentos donde el peso se movió, y guarda
data/candidatos_av2.csv para que el operador los anote en la app.

Filosofía: umbral bajo a propósito — detectar de más y que el operador
filtre. Los candidatos marcados como 'falso_positivo' en la app
quedan confirmados como reposo real.

Los umbrales se leen de config/umbrales.json (ajustables desde la app).

Uso:
    python 01_genera_candidatos.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")

# Motor matemático v2 (shape_features_v2.py en el mismo directorio)
sys.path.insert(0, str(Path(__file__).parent))
try:
    from shape_features_v2 import extraer_features as _extraer_v2
    _MOTOR_V2 = True
except ImportError:
    _MOTOR_V2 = False

# ─── Rutas ───────────────────────────────────────────────────────────────────
SCRIPT_DIR    = Path(__file__).parent
DATA_DIR      = SCRIPT_DIR / "data"
CONFIG_DIR    = SCRIPT_DIR / "config"

# Datos crudos en Docs/11_Data/2026/ (3 niveles arriba de fase_0_ruido → Docs/)
RAW_DATA_DIR      = SCRIPT_DIR.parent.parent.parent / "11_Data" / "2026"
READINGS_CSV      = RAW_DATA_DIR / "readings.csv"
READINGS_ROWS_CSV = RAW_DATA_DIR / "readings_rows.csv"

CANDIDATOS_CSV = DATA_DIR / "candidatos_av2.csv"
CICLOS_CSV     = DATA_DIR / "ciclos_servido_alimento.csv"
UMBRALES_JSON  = CONFIG_DIR / "umbrales.json"

TZ_STGO = ZoneInfo("America/Santiago")

# UUIDs de KPCL0034 (food_bowl "Bandida")
KPCL0034_UUIDS = {
    "9510a455-b0e9-4932-8be1-03976d31228a",  # Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",  # Mayo-Junio 2026
}

# ─── Parámetros por defecto (se sobrescriben con umbrales.json) ───────────────
DEFAULTS = {
    "resample_s":             30,
    "umbral_std_g":           1.5,
    "umbral_delta_g":         5.0,
    "min_rango_g":            4.0,
    "min_duracion_s":         45,
    "gap_merge_s":            120,
    "ventana_std_lecturas":   10,
    "ventana_delta_lecturas": 20,
}


def cargar_umbrales() -> dict:
    if UMBRALES_JSON.exists():
        with open(UMBRALES_JSON, encoding="utf-8") as f:
            data = json.load(f)
        return {**DEFAULTS, **data.get("deteccion", {})}
    return DEFAULTS.copy()


def cargar_ciclos() -> pd.DataFrame | None:
    """Carga ciclos_servido_alimento.csv si existe."""
    if not CICLOS_CSV.exists():
        return None
    df = pd.read_csv(CICLOS_CSV)
    for c in ["t_inicio", "t_fin"]:
        if c in df.columns:
            df[c] = pd.to_datetime(df[c], format="ISO8601", utc=True)
    return df.sort_values("t_inicio").reset_index(drop=True)


def features_ciclo(t_inicio: pd.Timestamp, df_ciclos: pd.DataFrame | None) -> dict:
    """Features contextuales de posición dentro del ciclo S/A para un candidato.

    - id_ciclo              : qué ciclo contiene el candidato (int | None)
    - horas_desde_servido   : horas desde el inicio del ciclo (≈0 = recién servido)
    - fraccion_ciclo        : posición normalizada 0→1 dentro del ciclo
    - horas_hasta_fin_ciclo : horas que faltan para el próximo servido
    """
    _null = {
        "id_ciclo":              None,
        "horas_desde_servido":   None,
        "fraccion_ciclo":        None,
        "horas_hasta_fin_ciclo": None,
    }
    if df_ciclos is None or len(df_ciclos) == 0:
        return _null

    mask  = (df_ciclos["t_inicio"] <= t_inicio) & (df_ciclos["t_fin"] >= t_inicio)
    match = df_ciclos[mask]
    if len(match) == 0:
        return _null

    row       = match.iloc[0]
    dur_h     = (row["t_fin"] - row["t_inicio"]).total_seconds() / 3600
    elapsed_h = (t_inicio - row["t_inicio"]).total_seconds() / 3600
    remain_h  = (row["t_fin"] - t_inicio).total_seconds() / 3600

    return {
        "id_ciclo":              int(row["id_ciclo"]),
        "horas_desde_servido":   round(elapsed_h, 2),
        "fraccion_ciclo":        round(elapsed_h / dur_h, 4) if dur_h > 0 else None,
        "horas_hasta_fin_ciclo": round(remain_h, 2),
    }


def cargar_lecturas() -> pd.DataFrame:
    frames = []
    for csv_path in [READINGS_CSV, READINGS_ROWS_CSV]:
        assert csv_path.exists(), (
            f"No se encuentra: {csv_path}\n"
            f"  Verificar que existan los archivos en Docs/11_Data/2026/"
        )
        df_raw = pd.read_csv(csv_path, low_memory=False)
        mask = df_raw["device_id"].isin(KPCL0034_UUIDS)
        df_dev = df_raw[mask].copy()
        print(f"  {csv_path.name}: {len(df_dev):,} filas de KPCL0034 (de {len(df_raw):,} total)")
        frames.append(df_dev)

    df = pd.concat(frames, ignore_index=True)

    df["ts"]     = pd.to_datetime(df["ingested_at"], format="ISO8601", utc=True)
    df["peso_g"] = pd.to_numeric(df["weight_grams"], errors="coerce")

    df = (
        df[["ts", "peso_g"]]
        .dropna(subset=["ts"])
        .drop_duplicates(subset=["ts"])
        .sort_values("ts")
        .reset_index(drop=True)
    )

    assert len(df) > 0, "DataFrame vacío después de filtrar KPCL0034"

    return df


def resamplear(df: pd.DataFrame, resample_s: int) -> pd.DataFrame:
    serie = df.set_index("ts")["peso_g"].resample(f"{resample_s}s").mean()
    # Forward-fill máx 2 slots (60s) — gaps > 60s quedan como NaN
    serie = serie.ffill(limit=2)
    out = serie.reset_index()
    out.columns = ["ts", "peso_g"]
    return out


def detectar_actividad(df: pd.DataFrame, u: dict) -> pd.Series:
    v_std   = max(1, u["ventana_std_lecturas"])
    v_delta = max(1, u["ventana_delta_lecturas"])

    rolling_std = df["peso_g"].rolling(v_std, min_periods=2).std().fillna(0)
    rolling_delta = (
        df["peso_g"].rolling(v_delta, min_periods=2).max()
        - df["peso_g"].rolling(v_delta, min_periods=2).min()
    ).fillna(0)

    activa = (rolling_std > u["umbral_std_g"]) | (rolling_delta > u["umbral_delta_g"])

    # Extender ±1 min para no cortar el inicio/fin del evento
    n_ext = max(1, 60 // u["resample_s"])
    activa = activa.rolling(2 * n_ext + 1, center=True, min_periods=1).max().astype(bool)

    return activa


def agrupar_segmentos(df: pd.DataFrame, activa: pd.Series) -> list[tuple[int, int]]:
    segmentos = []
    en_seg = False
    inicio_idx = 0

    for i, es_activa in enumerate(activa):
        if pd.isna(df.loc[i, "peso_g"]):
            if en_seg:
                segmentos.append((inicio_idx, i - 1))
                en_seg = False
            continue

        if es_activa and not en_seg:
            en_seg = True
            inicio_idx = i
        elif not es_activa and en_seg:
            segmentos.append((inicio_idx, i - 1))
            en_seg = False

    if en_seg:
        segmentos.append((inicio_idx, len(df) - 1))

    return segmentos


def fusionar_cercanos(
    segmentos: list[tuple[int, int]], df: pd.DataFrame, gap_merge_s: int
) -> list[tuple[int, int]]:
    if len(segmentos) <= 1:
        return segmentos

    fusionados = [segmentos[0]]
    for ini, fin in segmentos[1:]:
        t_prev_fin = df.loc[fusionados[-1][1], "ts"]
        t_cur_ini  = df.loc[ini, "ts"]
        gap_s = (t_cur_ini - t_prev_fin).total_seconds()

        if gap_s < gap_merge_s:
            fusionados[-1] = (fusionados[-1][0], fin)
        else:
            fusionados.append((ini, fin))

    return fusionados


def _shape_features(valores: np.ndarray) -> dict:
    """Features de forma — usa motor v2 si está disponible, sino F00 básico."""
    if _MOTOR_V2:
        return _extraer_v2(valores, resample_s=30.0)

    # Fallback F00 (solo si shape_features_v2.py no está disponible)
    n  = len(valores)
    dy = np.diff(valores)
    monotonicity = float(np.mean(np.sign(dy))) if len(dy) > 0 else 0.0
    x      = np.arange(n, dtype=float)
    coef   = np.polyfit(x, valores, 1)
    fitted = np.polyval(coef, x)
    ss_res = float(np.sum((valores - fitted) ** 2))
    ss_tot = float(np.sum((valores - valores.mean()) ** 2))
    r2     = round(1.0 - ss_res / ss_tot, 3) if ss_tot > 1e-6 else 0.0
    zcr    = round(float(np.sum(np.diff(np.sign(dy)) != 0) / max(len(dy), 1)), 3) \
             if len(dy) > 1 else 0.0
    v_delta   = valores - valores[0]
    v_abs_max = float(np.max(np.abs(v_delta))) + 1e-6
    v_norm    = v_delta / v_abs_max

    def _cos(a, b):
        denom = np.linalg.norm(a) * np.linalg.norm(b)
        return float(np.dot(a, b) / denom) if denom > 1e-9 else 0.0

    return {
        "monotonicity":     round(monotonicity, 3),
        "r2_lineal":        r2,
        "zcr":              zcr,
        "sim_alimentacion": round(_cos(v_norm, np.linspace(0.0, -1.0, n)), 3),
        "sim_servido":      round(_cos(v_norm, np.linspace(0.0, +1.0, n)), 3),
    }


def calcular_metadata(df: pd.DataFrame, ini: int, fin: int, u: dict,
                      df_ciclos: pd.DataFrame | None = None) -> dict | None:
    sub = df.iloc[ini : fin + 1]["peso_g"].dropna()
    if len(sub) < 2:
        return None

    t_inicio = df.loc[ini, "ts"]
    t_fin    = df.loc[fin, "ts"]
    dur_s    = (t_fin - t_inicio).total_seconds()

    if dur_s < u["min_duracion_s"]:
        return None

    peso_ini = float(sub.iloc[0])
    peso_fin = float(sub.iloc[-1])
    delta    = peso_fin - peso_ini
    p_max    = float(sub.max())
    p_min    = float(sub.min())
    rango    = p_max - p_min

    if rango < u.get("min_rango_g", 4.0):
        return None

    if delta > 3:
        direction = "subida"
    elif delta < -3:
        direction = "bajada"
    else:
        direction = "mixto"

    t_ini_stgo = t_inicio.astimezone(TZ_STGO)
    shape      = _shape_features(sub.values)
    ciclo      = features_ciclo(t_inicio, df_ciclos)

    return {
        "t_inicio":          t_inicio.isoformat(),
        "t_fin":             t_fin.isoformat(),
        "duracion_min":      round(dur_s / 60, 1),
        "delta_w_total":     round(delta, 1),
        "peso_inicio_g":     round(peso_ini, 1),
        "peso_fin_g":        round(peso_fin, 1),
        "peso_max_g":        round(p_max, 1),
        "peso_min_g":        round(p_min, 1),
        "rango_g":           round(rango, 1),
        "n_lecturas":        len(sub),
        "direction":         direction,
        "hora_inicio_stgo":  t_ini_stgo.strftime("%H:%M"),
        "fecha_inicio_stgo": t_ini_stgo.strftime("%Y-%m-%d"),
        "etiqueta_audit_ref": "",
        **shape,
        **ciclo,
    }


def main():
    print("=== 01_genera_candidatos.py — Alpha v2 ===\n")

    u = cargar_umbrales()
    print(f"Umbrales: std>{u['umbral_std_g']}g | Δ>{u['umbral_delta_g']}g | "
          f"rango_min>{u.get('min_rango_g', 4.0)}g | "
          f"min_dur={u['min_duracion_s']}s | merge_gap={u['gap_merge_s']}s\n")

    df_ciclos = cargar_ciclos()
    if df_ciclos is not None:
        print(f"Ciclos cargados: {len(df_ciclos)} ciclos S/A ({CICLOS_CSV.name})")
    else:
        print(f"AVISO: {CICLOS_CSV.name} no encontrado — features de ciclo serán None")

    print(f"\nCargando lecturas desde: {RAW_DATA_DIR.name}/")
    df_raw = cargar_lecturas()
    print(f"  {len(df_raw):,} lecturas válidas")
    print(f"  Período: {df_raw['ts'].min().date()} → {df_raw['ts'].max().date()}")

    print(f"\nResampleando a {u['resample_s']}s...")
    df = resamplear(df_raw, u["resample_s"])
    n_nan = int(df["peso_g"].isna().sum())
    print(f"  {len(df):,} slots, {n_nan:,} NaN (gaps o sin dato)")

    print("Detectando actividad...")
    activa = detectar_actividad(df, u)
    n_act = int(activa.sum())
    print(f"  {n_act:,} lecturas activas ({n_act/len(df)*100:.1f}% de la señal)")

    segs = agrupar_segmentos(df, activa)
    print(f"  {len(segs)} segmentos antes de fusionar")

    segs = fusionar_cercanos(segs, df, u["gap_merge_s"])
    print(f"  {len(segs)} segmentos tras fusionar gaps < {u['gap_merge_s']}s")

    candidatos = []
    for i, (ini, fin) in enumerate(segs):
        meta = calcular_metadata(df, ini, fin, u, df_ciclos)
        if meta:
            candidatos.append(meta)
        if (i + 1) % 50 == 0:
            print(f"  ...procesados {i+1}/{len(segs)}", end="\r")

    print(f"\n  {len(candidatos)} candidatos tras filtrar (dur<{u['min_duracion_s']}s | rango<{u.get('min_rango_g',4.0)}g)")

    if not candidatos:
        print("\nAVISO: 0 candidatos generados. Bajar umbrales en config/umbrales.json.")
        return

    df_cand = pd.DataFrame(candidatos)
    df_cand.insert(0, "id_candidato", range(len(df_cand)))

    # Resumen de direcciones
    print("\nDistribución:")
    for dir_, cnt in df_cand["direction"].value_counts().items():
        pct = cnt / len(df_cand) * 100
        print(f"  {dir_:8s}: {cnt:4d} ({pct:.0f}%)")
    print(f"  Duración media: {df_cand['duracion_min'].mean():.1f} min")
    print(f"  Δpeso medio:    {df_cand['delta_w_total'].mean():+.1f} g")
    print(f"  Rango medio:    {df_cand['rango_g'].mean():.1f} g")

    # Resumen features de ciclo
    if df_ciclos is not None and "id_ciclo" in df_cand.columns:
        n_con_ciclo = int(df_cand["id_ciclo"].notna().sum())
        n_sin_ciclo = len(df_cand) - n_con_ciclo
        print(f"\nFeatures de ciclo:")
        print(f"  {n_con_ciclo} candidatos DENTRO de un ciclo S/A")
        print(f"  {n_sin_ciclo} candidatos fuera de ciclos (id_ciclo=None)")
        if n_con_ciclo > 0:
            print(f"  horas_desde_servido media: {df_cand['horas_desde_servido'].mean():.1f} h")
            print(f"  fraccion_ciclo media:      {df_cand['fraccion_ciclo'].mean():.3f}")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df_cand.to_csv(CANDIDATOS_CSV, index=False)
    print(f"\nGuardado: {CANDIDATOS_CSV.name}")
    print(f"Total candidatos a anotar: {len(df_cand)}")
    print("\n→ Siguiente paso: python -m streamlit run app_anotacion_av2.py")


if __name__ == "__main__":
    main()
