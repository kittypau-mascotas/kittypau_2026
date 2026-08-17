
"""
g08_export_anotacion.py — Fase 1 Gamma
Convierte sesiones_candidatas.csv al formato JSON de entrada de app_anotacion.py.
Verificar el esquema exacto contra el código real de la app antes de usar.
"""
import json
import sys
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import SESIONES_CANDIDATAS_CSV, SESIONES_CANDIDATAS_ANOTACION_JSON

# Categorías que el reviewer puede asignar en app_anotacion.py — ver instructivo.md §6.2
CATEGORIAS_DISPONIBLES = [
    "inicio_alimentacion", "termino_alimentacion",
    "inicio_servido", "termino_servido",
    "inicio_hidratacion", "termino_hidratacion",
    "falso_positivo", "sin_clasificar",
]


def construir_payload(sesiones: pd.DataFrame) -> dict:
    candidatos = []
    for _, row in sesiones.iterrows():
        candidatos.append({
            "sesion_id": int(row["sesion_id"]),
            "ts_inicio": row["ts_inicio"].isoformat(),
            "ts_fin": row["ts_fin"].isoformat(),
            "duracion_s": float(row["duracion_s"]),
            "prob_activo_max": float(row["prob_activo_max"]),
            "periodo": row["periodo"],
            "categoria_sugerida": None,  # el humano decide — no hay heurística automática
            "categoria_asignada": None,  # se completa en app_anotacion.py al revisar
            "notas": "",
        })
    return {
        "version_pipeline": "gamma_unificacion_v1",
        "categorias_disponibles": CATEGORIAS_DISPONIBLES,
        "total_candidatos": len(candidatos),
        "candidatos": candidatos,
    }


def main():
    print("=== g08_export_anotacion.py — Ciclo Gamma · Fase 1 ===\n")
    if not SESIONES_CANDIDATAS_CSV.exists():
        raise FileNotFoundError("sesiones_candidatas.csv no existe — ejecutar g07 primero")

    sesiones = pd.read_csv(SESIONES_CANDIDATAS_CSV, parse_dates=["ts_inicio", "ts_fin"])
    payload = construir_payload(sesiones)

    SESIONES_CANDIDATAS_ANOTACION_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(SESIONES_CANDIDATAS_ANOTACION_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"✅ {len(sesiones)} candidatos exportados → {SESIONES_CANDIDATAS_ANOTACION_JSON}")
    print("\n   Próximo paso (manual, fuera de este script):")
    print("   1. Ejecutar app_anotacion.py cargando este JSON")
    print("   2. Revisar TODOS los candidatos, priorizando bloques cronológicos")
    print("      (Abril → Mayo → Junio) — ver Paso 4.9 del runbook")
    print("   3. Meta: ≥80 sesiones de servido en new_annotations_gamma.csv")
    print("   4. Luego ejecutar g09_build_sessions_labeled.py")


if __name__ == "__main__":
    main()
