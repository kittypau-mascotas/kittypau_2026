"""Script 04 - Extraer etiquetas manuales de KPCL0034 desde Supabase.

Fuente oficial operativa:
- `public.audit_events` con `event_type = 'manual_bowl_category'`

Este script obtiene todo directamente desde Supabase, pagina resultados y
filtra solo las categorias canonicas que forman parte del pipeline.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from _supabase_helpers import get_supabase_client, resolve_device_record

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


def _parse_payload(value: object) -> dict[str, object]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def main() -> None:
    try:
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
    except SystemExit:
        raise
    except Exception as exc:
        raise SystemExit(f"[ERROR] Fallo la extraccion de audit_events en Supabase: {exc}") from exc

    events: list[dict[str, object]] = []
    skipped = 0
    print(f"Total filas audit_events recuperadas: {len(rows)}")
    for row in rows:
        payload = _parse_payload(row.get("payload"))
        category = payload.get("category")
        if category not in CANONICAL_CATEGORIES:
            skipped += 1
            continue
        events.append(
            {
                "ts": row["created_at"],
                "category": category,
                "source": "supabase",
            }
        )

    df_all = pd.DataFrame(events)
    if df_all.empty:
        raise SystemExit(f"[ERROR] No se encontraron etiquetas canonicas para {DEVICE_CODE} en Supabase")

    df_all["ts"] = pd.to_datetime(df_all["ts"], utc=True, format="mixed", errors="coerce")
    df_all = df_all.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)

    print(f"Etiquetas desde Supabase: {len(df_all)}")
    print(df_all["category"].value_counts())
    if skipped:
        print(f"[AVISO] Se omitieron {skipped} registros con categorias no canonicas")
    print("[info] Fuente oficial: public.audit_events")

    out_path = Path(__file__).parent.parent / "data" / "raw" / "events_labeled.parquet"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df_all.to_parquet(out_path, index=False)
    print(f"[OK] Guardado en: {out_path}")


if __name__ == "__main__":
    main()
