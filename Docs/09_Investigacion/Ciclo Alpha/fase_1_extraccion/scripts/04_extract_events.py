"""Script 04 - Extraer etiquetas manuales de KPCL0034.

Fuente oficial de etiquetas: public.audit_events (event_type = 'manual_bowl_category').

Modo primario : CSV dump (Data_2026/Abril_2026/kittypau_full_07-05-2026_csv/).
Fallback      : Supabase API (si el CSV no esta disponible).

Salida: fase_1_extraccion/data/raw/events_labeled.parquet
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

DEVICE_CODE = "KPCL0034"
PAGE_SIZE = 1000
CANONICAL_CATEGORIES = {
    "inicio_alimentacion",
    "termino_alimentacion",
    "inicio_servido",
    "termino_servido",
    "kpcl_sin_plato",
    "kpcl_con_plato",
    "tare_con_plato",
    "inicio_hidratacion",
    "termino_hidratacion",
}

# Path al dump CSV
CSV_DUMP_DIR = (
    Path(__file__).parent.parent.parent.parent
    / "Data_2026"
    / "Abril_2026"
    / "kittypau_full_07-05-2026_csv"
)


def _parse_payload(value: object) -> dict:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _normalize_utc(series: pd.Series) -> pd.Series:
    """Convierte timestamps con formatos mixtos de timezone a UTC."""
    return pd.to_datetime(series, utc=True, format="mixed", errors="coerce")


def load_from_csv() -> pd.DataFrame:
    print(f"[CSV] Modo CSV activo. Leyendo desde:\n      {CSV_DUMP_DIR}")

    devices = pd.read_csv(CSV_DUMP_DIR / "devices.csv", encoding="latin1")
    mask = devices["device_id"] == DEVICE_CODE
    if not mask.any():
        raise SystemExit(f"[ERROR CSV] '{DEVICE_CODE}' no encontrado en devices.csv")
    device_uuid = str(devices.loc[mask, "id"].iloc[0])
    print(f"[CSV] UUID de {DEVICE_CODE}: {device_uuid}")

    print("[CSV] Cargando audit_events.csv...")
    df = pd.read_csv(
        CSV_DUMP_DIR / "audit_events.csv",
        encoding="latin1",
        usecols=["event_type", "entity_id", "payload", "created_at"],
        dtype={"entity_id": str},
        low_memory=False,
    )
    print(f"[CSV] Total eventos en dump: {len(df):,}")

    # Filtrar: manual_bowl_category del device KPCL0034
    df = df[
        (df["event_type"] == "manual_bowl_category") &
        (df["entity_id"] == device_uuid)
    ].copy()
    print(f"[CSV] manual_bowl_category para {DEVICE_CODE}: {len(df):,}")
    return df


def load_from_supabase() -> pd.DataFrame:
    from _supabase_helpers import get_supabase_client, resolve_device_record

    device = resolve_device_record(DEVICE_CODE)
    if not device:
        raise SystemExit(f"[ERROR] No se encontro '{DEVICE_CODE}' en public.devices")
    device_uuid = device["id"]

    supabase = get_supabase_client()
    rows: list[dict] = []
    offset = 0
    page = 1
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
        print(f"  Pagina {page}: {len(batch)} filas (total: {len(rows)})")
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
        page += 1

    df = pd.DataFrame(rows)
    df = df.rename(columns={"created_at": "created_at"})
    return df


def build_events_df(df_raw: pd.DataFrame) -> pd.DataFrame:
    events = []
    skipped = 0
    for _, row in df_raw.iterrows():
        payload = _parse_payload(row.get("payload"))
        category = payload.get("category")
        if not category:
            # fallback: usar event_type como categoria si payload vacio
            category = row.get("event_type")
        if category not in CANONICAL_CATEGORIES:
            skipped += 1
            continue
        events.append({"ts": row["created_at"], "category": category, "source": "csv_dump"})

    if not events:
        raise SystemExit(f"[ERROR] No se encontraron etiquetas canonicas para {DEVICE_CODE}")

    df = pd.DataFrame(events)
    df["ts"] = _normalize_utc(df["ts"])
    df = df.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)

    print(f"\n[OK] Etiquetas canonicas encontradas: {len(df)}")
    print(df["category"].value_counts().to_string())
    if skipped:
        print(f"[AVISO] Omitidos {skipped} registros con categorias no canonicas")

    return df


def dedup_annotations(
    new_ann_df: pd.DataFrame,
    canonical_df: pd.DataFrame,
    window_s: int = 120,
) -> pd.DataFrame:
    """Elimina de new_ann_df los eventos que ya existen en canonical_df
    dentro de una ventana de ±window_s segundos para la misma categoría.
    Evita duplicados causados por anotaciones retroactivas que repiten sesiones
    ya presentes en audit_events con timestamps ligeramente distintos.
    """
    if new_ann_df.empty or canonical_df.empty:
        return new_ann_df

    delta = pd.Timedelta(seconds=window_s)
    keep = []
    for _, row in new_ann_df.iterrows():
        mask = (
            (canonical_df["category"] == row["category"])
            & (canonical_df["ts"] >= row["ts"] - delta)
            & (canonical_df["ts"] <= row["ts"] + delta)
        )
        if canonical_df[mask].empty:
            keep.append(row)

    if not keep:
        return pd.DataFrame(columns=new_ann_df.columns)
    return pd.DataFrame(keep).reset_index(drop=True)


def merge_new_annotations(df: pd.DataFrame) -> pd.DataFrame:
    """Fusiona anotaciones manuales locales (app_anotacion.py) si existen."""
    new_annot_path = (
        Path(__file__).parent.parent.parent
        / "fase_4_visualizacion"
        / "data"
        / "new_annotations.csv"
    )
    if not new_annot_path.exists():
        return df

    df_new = pd.read_csv(new_annot_path)
    if df_new.empty:
        return df

    df_new["ts"] = pd.to_datetime(df_new["ts"], utc=True, format="mixed", errors="coerce")
    df_new = df_new.dropna(subset=["ts"])
    df_new = df_new[df_new["category"].isin(CANONICAL_CATEGORIES)].copy()
    df_new["source"] = "manual_local"
    df_new = df_new[["ts", "category", "source"]]

    n_candidates = len(df_new)
    df_new = dedup_annotations(df_new, df, window_s=120)
    n_deduped = n_candidates - len(df_new)
    if n_deduped:
        print(f"[DEDUP] {n_deduped} anotaciones de new_annotations.csv descartadas por duplicado (±120s)")

    n_before = len(df)
    df = pd.concat([df, df_new], ignore_index=True)
    df = df.drop_duplicates(subset=["ts", "category"], keep="first")
    df = df.sort_values("ts").reset_index(drop=True)
    added = len(df) - n_before
    print(f"[MERGE] new_annotations.csv: {n_candidates} candidatas, {added} agregadas al dataset")
    return df


def main() -> None:
    if CSV_DUMP_DIR.exists():
        df_raw = load_from_csv()
    else:
        print(f"[INFO] CSV dump no encontrado en {CSV_DUMP_DIR}")
        print("[INFO] Usando Supabase como fuente de datos")
        df_raw = load_from_supabase()

    df = build_events_df(df_raw)
    df = merge_new_annotations(df)

    out_path = Path(__file__).parent.parent / "data" / "raw" / "events_labeled.parquet"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out_path, index=False)
    print(f"[OK] Guardado en: {out_path}")
    print(f"     Total eventos: {len(df)}")
    print("[info] Fuente oficial: public.audit_events + new_annotations.csv (si existe)")


if __name__ == "__main__":
    main()
