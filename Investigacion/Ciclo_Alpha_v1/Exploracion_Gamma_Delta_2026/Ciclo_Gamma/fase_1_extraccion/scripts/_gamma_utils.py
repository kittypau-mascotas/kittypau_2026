"""
_gamma_utils.py — FUENTE CANÓNICA DE CONSTANTES DEL CICLO GAMMA (Fase 1)
Cambiar cualquier valor aquí requiere crear un nuevo experimento numerado.
"""
from pathlib import Path
from zoneinfo import ZoneInfo

# ── Raíz del proyecto ─────────────────────────────────────────────────────────
ROOT = Path(r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq")
INVESTIGACION = ROOT / "Docs" / "investigacion"
GAMMA_ROOT = INVESTIGACION / "Ciclo Gamma"
FASE1_ROOT = GAMMA_ROOT / "fase_1_extraccion"

# ── Rutas de datos fuente (sin tocar — solo lectura) ────────────────────────────
ABRIL_READINGS_CSV = INVESTIGACION / "Data_2026" / "Abril_2026" / \
    "kittypau_full_07-05-2026_csv" / "readings.csv"
ABRIL_AUDIT_CSV = INVESTIGACION / "Data_2026" / "Abril_2026" / \
    "kittypau_full_07-05-2026_csv" / "audit_events.csv"
ABRIL_DEVICES_CSV = INVESTIGACION / "Data_2026" / "Abril_2026" / \
    "kittypau_full_07-05-2026_csv" / "devices.csv"
MAYO_JUNIO_READINGS_CSV = INVESTIGACION / "Data_2026" / "Mayo_2026" / "readings_rows.csv"
# Si se descarga un dump más reciente (posterior a 2026-06-14), reemplazar la ruta
# anterior por la del nuevo dump antes de correr g03_unify_readings.py.

# ── Carpeta unificada de este proceso (CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md) ─
DATA_UNIFICADO_ROOT = INVESTIGACION / "Data_2026" / "Abril_Mayo_Junio_2026"
DIR_01_RAW = DATA_UNIFICADO_ROOT / "01_raw"
DIR_02_UNIFICADO = DATA_UNIFICADO_ROOT / "02_unificado"
DIR_03_INFERENCIA = DATA_UNIFICADO_ROOT / "03_inferencia_modelo_a"
DIR_04_ANOTACION = DATA_UNIFICADO_ROOT / "04_anotacion"
DIR_05_REPORTE = DATA_UNIFICADO_ROOT / "05_reporte_calidad"

UUID_MAPPING_JSON = DIR_01_RAW / "uuid_mapping.json"
READINGS_UNIFICADO_UTC = DIR_02_UNIFICADO / "readings_unificado_utc.parquet"
READINGS_UNIFICADO_30S = DIR_02_UNIFICADO / "readings_unificado_30s.parquet"
X_INFERENCIA_3MESES = DIR_03_INFERENCIA / "X_inferencia_3meses.parquet"
X_INFERENCIA_3MESES_META = DIR_03_INFERENCIA / "X_inferencia_3meses.features_version.json"
CANDIDATOS_ACTIVIDAD_CSV = DIR_03_INFERENCIA / "candidatos_actividad.csv"
SESIONES_CANDIDATAS_CSV = DIR_03_INFERENCIA / "sesiones_candidatas.csv"
SESIONES_CANDIDATAS_ANOTACION_JSON = DIR_04_ANOTACION / "sesiones_candidatas_anotacion.json"
NEW_ANNOTATIONS_GAMMA_CSV = DIR_04_ANOTACION / "new_annotations_gamma.csv"
DISTRIBUCION_CLASES_TXT = DIR_05_REPORTE / "distribucion_clases_gamma.txt"
QUALITY_REPORT_TXT = DIR_05_REPORTE / "quality_report_gamma.txt"

# ── Modelo A — único usado solo para preselección de candidatos en app_anotacion ─
# No se usa para entrenar ni evaluar Gamma; solo para sugerir qué revisar primero.
# Ruta real verificada en el repo (no es Exp06 específicamente — es el último
# Modelo A entrenado y guardado en Ciclo Alpha; ver nota de features abajo).
MODELO_A_LGB = INVESTIGACION / "Ciclo Alpha" / "fase_3_modelos" / "models" / "modelo_a" / "modelo_a.lgb"
CALIBRATION_ISOTONIC_JSON = INVESTIGACION / "Ciclo Alpha" / "fase_3_modelos" / "models" / "modelo_a" / "calibration_isotonic.json"

# ── Dispositivos ──────────────────────────────────────────────────────────────
KPCL0034_CODE = "KPCL0034"
UUID_ABRIL = "9510a455-b0e9-4932-8be1-03976d31228a"      # UUID Abril 2026
UUID_MAYO_JUNIO = "3a460074-e7c3-41bf-ae5a-a011445f927a"  # UUID Mayo-Jun 2026 y posterior — canónico
KPCL0034_UUIDS = [UUID_ABRIL, UUID_MAYO_JUNIO]
UUID_CANONICO = UUID_MAYO_JUNIO  # todas las filas se reescriben a este UUID en g02

# ── Parámetros del pipeline (invariantes desde Alpha) ────────────────────────────
GAP_CUTOFF_S = 300       # segundos — gap que crea nuevo segmento/sesión
PLATEAU_THRESHOLD = 1.5  # gramos — umbral is_plateau (rolling_std_5)
RESAMPLE_TARGET_S = 30   # segundos — cadencia uniforme post-resampleo
BASELINE_WINDOW = 60     # lecturas — ventana percentil 10 para net_weight

# ── Parámetros de generación de candidatos (Paso 4.6-4.7) ───────────────────────
THRESHOLD_CANDIDATOS_GAMMA = 0.12  # prob_activo mínima para candidato — distinto de producción
THRESHOLD_A_INICIAL = 0.20         # threshold de producción — NO usar en este paso
MIN_SESSION_S = 30        # duración mínima de sesión candidata
GAP_MERGE_S = 60          # gap entre activos que se fusionan en la misma sesión candidata
MIN_CONSUMED_G = 3.0      # informativo únicamente — no descarta candidatos (ver runbook §4.7)

# ── Registro de versiones de features (control de versión para experimentar) ────
# Cada entrada es un set de features con nombre propio. "v1_modelo_a_13" es el
# único marcado compatible_con_modelo_a=True porque coincide EXACTO (cantidad y
# orden) con dataset_meta.json / X_train.parquet del modelo_a.lgb guardado en
# Ciclo Alpha — no editar esa lista sin reentrenar el modelo. Para probar features
# nuevas, agregar una entrada v2_..., v3_..., etc. y cambiar ACTIVE_FEATURE_VERSION;
# g05 etiqueta cada output con la versión usada, g06 valida compatibilidad antes
# de inferir con el modelo guardado.
FEATURE_SETS = {
    "v1_modelo_a_13": {
        "descripcion": (
            "Esquema exacto del modelo_a.lgb guardado en "
            "Ciclo_Alpha_v1/fase_3_modelos/models/modelo_a/ (verificado contra "
            "dataset_meta.json y el esquema de X_train.parquet el 2026-06-16). "
            "plateau_duration en FILAS (no segundos), hour_sin/cos sin confirmar "
            "si son UTC o Santiago. cadencia_s tiene gain=0.0 en feature_importance.csv."
        ),
        "compatible_con_modelo_a": True,
        "features": [
            "weight_grams",
            "delta_w",
            "delta_w_10",
            "rolling_std_5",
            "rolling_std_10",
            "rolling_mean_5",
            "net_weight",
            "is_plateau",
            "plateau_duration",
            "hour_sin",
            "hour_cos",
            "clock_invalid",
            "cadencia_s",
        ],
    },
    # Ejemplo para agregar una variante a probar (no usar todavía):
    # "v2_sin_cadencia": {
    #     "descripcion": "v1 sin cadencia_s, para ver si el modelo guardado tolera 12 features.",
    #     "compatible_con_modelo_a": False,
    #     "features": [f for f in FEATURE_SETS["v1_modelo_a_13"]["features"] if f != "cadencia_s"],
    # },
}

ACTIVE_FEATURE_VERSION = "v1_modelo_a_13"  # cambiar aquí para experimentar con otra versión


def get_active_feature_set() -> dict:
    return FEATURE_SETS[ACTIVE_FEATURE_VERSION]


def get_active_features() -> list:
    return get_active_feature_set()["features"]


# Alias retrocompatible — preferir get_active_features() en código nuevo.
FEATURES_MODELO_A = FEATURE_SETS["v1_modelo_a_13"]["features"]

# ── Encoding de clases (Modelo A — binario) ──────────────────────────────────
LABEL_ENCODING_MODELO_A = {"reposo": 0, "activo": 1}

# ── Timezone ──────────────────────────────────────────────────────────────────
TZ_LOCAL = ZoneInfo("America/Santiago")
TZ_UTC = "UTC"

# ── Encoding CSV (exports Supabase) ──────────────────────────────────────────
CSV_ENCODING = "latin1"

# ── Rutas Fase 2 y Fase 3 ─────────────────────────────────────────────────────
FASE2_INTERIM = GAMMA_ROOT / "fase_2_dataset" / "data" / "interim"
FASE2_TRAIN   = GAMMA_ROOT / "fase_2_dataset" / "data" / "train"
FASE3_OUTPUTS = GAMMA_ROOT / "fase_3_modelos" / "outputs"

# ── Features Gamma (entrenamiento — distintas de v1_modelo_a_13 de Fase 1) ────
# Diferencias vs Alpha: plateau_duration_s en segundos, hour_sin/cos en hora
# Santiago (no UTC), dia_semana_sin nueva, sin cadencia_s (gain=0 en Alpha).
# NO cambiar sin crear nuevo experimento.
FEATURES_GAMMA = [
    "weight_grams", "delta_w", "delta_w_10",
    "rolling_std_5", "rolling_std_10", "rolling_mean_5",
    "net_weight", "is_plateau", "plateau_duration_s",
    "hour_sin", "hour_cos", "clock_invalid", "dia_semana_sin",
]

# ── Encoding de clases Gamma (multiclase) ─────────────────────────────────────
LABEL_ENCODING = {
    "alimentacion": 0,
    "servido":      1,
    "reposo":       2,
}
IDX_ALIMENTACION = 0
IDX_SERVIDO      = 1
IDX_REPOSO       = 2

# ── Umbrales de checkpoint Fase 1 (cambiar requiere nuevo experimento) ────────
SESSIONS_LABELED_PARQUET = DIR_04_ANOTACION / "sessions_labeled.parquet"
MIN_SERVIDO_SESSIONS = 80    # ver instructivo.md §11
MIN_ALIM_SESSIONS    = 200   # ver instructivo.md §11


def cargar_sessions_con_augmentation(rng_seed: int = 42):
    """
    Carga sessions_labeled.parquet y oversamplea 'servido' hasta MIN_SERVIDO_SESSIONS
    si el conteo real es insuficiente. Cuando haya >= MIN_SERVIDO_SESSIONS sesiones
    reales de servido no se aplica ningún oversampleo.
    Marca las filas sintéticas con is_augmented=True para que Fase 2 pueda
    distinguirlas (p.ej. para ponderarlas diferente o excluirlas de la evaluación).
    """
    import pandas as pd

    if not SESSIONS_LABELED_PARQUET.exists():
        raise FileNotFoundError(
            "sessions_labeled.parquet no existe — ejecutar g09 primero"
        )

    df = pd.read_parquet(SESSIONS_LABELED_PARQUET)
    df["is_augmented"] = False

    servido = df[df["session_type"] == "servido"]
    n_real   = len(servido)
    n_needed = max(0, MIN_SERVIDO_SESSIONS - n_real)

    if n_needed == 0:
        return df

    sampled = (
        servido
        .sample(n=n_needed, replace=True, random_state=rng_seed)
        .copy()
    )
    sampled["is_augmented"] = True

    print(
        f"[augmentation] servido real: {n_real}  "
        f"sintético: {n_needed}  "
        f"total: {n_real + n_needed}/{MIN_SERVIDO_SESSIONS}"
    )
    return pd.concat([df, sampled], ignore_index=True)


# ── Helper de creación de carpetas ───────────────────────────────────────────
def asegurar_carpetas():
    for d in [DIR_01_RAW, DIR_02_UNIFICADO, DIR_03_INFERENCIA, DIR_04_ANOTACION, DIR_05_REPORTE]:
        d.mkdir(parents=True, exist_ok=True)