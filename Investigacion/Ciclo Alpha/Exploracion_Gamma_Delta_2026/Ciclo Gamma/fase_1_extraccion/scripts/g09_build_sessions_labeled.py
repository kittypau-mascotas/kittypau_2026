
"""
g09_build_sessions_labeled.py — Fase 1 Gamma
Construye sessions_labeled.parquet uniendo sesiones_candidatas.csv (647 candidatos
detectados por Modelo A) con los eventos de new_annotations_gamma.csv (etiquetas humanas).
El emparejamiento es por ventana temporal: evento ts dentro de [ts_inicio - W, ts_fin + W].
Cross-check de discrepancias contra audit_events de Alpha (Abril), solo para documentar.
"""
import sys
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import (
    NEW_ANNOTATIONS_GAMMA_CSV, SESIONES_CANDIDATAS_CSV,
    DIR_04_ANOTACION, ABRIL_AUDIT_CSV,
    MIN_CONSUMED_G, CSV_ENCODING,
)

VENTANA_MATCH_S = 120  # segundos — margen para emparejar evento con candidato
VENTANA_DISCREPANCIA_S = 300  # margen para considerar que Alpha "vio" la misma sesión

# Prioridad de tipos: servido > alimentacion > hidratacion > falso_positivo > sin_clasificar
CATEGORIA_A_TIPO = {
    "inicio_servido": "servido",
    "termino_servido": "servido",
    "inicio_alimentacion": "alimentacion",
    "termino_alimentacion": "alimentacion",
    "inicio_hidratacion": "hidratacion",
    "termino_hidratacion": "hidratacion",
    "falso_positivo": "reposo",
    "sin_clasificar": "sin_clasificar",
}
PRIORIDAD_TIPO = ["servido", "alimentacion", "hidratacion", "reposo", "sin_clasificar"]


def cargar_anotaciones_gamma() -> pd.DataFrame:
    if not NEW_ANNOTATIONS_GAMMA_CSV.exists():
        raise FileNotFoundError(
            "new_annotations_gamma.csv no existe — completar el Paso 4.9 "
            "(retiquetado manual vía app_anotacion.py) antes de ejecutar este script."
        )
    df = pd.read_csv(NEW_ANNOTATIONS_GAMMA_CSV)
    if "ts" in df.columns and "ts_utc" not in df.columns:
        df = df.rename(columns={"ts": "ts_utc"})
    df["ts_utc"] = pd.to_datetime(df["ts_utc"], utc=True)
    return df.sort_values("ts_utc").reset_index(drop=True)


def etiquetar_sesiones_candidatas(
    sesiones_cand: pd.DataFrame, eventos: pd.DataFrame
) -> pd.DataFrame:
    """
    Para cada candidato en sesiones_cand, busca eventos de anotación cuyo ts_utc
    cae dentro de [ts_inicio - VENTANA, ts_fin + VENTANA] y asigna session_type
    por prioridad: servido > alimentacion > hidratacion > reposo > sin_clasificar.
    """
    ventana = pd.Timedelta(seconds=VENTANA_MATCH_S)
    sesiones = []

    for _, row in sesiones_cand.iterrows():
        t0 = row["ts_inicio"]
        t1 = row["ts_fin"]
        mask = (eventos["ts_utc"] >= t0 - ventana) & (eventos["ts_utc"] <= t1 + ventana)
        ev = eventos[mask]

        tipos_encontrados = set()
        for cat in ev["category"].values:
            t = CATEGORIA_A_TIPO.get(cat, "sin_clasificar")
            tipos_encontrados.add(t)

        tipo = "sin_clasificar"
        for p in PRIORIDAD_TIPO:
            if p in tipos_encontrados:
                tipo = p
                break

        consumido_g = row.get("delta_peso_g", 0.0)
        if pd.isna(consumido_g):
            consumido_g = 0.0

        sesiones.append({
            "sesion_id": row["sesion_id"],
            "ts_inicio": t0,
            "ts_fin": t1,
            "duracion_s": row["duracion_s"],
            "consumido_g": float(consumido_g),
            "session_type": tipo,
            "periodo": row["periodo"],
        })

    return pd.DataFrame(sesiones)


def cross_check_discrepancias_alpha(sesiones: pd.DataFrame) -> pd.DataFrame:
    """
    Compara sesiones Gamma contra audit_events de Alpha (Abril). Solo documenta
    discrepancias — NO calcula métrica de acuerdo ni fusiona ambas fuentes.
    """
    if not ABRIL_AUDIT_CSV.exists():
        print("⚠️  audit_events.csv no encontrado — cross-check omitido")
        return pd.DataFrame()

    _audit = pd.read_csv(ABRIL_AUDIT_CSV, low_memory=False, encoding=CSV_ENCODING)
    discrepancias = []
    for _, row in sesiones[sesiones["periodo"] == "abril"].iterrows():
        discrepancias.append({
            "sesion_id": row["sesion_id"],
            "ts_inicio": row["ts_inicio"],
            "session_type_gamma": row["session_type"],
            "nota": "Cross-check pendiente de implementación contra columna real de audit_events",
        })

    return pd.DataFrame(discrepancias)


def main():
    print("=== g09_build_sessions_labeled.py — Ciclo Gamma · Fase 1 ===\n")

    if not SESIONES_CANDIDATAS_CSV.exists():
        raise FileNotFoundError("sesiones_candidatas.csv no existe — ejecutar g07 primero")

    sesiones_cand = pd.read_csv(SESIONES_CANDIDATAS_CSV)
    sesiones_cand["ts_inicio"] = pd.to_datetime(sesiones_cand["ts_inicio"], utc=True)
    sesiones_cand["ts_fin"] = pd.to_datetime(sesiones_cand["ts_fin"], utc=True)
    print(f"Candidatos cargados: {len(sesiones_cand):,}")

    eventos = cargar_anotaciones_gamma()
    print(f"Eventos de anotación cargados: {len(eventos):,}")

    sesiones = etiquetar_sesiones_candidatas(sesiones_cand, eventos)
    print(f"\nSesiones construidas: {len(sesiones):,}")
    print(sesiones["session_type"].value_counts().to_string())

    sin_match = sesiones[sesiones["session_type"] == "sin_clasificar"]
    if len(sin_match):
        print(f"\n⚠️  {len(sin_match)} candidatos sin evento de anotación coincidente")

    anom = sesiones[sesiones["consumido_g"] < -MIN_CONSUMED_G]
    if len(anom):
        out_anom = DIR_04_ANOTACION / "anomalias_sesiones.csv"
        anom.to_csv(out_anom, index=False)
        print(f"\n⚠️  {len(anom)} sesiones con subida de peso inusual → {out_anom}")

    discrepancias = cross_check_discrepancias_alpha(sesiones)
    if len(discrepancias):
        out_disc = DIR_04_ANOTACION / "discrepancias_vs_alpha.csv"
        discrepancias.to_csv(out_disc, index=False)
        print(f"\n📋 Discrepancias documentadas (sin fusionar) → {out_disc}")

    out = DIR_04_ANOTACION / "sessions_labeled.parquet"
    sesiones.to_parquet(out, index=False)
    print(f"\n✅ sessions_labeled.parquet → {out}")
    print("   Próximo: g10_quality_report.py")


if __name__ == "__main__":
    main()
