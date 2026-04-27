"""Shared helpers for Fase 2 dataset building."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).parent.parent
F1_RAW = BASE_DIR.parent / "fase_1_extraccion" / "data" / "raw"
INTERIM_DIR = BASE_DIR / "data" / "interim"
TRAIN_DIR = BASE_DIR / "data" / "train"
REPORT_DIR = BASE_DIR / "outputs" / "dataset_report"
LABEL_ORDER = ["alimentacion", "servido", "reposo"]
GAP_CUTOFF_S = 300
FAST_DUPLICATE_CUTOFF_S = 1
PLATEAU_THRESHOLD = 1.5


def ensure_phase2_dirs() -> None:
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)
    TRAIN_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)


def load_readings() -> pd.DataFrame:
    df = pd.read_parquet(F1_RAW / "readings_raw.parquet")
    df["ts"] = pd.to_datetime(df["ts"], utc=True, errors="coerce")
    df = df.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)
    return df


def load_sessions() -> pd.DataFrame:
    df = pd.read_parquet(F1_RAW / "sessions_labeled.parquet")
    if df.empty:
        return df
    df["start"] = pd.to_datetime(df["start"], utc=True, errors="coerce")
    df["end"] = pd.to_datetime(df["end"], utc=True, errors="coerce")
    df = df.dropna(subset=["start", "end"]).sort_values(["start", "end"]).reset_index(drop=True)
    return df


def load_events() -> pd.DataFrame:
    df = pd.read_parquet(F1_RAW / "events_labeled.parquet")
    if not df.empty:
        df["ts"] = pd.to_datetime(df["ts"], utc=True, errors="coerce")
        df = df.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)
    return df


def validate_sessions(df_sessions: pd.DataFrame) -> None:
    if df_sessions.empty:
        raise SystemExit("[ERROR] sessions_labeled.parquet esta vacio")
    bad_types = sorted(set(df_sessions["session_type"]) - {"alimentacion", "servido", "hidratacion"})
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
        raise SystemExit(f"[ERROR] Se detectaron solapamientos en sessions_labeled.parquet: {details}")


def remove_subsecond_duplicates(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    if df.empty:
        return df.copy(), 0
    ts = pd.to_datetime(df["ts"], utc=True, errors="coerce")
    dt = ts.diff().dt.total_seconds()
    keep = ~((dt > 0) & (dt < 1))
    keep.iloc[0] = True
    out = df.loc[keep].reset_index(drop=True)
    out = out.drop_duplicates(subset=["ts"], keep="first").reset_index(drop=True)
    removed = int(len(df) - len(out))
    return out, removed


def add_gap_segments(df: pd.DataFrame, gap_cutoff_s: int = GAP_CUTOFF_S) -> pd.DataFrame:
    out = df.copy()
    out["gap_after_s"] = out["ts"].diff().dt.total_seconds()
    out["segment_break"] = out["gap_after_s"].gt(gap_cutoff_s).fillna(False)
    out["segment_id"] = out["segment_break"].cumsum().astype("int64")
    out["segment_start"] = out["segment_break"].astype(int)
    return out


def _group_transform(df: pd.DataFrame, series_name: str, func) -> pd.Series:
    return df.groupby("segment_id", group_keys=False)[series_name].transform(func)


def compute_segment_features(df: pd.DataFrame) -> pd.DataFrame:
    out = add_gap_segments(df)
    out["weight_missing"] = out["weight_grams"].isna().astype(int)
    out["weight_grams"] = out.groupby("segment_id", group_keys=False)["weight_grams"].transform(
        lambda s: s.interpolate(limit_direction="both").ffill().bfill()
    )
    out["dt_seconds"] = _group_transform(out, "ts", lambda s: s.diff().dt.total_seconds().fillna(30).clip(1, GAP_CUTOFF_S))
    out["delta_w"] = _group_transform(out, "weight_grams", lambda s: s.diff().fillna(0))
    out["delta_w_3"] = _group_transform(out, "weight_grams", lambda s: s.diff(3).fillna(0))
    out["delta_w_10"] = _group_transform(out, "weight_grams", lambda s: s.diff(10).fillna(0))
    out["rate_gs"] = (out["delta_w"] / out["dt_seconds"]).replace([np.inf, -np.inf], 0).fillna(0).clip(-10, 10)
    out["rolling_std_5"] = _group_transform(out, "weight_grams", lambda s: s.rolling(5, min_periods=2).std().fillna(0))
    out["rolling_std_10"] = _group_transform(out, "weight_grams", lambda s: s.rolling(10, min_periods=3).std().fillna(0))
    out["rolling_mean_5"] = _group_transform(out, "weight_grams", lambda s: s.rolling(5, min_periods=2).mean().fillna(s))
    out["baseline_w"] = _group_transform(
        out,
        "weight_grams",
        lambda s: s.rolling(60, min_periods=10).quantile(0.10).fillna(s),
    )
    out["net_weight"] = out["weight_grams"] - out["baseline_w"]
    out["is_plateau"] = (out["rolling_std_5"] < PLATEAU_THRESHOLD).astype(int)
    out["plateau_duration"] = _group_transform(
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


def label_to_code_map() -> dict[str, int]:
    return {label: idx for idx, label in enumerate(LABEL_ORDER)}


def code_to_label_map() -> dict[int, str]:
    return {idx: label for idx, label in enumerate(LABEL_ORDER)}


def encode_labels(series: pd.Series) -> pd.Series:
    mapping = label_to_code_map()
    unknown = sorted(set(series.unique()) - set(mapping))
    if unknown:
        raise SystemExit(f"[ERROR] Labels inesperadas: {unknown}")
    return series.map(mapping).astype("int64")


def split_temporal(df: pd.DataFrame, train_ratio: float = 0.70, val_ratio: float = 0.15) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    n = len(df)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))
    df_train = df.iloc[:train_end].reset_index(drop=True)
    df_val = df.iloc[train_end:val_end].reset_index(drop=True)
    df_test = df.iloc[val_end:].reset_index(drop=True)
    return df_train, df_val, df_test


def save_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, default=str), encoding="utf-8")


def class_distribution(series: pd.Series) -> dict:
    return {str(k): int(v) for k, v in series.value_counts().to_dict().items()}


def class_weights(series: pd.Series) -> dict[str, float]:
    """Balanced class weights for imbalanced training."""
    counts = series.value_counts()
    if counts.empty:
        return {}

    n_classes = len(counts)
    total = float(counts.sum())
    weights: dict[str, float] = {}
    for label in LABEL_ORDER:
        count = counts.get(label)
        if count is None or count == 0:
            continue
        weights[label] = round(total / (n_classes * float(count)), 6)
    return weights
