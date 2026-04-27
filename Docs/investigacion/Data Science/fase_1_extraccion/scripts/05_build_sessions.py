"""Script 05 - Reconstruir sesiones de alimentacion."""

from __future__ import annotations

from pathlib import Path

import pandas as pd


def build_sessions(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    sessions = []
    open_starts: dict[str, dict[str, object]] = {}
    anomalies = []
    for _, row in df.sort_values("ts").iterrows():
        cat = row["category"]
        if cat.startswith("inicio_"):
            stype = cat.replace("inicio_", "")
            if stype in {"alimentacion", "servido", "hidratacion"}:
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


def main() -> None:
    data_dir = Path(__file__).parent.parent / "data" / "raw"
    df_events = pd.read_parquet(data_dir / "events_labeled.parquet")

    df_sessions, df_anomalies = build_sessions(df_events)
    print(f"Sesiones reconstruidas: {len(df_sessions)}")
    if not df_sessions.empty:
        print(df_sessions.groupby("session_type")[["duration_s"]].describe().round(1))

    if not df_anomalies.empty:
        print(f"[AVISO] Anomalias detectadas: {len(df_anomalies)}")
        print(df_anomalies.sort_values("ts")[["ts", "category", "reason"]].to_string(index=False))

    out_path = data_dir / "sessions_labeled.parquet"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df_sessions.to_parquet(out_path, index=False)
    print(f"[OK] Guardado en: {out_path}")


if __name__ == "__main__":
    main()
