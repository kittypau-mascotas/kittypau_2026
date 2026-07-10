"""
g03_unify_readings.py — Fase 1 Gamma
Carga readings.csv (Abril) + readings_rows.csv (Mayo-Jun o dump más reciente),
filtra KPCL0034, reescribe el UUID de Abril al canónico usando uuid_mapping.json,
resuelve clock_invalid → ts_utc, y exporta readings_unificado_utc.parquet.
"""
import json
import sys
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import (
    ABRIL_READINGS_CSV, MAYO_JUNIO_READINGS_CSV, UUID_MAPPING_JSON,
    KPCL0034_UUIDS, CSV_ENCODING, DIR_01_RAW, READINGS_UNIFICADO_UTC,
)

COLS_VESTIGIALES = ["water_ml", "flow_rate", "battery_is_estimated"]


def cargar_uuid_mapping() -> dict:
    if not UUID_MAPPING_JSON.exists():
        raise FileNotFoundError("uuid_mapping.json no existe — ejecutar g02_uuid_mapping.py primero")
    with open(UUID_MAPPING_JSON, encoding="utf-8") as f:
        return json.load(f)


def cargar_y_concatenar() -> pd.DataFrame:
    """Carga ambos CSV, alinea columnas y filtra por ambos UUIDs de KPCL0034."""
    print("Cargando readings.csv (Abril)...")
    df_abril = pd.read_csv(ABRIL_READINGS_CSV, encoding=CSV_ENCODING, low_memory=False)
    df_abril["_periodo"] = "abril"
    print(f"  Filas totales: {len(df_abril):,}")

    print("Cargando readings_rows.csv (Mayo-Jun)...")
    df_mayo = pd.read_csv(MAYO_JUNIO_READINGS_CSV, encoding=CSV_ENCODING, low_memory=False)
    df_mayo["_periodo"] = "mayo_jun"
    print(f"  Filas totales: {len(df_mayo):,}")

    # Alinear columnas — Abril y Mayo-Jun pueden tener columnas extra o faltantes
    cols_comunes = sorted(set(df_abril.columns) & set(df_mayo.columns))
    df = pd.concat(
        [df_abril[cols_comunes], df_mayo[cols_comunes]],
        ignore_index=True,
    )

    df_kpcl = df[df["device_id"].isin(KPCL0034_UUIDS)].copy()
    print(f"\nFilas KPCL0034 (ambos UUID, antes de unificar): {len(df_kpcl):,}")
    for uuid in KPCL0034_UUIDS:
        n = (df_kpcl["device_id"] == uuid).sum()
        if n == 0:
            print(f"  ⚠️  UUID {uuid} NO encontrado en los datos")
        else:
            print(f"  ✅ {uuid}: {n:,} filas")

    df_kpcl = df_kpcl.drop(columns=[c for c in COLS_VESTIGIALES if c in df_kpcl.columns])
    return df_kpcl


def aplicar_uuid_canonico(df: pd.DataFrame, mapping: dict) -> pd.DataFrame:
    """Reescribe device_id al UUID canónico. Debe ir ANTES de cualquier otro filtro."""
    df = df.copy()
    df["device_id_original"] = df["device_id"]
    df["device_id"] = df["device_id"].map(mapping["equivalencias"]).fillna(df["device_id"])
    n_reescritas = (df["device_id_original"] != df["device_id"]).sum()
    print(f"\nFilas reescritas al UUID canónico: {n_reescritas:,}")
    assert df["device_id"].nunique() == 1, "Debe quedar un único UUID tras la unificación"
    return df


MAPEO_BOOLEANO = {
    "t": True, "f": False, "true": True, "false": False,
    True: True, False: False, 1: True, 0: False,
}


def normalizar_clock_invalid(df: pd.DataFrame) -> pd.DataFrame:
    """
    Coerciona clock_invalid a booleano real. La fuente mezcla representaciones
    ('t'/'f' estilo Postgres en Abril, True/False en Mayo-Jun) — si se deja como
    string, pandas trata .mean() como concatenación de strings (no como promedio
    booleano) y produce un blob ilegible en vez de un porcentaje.
    """
    df = df.copy()
    crudo = df["clock_invalid"]
    normalizado = crudo.map(
        lambda v: MAPEO_BOOLEANO.get(v.strip().lower() if isinstance(v, str) else v)
    )
    n_no_mapeado = normalizado.isna().sum()
    if n_no_mapeado:
        valores_raros = crudo[normalizado.isna()].unique()[:10]
        print(f"  ⚠️  {n_no_mapeado} filas con clock_invalid no reconocible — "
              f"ejemplos: {list(valores_raros)}")
        print("     Se tratan como clock_invalid=True (asume el caso más conservador).")
    df["clock_invalid"] = normalizado.fillna(True).astype(bool)
    return df


def resolver_timestamps(df: pd.DataFrame) -> pd.DataFrame:
    """
    Resuelve ts_utc usando clock_invalid, por período (no global), porque Abril y
    Mayo-Jun tienen comportamiento distinto: Mayo-Jun está al 100% clock_invalid
    (error α-5), Abril mezclado.
    """
    df = normalizar_clock_invalid(df)
    df["ts_utc"] = pd.Series(pd.NaT, index=df.index, dtype="datetime64[ns, UTC]")
    for periodo in df["_periodo"].unique():
        mask = df["_periodo"] == periodo
        sub = df.loc[mask]
        pct_invalid = sub["clock_invalid"].mean()
        print(f"\n[{periodo}] clock_invalid: {pct_invalid * 100:.1f}%")
        if pct_invalid > 0.95:
            print(f"  → forzando ingested_at para todo el período {periodo}")
            df.loc[mask, "ts_utc"] = pd.to_datetime(sub["ingested_at"], utc=True, errors="coerce")
        else:
            df.loc[mask, "ts_utc"] = sub.apply(
                lambda r: pd.to_datetime(r["ingested_at"], utc=True)
                if r["clock_invalid"]
                else pd.to_datetime(r["recorded_at"], utc=True),
                axis=1,
            )

    n_nat = df["ts_utc"].isna().sum()
    if n_nat:
        print(f"\n⚠️  {n_nat} timestamps no parseables — se eliminan (registrar en quality report)")
        df = df.dropna(subset=["ts_utc"])

    df = df.sort_values("ts_utc").reset_index(drop=True)
    print(f"\nRango unificado: {df['ts_utc'].min()} → {df['ts_utc'].max()}")
    return df


def detectar_anomalias_peso(df: pd.DataFrame) -> None:
    """Reporta sin eliminar — exporta a anomalias_peso.csv para revisión manual."""
    import numpy as np
    from scipy import stats as scipy_stats

    anomalias = []
    neg = df[df["weight_grams"] < 0]
    if len(neg):
        anomalias.append(neg.assign(tipo_anomalia="peso_negativo"))

    z = np.abs(scipy_stats.zscore(df["weight_grams"].fillna(0)))
    spikes = df[z > 5]
    if len(spikes):
        anomalias.append(spikes.assign(tipo_anomalia="spike_zscore_gt5"))

    nans = df[df["weight_grams"].isna()]
    if len(nans):
        anomalias.append(nans.assign(tipo_anomalia="nan_weight"))

    if anomalias:
        df_anom = pd.concat(anomalias, ignore_index=True)
        out = DIR_01_RAW / "anomalias_peso.csv"
        df_anom.to_csv(out, index=False, encoding="utf-8")
        print(f"\n⚠️  {len(df_anom)} anomalías de peso → {out}")
    else:
        print("\n✅ Sin anomalías de peso detectadas.")


def main():
    print("=== g03_unify_readings.py — Ciclo Gamma · Fase 1 ===\n")
    DIR_01_RAW.mkdir(parents=True, exist_ok=True)
    READINGS_UNIFICADO_UTC.parent.mkdir(parents=True, exist_ok=True)

    mapping = cargar_uuid_mapping()
    df = cargar_y_concatenar()
    df = aplicar_uuid_canonico(df, mapping)
    df = resolver_timestamps(df)
    detectar_anomalias_peso(df)

    df.to_parquet(READINGS_UNIFICADO_UTC, index=False)
    print(f"\n✅ readings_unificado_utc.parquet: {len(df):,} filas → {READINGS_UNIFICADO_UTC}")
    print("   Próximo: g04_resample_30s.py")


if __name__ == "__main__":
    main()