"""
_delta_utils.py — Constantes y utilidades compartidas del Ciclo Delta
Importado por todos los scripts de Delta (Fase 1 a Fase 4).
"""
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.preprocessing import StandardScaler

# Raíz del ciclo: fase_1_datos/scripts/_delta_utils.py → tres .parent = Ciclo Delta/
_DELTA_ROOT     = Path(__file__).resolve().parent.parent.parent
_INVESTIGACION  = _DELTA_ROOT.parent
_DATA_UNIFICADO = _INVESTIGACION / "Data_2026" / "Abril_Mayo_Junio_2026"

# ── Constantes heredadas de Gamma (NO cambiar sin nuevo experimento) ──────────
KPCL0034_UUIDS    = [
    "9510a455-b0e9-4932-8be1-03976d31228a",   # UUID Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",   # UUID Mayo-Jun 2026 y posterior
]
KPCL0034_CODE     = "KPCL0034"
GAP_CUTOFF_S      = 300
PLATEAU_THRESHOLD = 1.5
RESAMPLE_TARGET_S = 30
BASELINE_WINDOW   = 60
TZ_LOCAL          = "America/Santiago"
TZ_UTC            = "UTC"
CSV_ENCODING      = "latin1"

# ── Features de Gamma (13) — base de Delta ────────────────────────────────────
FEATURES_GAMMA = [
    "weight_grams", "delta_w", "delta_w_10",
    "rolling_std_5", "rolling_std_10", "rolling_mean_5",
    "net_weight", "is_plateau", "plateau_duration_s",
    "hour_sin", "hour_cos", "clock_invalid", "dia_semana_sin",
]

# ── Features adicionales de Delta (no supervisadas) ───────────────────────────
FEATURES_DELTA_EXTRA = [
    "delta_w_30",       # cambio de peso en ventana de 30 lecturas (~15 min)
    "rolling_std_30",   # volatilidad a largo plazo
    "session_gap_s",    # tiempo desde la última sesión activa detectada
    "weight_zscore",    # z-score respecto a baseline rolling de 1h
    "trend_slope",      # pendiente lineal en ventana de 10 lecturas
]

FEATURES_DELTA_ALL = FEATURES_GAMMA + FEATURES_DELTA_EXTRA

# ── Parámetros de clustering ──────────────────────────────────────────────────
N_CLUSTERS_RANGE    = range(2, 8)
DBSCAN_EPS_RANGE    = [0.3, 0.5, 0.8, 1.0, 1.5]
DBSCAN_MIN_SAMPLES  = 5
HDBSCAN_MIN_CLUSTER = 10

# ── Parámetros de detección de anomalías ──────────────────────────────────────
IF_CONTAMINATION   = 0.05
LOF_N_NEIGHBORS    = 20
AUTOENCODER_EPOCHS = 50
AUTOENCODER_LATENT = 4

# ── Fuentes de Gamma (solo lectura) ───────────────────────────────────────────
GAMMA_READINGS = _DATA_UNIFICADO / "02_unificado"    / "readings_unificado_utc.parquet"
GAMMA_SESSIONS = _DATA_UNIFICADO / "04_anotacion"    / "sessions_labeled.parquet"
GAMMA_X_TRAIN  = _INVESTIGACION  / "Ciclo Gamma"     / "fase_2_dataset" / "data" / "train" / "X_train.parquet"
GAMMA_X_VAL    = _INVESTIGACION  / "Ciclo Gamma"     / "fase_2_dataset" / "data" / "train" / "X_val.parquet"
GAMMA_Y_TRAIN  = _INVESTIGACION  / "Ciclo Gamma"     / "fase_2_dataset" / "data" / "train" / "y_train.parquet"
GAMMA_Y_VAL    = _INVESTIGACION  / "Ciclo Gamma"     / "fase_2_dataset" / "data" / "train" / "y_val.parquet"

# ── Rutas base Delta ──────────────────────────────────────────────────────────
FASE1_DATA_RAW  = _DELTA_ROOT / "fase_1_datos"     / "data"    / "raw"
FASE1_DATA_PROC = _DELTA_ROOT / "fase_1_datos"     / "data"    / "processed"
FASE2_MODELS    = _DELTA_ROOT / "fase_2_clustering" / "models"
FASE2_OUTPUTS   = _DELTA_ROOT / "fase_2_clustering" / "outputs"
FASE3_MODELS    = _DELTA_ROOT / "fase_3_anomalias"  / "models"
FASE3_OUTPUTS   = _DELTA_ROOT / "fase_3_anomalias"  / "outputs"
FASE4_OUTPUTS   = _DELTA_ROOT / "fase_4_validacion" / "outputs"


# ── Funciones ─────────────────────────────────────────────────────────────────

def cargar_readings_gamma() -> pd.DataFrame:
    if not GAMMA_READINGS.exists():
        raise FileNotFoundError(
            f"readings_unificado_utc.parquet no encontrado:\n  {GAMMA_READINGS}\n"
            "Ejecutar g03_unify_readings.py de Gamma antes de iniciar Delta."
        )
    df = pd.read_parquet(GAMMA_READINGS)
    df = df[df["device_id"].isin(KPCL0034_UUIDS)].copy()
    df["ts_utc"] = pd.to_datetime(df["ts_utc"], utc=True)
    return df


def cargar_sessions_gamma() -> pd.DataFrame:
    if not GAMMA_SESSIONS.exists():
        raise FileNotFoundError(
            f"sessions_labeled.parquet no encontrado:\n  {GAMMA_SESSIONS}\n"
            "Ejecutar g09_build_sessions_labeled.py de Gamma antes de iniciar Delta."
        )
    df = pd.read_parquet(GAMMA_SESSIONS)
    df["ts_inicio"] = pd.to_datetime(df["ts_inicio"], utc=True)
    df["ts_fin"]    = pd.to_datetime(df["ts_fin"],    utc=True)
    return df


def aplicar_timestamp_correcto(df: pd.DataFrame) -> pd.DataFrame:
    """
    readings_unificado_utc ya tiene ts_utc correctamente resuelto por g03 de Gamma.
    Agrega columna 'ts' (alias de ts_utc) usada como índice temporal en Delta.
    """
    df = df.copy()
    df["ts"] = df["ts_utc"]
    return df


def escalar_features(X: np.ndarray, scaler=None):
    """
    Aplica StandardScaler. Sin scaler → fit_transform (train).
    Con scaler ya entrenado → solo transform (val/inferencia).
    Retorna (X_scaled: np.ndarray, scaler: StandardScaler).
    """
    if scaler is None:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
    else:
        X_scaled = scaler.transform(X)
    return X_scaled, scaler


def calcular_features_delta_extra(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calcula las 5 features adicionales de Delta sobre df ya con FEATURES_GAMMA.
    Requiere columna 'ts' (UTC timezone-aware) y cadencia uniforme de 30s.
    """
    df = df.copy()
    ts_col = "ts" if "ts" in df.columns else "ts_utc"
    w = df["weight_grams"]

    df["delta_w_30"]     = w.diff(30).fillna(0)
    df["rolling_std_30"] = w.rolling(30, min_periods=1).std().fillna(0)

    # Tiempo transcurrido desde el último punto activo (is_plateau == 0)
    last_active = df[ts_col].where(df["is_plateau"] == 0).ffill()
    df["session_gap_s"] = (
        (df[ts_col] - last_active).dt.total_seconds().fillna(0).clip(lower=0)
    )

    # Z-score respecto a baseline rolling de 1h (120 lecturas × 30s)
    rm_1h = w.rolling(120, min_periods=1).mean()
    rs_1h = w.rolling(120, min_periods=1).std().fillna(1).replace(0, 1)
    df["weight_zscore"] = (w - rm_1h) / rs_1h

    def _slope(vals: np.ndarray) -> float:
        if len(vals) < 2:
            return 0.0
        x = np.arange(len(vals), dtype=float)
        return float(np.polyfit(x, vals, 1)[0])

    df["trend_slope"] = w.rolling(10, min_periods=2).apply(_slope, raw=True).fillna(0)

    return df


def exportar_parquet(df: pd.DataFrame, ruta) -> None:
    ruta = Path(ruta)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(ruta, index=False)
    print(f"  -> {ruta}  shape={df.shape}")
