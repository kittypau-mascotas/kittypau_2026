import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fase_1_datos" / "scripts"))

import pandas as pd
import plotly.graph_objects as go

from _delta_utils import FASE1_DATA_PROC, FASE3_OUTPUTS

READINGS_DELTA_PATH     = FASE1_DATA_PROC / "readings_delta.parquet"
ANOMALIAS_CONSENSO_PATH = FASE3_OUTPUTS / "anomalias_consenso.csv"
REPORT_OUT              = FASE3_OUTPUTS / "anomaly_report" / "anomaly_report.md"
VIZ_OUT                 = FASE3_OUTPUTS / "visualizaciones" / "anomaly_timeline_por_tipo.html"

SIN_CARGADOR_INICIO = None
SIN_CARGADOR_FIN    = None


def clasificar_anomalia_row(row):
    clock_val = row.get("clock_invalid")
    if pd.notna(clock_val) and clock_val > 0.5:
        return "H"
    if SIN_CARGADOR_INICIO and SIN_CARGADOR_FIN:
        if SIN_CARGADOR_INICIO <= str(row["ts"]) <= SIN_CARGADOR_FIN:
            return "H"
    hora = row["ts"].hour
    if hora in range(6, 22):
        return "C"
    return "U"


def main():
    df_readings = pd.read_parquet(READINGS_DELTA_PATH)
    consenso    = pd.read_csv(ANOMALIAS_CONSENSO_PATH)

    df_readings["ts"] = pd.to_datetime(df_readings["ts"], utc=True)
    consenso["ts"]    = pd.to_datetime(consenso["ts"], utc=True)

    consenso = consenso.merge(
        df_readings[["ts", "clock_invalid"]], on="ts", how="left"
    )

    consenso["tipo"] = consenso.apply(clasificar_anomalia_row, axis=1)

    conteo_por_tipo = consenso["tipo"].value_counts()
    print(conteo_por_tipo)

    top10 = consenso.sort_values("votos", ascending=False).head(10)

    consenso["hora"]      = consenso["ts"].dt.hour
    consenso["dia_semana"] = consenso["ts"].dt.dayofweek

    REPORT_OUT.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Reporte de Anomalias — Ciclo Delta",
        "",
        f"Generado: {datetime.now().isoformat()}",
        "",
        "## Total por tipo",
        "",
    ]
    for tipo, n in conteo_por_tipo.items():
        lines.append(f"- Tipo {tipo}: {n}")
    lines.append("")
    lines.append("## Top 10 anomalias mas extremas (por votos de consenso)")
    lines.append("")
    lines.append(top10.to_markdown(index=False))
    REPORT_OUT.write_text("\n".join(lines), encoding="utf-8")

    fig = go.Figure()
    for tipo, color in [("H", "red"), ("C", "orange"), ("U", "gray")]:
        subset = consenso[consenso["tipo"] == tipo]
        fig.add_trace(go.Scatter(
            x=subset["ts"], y=subset["votos"], mode="markers",
            name=f"Tipo {tipo}", marker=dict(color=color),
        ))
    fig.update_layout(title="Timeline de anomalias por tipo")
    VIZ_OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.write_html(str(VIZ_OUT))
    print(f"Reporte escrito en: {REPORT_OUT}")


if __name__ == "__main__":
    main()
