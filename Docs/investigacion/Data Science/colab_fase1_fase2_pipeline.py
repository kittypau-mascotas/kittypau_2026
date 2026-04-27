"""KPCL0034 - Fase 1 + Fase 2 unificadas para Google Colab.

Este script consolida el flujo de:
1) Extraccion de readings y eventos desde Supabase.
2) Reconstruccion de sesiones.
3) Construccion de labels, features, split temporal y reporte de dataset.

Pensado para ejecutarse como script unico en Colab o en un entorno local.
Por defecto trabaja con KPCL0034 y con el alcance activo de alimentacion.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client


# -----------------------------------------------------------------------------
# Configuracion
# -----------------------------------------------------------------------------

DEVICE_CODE = os.getenv("KPCL_DEVICE_CODE", "KPCL0034")
FECHA_INICIO = os.getenv("KPCL_FECHA_INICIO", "2026-04-08T00:00:00+00:00")
PAGE_SIZE = 1000

CANONICAL_CATEGORIES = {
    "inicio_alimentacion",
    "termino_alimentacion",
    "inicio_servido",
    "termino_servido",
    "kpcl_sin_plato",
    "kpcl_con_plato",
    "tare_con_plato",
}

LABEL_ORDER = ["alimentacion", "servido", "reposo"]
GAP_CUTOFF_S = 300
PLATEAU_THRESHOLD = 1.5

BASE_DIR = Path.cwd()
PIPELINE_DIR = BASE_DIR / "kpcl_datascience"
F1_RAW_DIR = PIPELINE_DIR / "fase_1_extraccion" / "data" / "raw"
F2_INTERIM_DIR = PIPELINE_DIR / "fase_2_dataset" / "data" / "interim"
F2_TRAIN_DIR = PIPELINE_DIR / "fase_2_dataset" / "data" / "train"
F2_REPORT_DIR = PIPELINE_DIR / "fase_2_dataset" / "outputs" / "dataset_report"

FEATURE_COLS = [
    "weight_grams",
    "delta_w",
    "delta_w_3",
    "delta_w_10",
    "rate_gs",
    "rolling_std_5",
    "rolling_std_10",
    "rolling_mean_5",
    "net_weight",
    "is_plateau",
    "plateau_duration",
    "hour_sin",
    "hour_cos",
    "clock_invalid",
]


# -----------------------------------------------------------------------------
# Supabase helpers
# -----------------------------------------------------------------------------

def load_environment() -> None:
    env_paths = [
        Path("/content/.env.local"),
        Path(".env.local"),
        Path.cwd() / ".env.local",
    ]
    for env_path in env_paths:
        if env_path.exists():
            load_dotenv(env_path)


def get_supabase_client():
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit(
            "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY "
            "en el entorno."
        )
    return create_client(url, key)


def resolve_device_record(supabase, device_code: str) -> dict | None:
    res = (
        supabase.table("devices")
        .select("id,device_id,status,last_seen,device_type,owner_id,pet_id")
        .eq("device_id", device_code)
        .maybe_single()
        .execute()
    )
    return res.data


# -----------------------------------------------------------------------------
# Phase 1 helpers
# -----------------------------------------------------------------------------

def parse_payload(value: object) -> dict[str, object]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def ensure_dirs() -> None:
    for path in [F1_RAW_DIR, F2_INTERIM_DIR, F2_TRAIN_DIR, F2_REPORT_DIR]:
        path.mkdir(parents=True, exist_ok=True)


def extract_readings(supabase, device_uuid: str) -> pd.DataFrame:
    rows: list[dict] = []
    offset = 0
    while True:
        res = (
            supabase.table("readings")
            .select(
                "recorded_at,ingested_at,weight_grams,temperature,"
                "humidity,battery_level,clock_invalid"
            )
            .eq("device_id", device_uuid)
            .gte("recorded_at", FECHA_INICIO)
            .order("recorded_at", desc=False)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        batch = res.data or []
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    df = pd.DataFrame(rows)
    if df.empty:
        raise SystemExit("[ERROR] No se extrajeron filas de readings")

    df["recorded_at"] = pd.to_datetime(df["recorded_at"], utc=True, format="mixed", errors="coerce")
    df["ingested_at"] = pd.to_datetime(df["ingested_at"], utc=True, format="mixed", errors="coerce")
    df = df.dropna(subset=["recorded_at", "ingested_at"]).copy()
    df["ts"] = np.where(df["clock_invalid"] == True, df["ingested_at"], df["recorded_at"])
    df["ts"] = pd.to_datetime(df["ts"], utc=True, format="mixed", errors="coerce")
    df = df[df["ts"].notna()].copy()
    df = df.sort_values(["ts", "weight_grams"], ascending=[True, False])
    df = df.drop_duplicates(subset=["ts"], keep="first").reset_index(drop=True)
    return df


def extract_events(supabase, device_uuid: str) -> pd.DataFrame:
    rows: list[dict] = []
    offset = 0
    while True:
        res = (
            supabase.table("audit_events")
            .select("created_at,payload,event_type,entity_id")
            .eq("event_type", "manual_bowl_category")
            .eq("entity_id", device_uuid)
            .order("created_at", desc=False)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        batch = res.data or []
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    events: list[dict[str, object]] = []
    for row in rows:
        payload = parse_payload(row.get("payload"))
        category = payload.get("category")
        if category not in CANONICAL_CATEGORIES:
            continue
        events.append({"ts": row["created_at"], "category": category, "source": "supabase"})

    df = pd.DataFrame(events)
    if df.empty:
        raise SystemExit(f"[ERROR] No se encontraron etiquetas canonicas para {DEVICE_CODE}")
    df["ts"] = pd.to_datetime(df["ts"], utc=True, format="mixed", errors="coerce")
    df = df.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)
    return df


def build_sessions(df_events: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    sessions = []
    open_starts: dict[str, dict[str, object]] = {}
    anomalies = []

    for _, row in df_events.sort_values("ts").iterrows():
        cat = row["category"]
        if cat.startswith("inicio_"):
            stype = cat.replace("inicio_", "")
            if stype in {"alimentacion", "servido"}:
                if stype in open_starts:
                    prev = open_starts[stype]
                    anomalies.append(
                        {
                            "ts": prev["start"],
                            "category": f"inicio_{stype}",
                            "reason": "inicio_duplicado_reemplazado_por_inicio_mas_reciente",
                        }
                    )
                open_starts[stype] = {"start": row["ts"], "source": row["source"]}
        elif cat.startswith("termino_"):
            stype = cat.replace("termino_", "")
            if stype in open_starts and open_starts[stype]:
                info = open_starts.pop(stype)
                duration = (row["ts"] - info["start"]).total_seconds()
                sessions.append(
                    {
                        "start": info["start"],
                        "end": row["ts"],
                        "session_type": stype,
                        "duration_s": duration,
                        "source": info["source"],
                    }
                )
            else:
                anomalies.append(
                    {
                        "ts": row["ts"],
                        "category": cat,
                        "reason": "termino_sin_inicio_correspondiente",
                    }
                )

    for stype, info in open_starts.items():
        anomalies.append(
            {
                "ts": info["start"],
                "category": f"inicio_{stype}",
                "reason": "inicio_sin_termino_correspondiente",
            }
        )

    return pd.DataFrame(sessions), pd.DataFrame(anomalies)


def save_phase1_outputs(df_readings: pd.DataFrame, df_events: pd.DataFrame, df_sessions: pd.DataFrame) -> None:
    df_readings.to_parquet(F1_RAW_DIR / "readings_raw.parquet", index=False)
    df_events.to_parquet(F1_RAW_DIR / "events_labeled.parquet", index=False)
    df_sessions.to_parquet(F1_RAW_DIR / "sessions_labeled.parquet", index=False)

    quality_lines = []
    quality_lines.append("=" * 60)
    quality_lines.append(f"REPORTE DE CALIDAD - {DEVICE_CODE} - FASE 1")
    quality_lines.append("=" * 60)
    quality_lines.append("")
    quality_lines.append("READINGS")
    quality_lines.append(f"  Total filas          : {len(df_readings):,}")
    quality_lines.append(f"  Rango temporal       : {df_readings['ts'].min()} -> {df_readings['ts'].max()}")
    quality_lines.append(f"  clock_invalid=True   : {df_readings['clock_invalid'].sum():,}")
    quality_lines.append("")
    quality_lines.append("ETIQUETAS")
    quality_lines.append(f"  Total etiquetas      : {len(df_events)}")
    for cat, cnt in df_events["category"].value_counts().items():
        quality_lines.append(f"    {cat:<30}: {cnt}")
    quality_lines.append("")
    quality_lines.append("SESIONES RECONSTRUIDAS")
    quality_lines.append(f"  Total sesiones       : {len(df_sessions)}")
    if not df_sessions.empty:
        for stype in df_sessions["session_type"].unique():
            sub = df_sessions[df_sessions["session_type"] == stype]
            quality_lines.append(
                f"  {stype}: N={len(sub)} dur_media={sub['duration_s'].mean():.0f}s"
            )
    quality_lines.append("")

    (PIPELINE_DIR / "fase_1_extraccion" / "outputs" / "quality_report").mkdir(parents=True, exist_ok=True)
    quality_report = PIPELINE_DIR / "fase_1_extraccion" / "outputs" / "quality_report" / "quality_report.txt"
    quality_report.write_text("\n".join(quality_lines), encoding="utf-8")


# -----------------------------------------------------------------------------
# Phase 2 helpers
# -----------------------------------------------------------------------------

def load_readings() -> pd.DataFrame:
    df = pd.read_parquet(F1_RAW_DIR / "readings_raw.parquet")
    df["ts"] = pd.to_datetime(df["ts"], utc=True, errors="coerce")
    return df.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)


def load_sessions() -> pd.DataFrame:
    df = pd.read_parquet(F1_RAW_DIR / "sessions_labeled.parquet")
    if df.empty:
        return df
    df["start"] = pd.to_datetime(df["start"], utc=True, errors="coerce")
    df["end"] = pd.to_datetime(df["end"], utc=True, errors="coerce")
    return df.dropna(subset=["start", "end"]).sort_values(["start", "end"]).reset_index(drop=True)


def validate_sessions(df_sessions: pd.DataFrame) -> None:
    if df_sessions.empty:
        raise SystemExit("[ERROR] sessions_labeled.parquet esta vacio")
    bad_types = sorted(set(df_sessions["session_type"]) - {"alimentacion", "servido"})
    if bad_types:
        raise SystemExit(f"[ERROR] session_type inesperado: {bad_types}")

    prev_end = None
    prev_row = None
    overlaps = []
    for _, row in df_sessions.iterrows():
        if prev_end is not None and row["start"] < prev_end:
            overlaps.append(
                {
                    "prev_start": prev_row["start"],
                    "prev_end": prev_end,
                    "start": row["start"],
                    "end": row["end"],
                    "session_type": row["session_type"],
                }
            )
        prev_end = row["end"]
        prev_row = row

    if overlaps:
        details = "; ".join(
            f"{x['prev_start']}->{x['prev_end']} overlaps {x['start']}->{x['end']} ({x['session_type']})"
            for x in overlaps[:5]
        )
        raise SystemExit(f"[ERROR] Se detectaron solapamientos: {details}")


def remove_subsecond_duplicates(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    if df.empty:
        return df.copy(), 0
    ts = pd.to_datetime(df["ts"], utc=True, errors="coerce")
    dt = ts.diff().dt.total_seconds()
    keep = ~((dt > 0) & (dt < 1))
    keep.iloc[0] = True
    out = df.loc[keep].reset_index(drop=True)
    out = out.drop_duplicates(subset=["ts"], keep="first").reset_index(drop=True)
    return out, int(len(df) - len(out))


def add_gap_segments(df: pd.DataFrame, gap_cutoff_s: int = GAP_CUTOFF_S) -> pd.DataFrame:
    out = df.copy()
    out["gap_after_s"] = out["ts"].diff().dt.total_seconds()
    out["segment_break"] = out["gap_after_s"].gt(gap_cutoff_s).fillna(False)
    out["segment_id"] = out["segment_break"].cumsum().astype("int64")
    out["segment_start"] = out["segment_break"].astype(int)
    return out


def group_transform(df: pd.DataFrame, series_name: str, func) -> pd.Series:
    return df.groupby("segment_id", group_keys=False)[series_name].transform(func)


def compute_segment_features(df: pd.DataFrame) -> pd.DataFrame:
    out = add_gap_segments(df)
    out["weight_missing"] = out["weight_grams"].isna().astype(int)
    out["weight_grams"] = out.groupby("segment_id", group_keys=False)["weight_grams"].transform(
        lambda s: s.interpolate(limit_direction="both").ffill().bfill()
    )
    out["dt_seconds"] = group_transform(
        out, "ts", lambda s: s.diff().dt.total_seconds().fillna(30).clip(1, GAP_CUTOFF_S)
    )
    out["delta_w"] = group_transform(out, "weight_grams", lambda s: s.diff().fillna(0))
    out["delta_w_3"] = group_transform(out, "weight_grams", lambda s: s.diff(3).fillna(0))
    out["delta_w_10"] = group_transform(out, "weight_grams", lambda s: s.diff(10).fillna(0))
    out["rate_gs"] = (out["delta_w"] / out["dt_seconds"]).replace([np.inf, -np.inf], 0).fillna(0).clip(-10, 10)
    out["rolling_std_5"] = group_transform(out, "weight_grams", lambda s: s.rolling(5, min_periods=2).std().fillna(0))
    out["rolling_std_10"] = group_transform(out, "weight_grams", lambda s: s.rolling(10, min_periods=3).std().fillna(0))
    out["rolling_mean_5"] = group_transform(out, "weight_grams", lambda s: s.rolling(5, min_periods=2).mean().fillna(s))
    out["baseline_w"] = group_transform(
        out, "weight_grams", lambda s: s.rolling(60, min_periods=10).quantile(0.10).fillna(s)
    )
    out["net_weight"] = out["weight_grams"] - out["baseline_w"]
    out["is_plateau"] = (out["rolling_std_5"] < PLATEAU_THRESHOLD).astype(int)
    out["plateau_duration"] = group_transform(
        out,
        "is_plateau",
        lambda s: s.groupby((s != s.shift()).cumsum()).cumcount().add(1).mul(s),
    )
    hour = out["ts"].dt.hour + out["ts"].dt.minute / 60 + out["ts"].dt.second / 3600
    out["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    out["hour_cos"] = np.cos(2 * np.pi * hour / 24)
    out["gap_after_s"] = out["gap_after_s"].fillna(0)
    out["segment_start"] = out["segment_start"].fillna(1).astype(int)
    return out


def encode_labels(series: pd.Series) -> pd.Series:
    mapping = {label: idx for idx, label in enumerate(LABEL_ORDER)}
    unknown = sorted(set(series.unique()) - set(mapping))
    if unknown:
        raise SystemExit(f"[ERROR] Labels inesperadas: {unknown}")
    return series.map(mapping).astype("int64")


def split_temporal(df: pd.DataFrame, train_ratio: float = 0.70, val_ratio: float = 0.15):
    n = len(df)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))
    return (
        df.iloc[:train_end].reset_index(drop=True),
        df.iloc[train_end:val_end].reset_index(drop=True),
        df.iloc[val_end:].reset_index(drop=True),
    )


def class_distribution(series: pd.Series) -> dict[str, int]:
    return {str(k): int(v) for k, v in series.value_counts().to_dict().items()}


def class_weights(series: pd.Series) -> dict[str, float]:
    counts = series.value_counts()
    if counts.empty:
        return {}
    n_classes = len(counts)
    total = float(counts.sum())
    return {
        label: round(total / (n_classes * float(count)), 6)
        for label, count in counts.items()
        if count > 0
    }


def save_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, default=str), encoding="utf-8")


def build_phase2_dataset() -> None:
    ensure_dirs()

    df_r = load_readings()
    df_s = load_sessions()
    validate_sessions(df_s)

    df_r["label"] = "reposo"
    for _, ses in df_s.iterrows():
        mask = (df_r["ts"] >= ses["start"]) & (df_r["ts"] <= ses["end"])
        df_r.loc[mask, "label"] = ses["session_type"]

    df_r = df_r.sort_values("ts").reset_index(drop=True)
    df_r, removed = remove_subsecond_duplicates(df_r)
    print(f"[OK] Duplicados sub-segundo eliminados: {removed}")

    df_r = compute_segment_features(df_r)
    out_path = F2_INTERIM_DIR / "readings_features.parquet"
    df_r.to_parquet(out_path, index=False)

    dist = df_r["label"].value_counts()
    print("")
    print("Distribucion de clases:")
    for lbl, cnt in dist.items():
        print(f"  {lbl:<20}: {cnt:>6,} ({cnt / len(df_r) * 100:.1f}%)")

    df_train, df_val, df_test = split_temporal(df_r, 0.70, 0.15)

    X_train = df_train[FEATURE_COLS].reset_index(drop=True)
    X_val = df_val[FEATURE_COLS].reset_index(drop=True)
    X_test = df_test[FEATURE_COLS].reset_index(drop=True)
    y_train = encode_labels(df_train["label"]).rename("label")
    y_val = encode_labels(df_val["label"]).rename("label")
    y_test = encode_labels(df_test["label"]).rename("label")

    for name, data in [
        ("X_train", X_train),
        ("X_val", X_val),
        ("X_test", X_test),
        ("y_train", y_train.to_frame()),
        ("y_val", y_val.to_frame()),
        ("y_test", y_test.to_frame()),
    ]:
        data.to_parquet(F2_TRAIN_DIR / f"{name}.parquet", index=False)

    encoder_data = {
        "classes": LABEL_ORDER,
        "encoding": {label: idx for idx, label in enumerate(LABEL_ORDER)},
        "inverse_encoding": {idx: label for idx, label in enumerate(LABEL_ORDER)},
    }
    save_json(F2_TRAIN_DIR / "label_encoder.json", encoder_data)

    meta = {
        "feature_cols": FEATURE_COLS,
        "target": "label",
        "n_train": len(X_train),
        "n_val": len(X_val),
        "n_test": len(X_test),
        "train_date_range": [str(df_train["ts"].min()), str(df_train["ts"].max())],
        "val_date_range": [str(df_val["ts"].min()), str(df_val["ts"].max())],
        "test_date_range": [str(df_test["ts"].min()), str(df_test["ts"].max())],
        "class_distribution": class_distribution(df_r["label"]),
        "class_weights_train": class_weights(df_train["label"]),
    }
    save_json(F2_TRAIN_DIR / "dataset_meta.json", meta)

    ratio = y_train.value_counts().max() / y_train.value_counts().min()
    report_lines = []
    report_lines.append("=" * 60)
    report_lines.append(f"REPORTE DE DATASET - {DEVICE_CODE} - FASE 2")
    report_lines.append("=" * 60)
    report_lines.append("")
    report_lines.append("SPLIT TEMPORAL")
    report_lines.append(f"  Train : {len(df_train):>6,} filas  {meta['train_date_range'][0][:10]} -> {meta['train_date_range'][1][:10]}")
    report_lines.append(f"  Val   : {len(df_val):>6,} filas  {meta['val_date_range'][0][:10]} -> {meta['val_date_range'][1][:10]}")
    report_lines.append(f"  Test  : {len(df_test):>6,} filas  {meta['test_date_range'][0][:10]} -> {meta['test_date_range'][1][:10]}")
    report_lines.append("")
    report_lines.append("DISTRIBUCION DE CLASES EN TRAIN")
    for cls_id, cnt in y_train.value_counts().items():
        lbl = LABEL_ORDER[int(cls_id)]
        report_lines.append(f"  {lbl:<20}: {cnt:>6,} ({cnt/len(y_train)*100:.1f}%)")
    report_lines.append("")
    report_lines.append("DISTRIBUCION DE CLASES EN VAL")
    for cls_id, cnt in y_val.value_counts().items():
        lbl = LABEL_ORDER[int(cls_id)]
        report_lines.append(f"  {lbl:<20}: {cnt:>6,} ({cnt/len(y_val)*100:.1f}%)")
    report_lines.append("")
    report_lines.append("DISTRIBUCION DE CLASES EN TEST")
    for cls_id, cnt in y_test.value_counts().items():
        lbl = LABEL_ORDER[int(cls_id)]
        report_lines.append(f"  {lbl:<20}: {cnt:>6,} ({cnt/len(y_test)*100:.1f}%)")
    report_lines.append("")
    report_lines.append("CALIDAD DE FEATURES")
    report_lines.append(f"  [OK] No hay NaN en X_train: {int(X_train.isna().sum().sum()) == 0}")
    report_lines.append("")
    report_lines.append("BALANCE DE CLASES")
    report_lines.append(f"  Ratio clase mayoritaria / minoritaria: {ratio:.1f}x")
    report_lines.append("  [AVISO] Desbalance alto. Usar class_weight=balanced.")
    report_lines.append("")
    report_lines.append("PESOS SUGERIDOS PARA ENTRENAMIENTO")
    for label, weight in meta["class_weights_train"].items():
        report_lines.append(f"  {label:<20}: {weight}")
    report_lines.append("")
    report_lines.append("=" * 60)
    report_lines.append("Fase 2 completada.")
    report_lines.append("=" * 60)
    (F2_REPORT_DIR / "dataset_report.txt").write_text("\n".join(report_lines), encoding="utf-8")


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

def main() -> None:
    load_environment()
    ensure_dirs()

    supabase = get_supabase_client()
    device = resolve_device_record(supabase, DEVICE_CODE)
    if not device:
        raise SystemExit(f"[ERROR] No se encontro '{DEVICE_CODE}' en public.devices")

    device_uuid = device["id"]
    print(f"[INFO] Device resuelto: {DEVICE_CODE} -> {device_uuid}")

    print("[INFO] Extrayendo readings...")
    df_readings = extract_readings(supabase, device_uuid)

    print("[INFO] Extrayendo eventos manuales...")
    df_events = extract_events(supabase, device_uuid)

    print("[INFO] Reconstruyendo sesiones...")
    df_sessions, df_anomalies = build_sessions(df_events)
    if not df_anomalies.empty:
        print(f"[AVISO] Anomalias detectadas: {len(df_anomalies)}")

    save_phase1_outputs(df_readings, df_events, df_sessions)
    print(f"[OK] Fase 1 guardada en: {F1_RAW_DIR}")

    print("[INFO] Construyendo dataset de Fase 2...")
    build_phase2_dataset()
    print(f"[OK] Fase 2 guardada en: {F2_TRAIN_DIR}")
    print(f"[OK] Reporte guardado en: {F2_REPORT_DIR / 'dataset_report.txt'}")


if __name__ == "__main__":
    main()
