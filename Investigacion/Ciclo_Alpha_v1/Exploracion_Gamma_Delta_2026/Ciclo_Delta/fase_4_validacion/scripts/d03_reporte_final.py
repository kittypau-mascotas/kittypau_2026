import sys
import json
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fase_1_datos" / "scripts"))

import pandas as pd

from _delta_utils import FASE2_OUTPUTS, FASE3_OUTPUTS, FASE4_OUTPUTS

CLUSTERING_COMPARISON = FASE2_OUTPUTS / "cluster_report" / "clustering_comparison.csv"
ANOMALY_REPORT_MD     = FASE3_OUTPUTS / "anomaly_report" / "anomaly_report.md"
CROSS_CHECK_JSON      = FASE4_OUTPUTS / "cross_check_report" / "cross_check_results.json"
CANDIDATOS_NUEVOS     = FASE4_OUTPUTS / "candidatos_servido_delta_nuevos.csv"
REPORTE_FINAL_OUT     = FASE4_OUTPUTS / "reporte_final_delta.md"


def leer_si_existe(path, loader):
    p = Path(path)
    if not p.exists():
        print(f"Aviso: no se encontro {path}, seccion incompleta en el reporte.")
        return None
    return loader(p)


def main():
    clustering_df       = leer_si_existe(CLUSTERING_COMPARISON, pd.read_csv)
    cross_check         = leer_si_existe(
        CROSS_CHECK_JSON, lambda p: json.loads(p.read_text(encoding="utf-8"))
    )
    candidatos_df       = leer_si_existe(CANDIDATOS_NUEVOS, pd.read_csv)
    anomaly_report_text = leer_si_existe(
        ANOMALY_REPORT_MD, lambda p: p.read_text(encoding="utf-8")
    )

    lines = []
    lines.append("# Reporte Final — Ciclo Delta")
    lines.append("")
    lines.append(f"**Generado:** {datetime.now().isoformat()}")
    lines.append("")
    lines.append("## Resumen ejecutivo")
    lines.append("")
    lines.append("- (completar con hasta 5 bullets tras revisar resultados)")
    lines.append("")

    lines.append("## Clusters encontrados")
    lines.append("")
    if clustering_df is not None:
        lines.append(clustering_df.to_markdown(index=False))
    else:
        lines.append("_Pendiente — ejecutar Fase 2 primero._")
    lines.append("")

    lines.append("## Anomalias detectadas")
    lines.append("")
    if anomaly_report_text is not None:
        lines.append("Ver detalle completo en `anomaly_report.md`. Resumen:")
        lines.append("")
        lines.append(anomaly_report_text[:2000])
    else:
        lines.append("_Pendiente — ejecutar Fase 3 primero._")
    lines.append("")

    lines.append("## Candidatos de servido nuevos")
    lines.append("")
    if candidatos_df is not None:
        n = len(candidatos_df)
        if n > 0:
            rango_inicio   = candidatos_df["ts_inicio"].min()
            rango_fin      = candidatos_df["ts_termino"].max()
            gramos_totales = candidatos_df["delta_peso_g"].sum()
            lines.append(f"- Candidatos nuevos: {n}")
            lines.append(f"- Rango temporal: {rango_inicio} -> {rango_fin}")
            lines.append(f"- Gramos estimados (suma): {gramos_totales:.1f} g")
        else:
            lines.append("- No se encontraron candidatos nuevos.")
    else:
        lines.append("_Pendiente — ejecutar d02_candidatos_servido.py primero._")
    lines.append("")

    lines.append("## ARI / NMI con Gamma")
    lines.append("")
    if cross_check is not None:
        lines.append(f"- ARI: {cross_check.get('ari')}")
        lines.append(f"- NMI: {cross_check.get('nmi')}")
        lines.append(f"- Interpretacion: {cross_check.get('interpretacion')}")
    else:
        lines.append("_Pendiente — ejecutar d01_cross_check_gamma.py primero._")
    lines.append("")

    lines.append("## Recomendaciones para Gamma")
    lines.append("")
    lines.append("- (completar segun candidatos de servido y anomalias tipo H/C)")
    lines.append("")

    lines.append("## Recomendaciones para el Ciclo Epsilon (si aplica)")
    lines.append("")
    lines.append("- (completar tras cierre formal de Delta)")
    lines.append("")

    REPORTE_FINAL_OUT.parent.mkdir(parents=True, exist_ok=True)
    REPORTE_FINAL_OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Reporte final escrito en: {REPORTE_FINAL_OUT}")


if __name__ == "__main__":
    main()
