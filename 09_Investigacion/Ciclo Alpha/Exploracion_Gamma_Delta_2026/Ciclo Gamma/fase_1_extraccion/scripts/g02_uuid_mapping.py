
"""
g02_uuid_mapping.py — Fase 1 Gamma
Construye y persiste uuid_mapping.json con la equivalencia de UUIDs de KPCL0034.
Este paso va SIEMPRE antes de cualquier join o filtro por device_id — filtrar por
un solo UUID antes de unificar produce resultados parciales silenciosos (error α-4).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import (
    UUID_ABRIL, UUID_MAYO_JUNIO, UUID_CANONICO, UUID_MAPPING_JSON,
    KPCL0034_CODE, DIR_01_RAW,
)


def construir_mapping() -> dict:
    return {
        "device_code": KPCL0034_CODE,
        "uuid_canonico": UUID_CANONICO,
        "equivalencias": {
            UUID_ABRIL: UUID_CANONICO,
            UUID_MAYO_JUNIO: UUID_CANONICO,
        },
        "notas": (
            "Abril 2026 usa un UUID distinto a Mayo-Jun 2026 en adelante por un "
            "problema de registro en Supabase (error α-4). Todas las filas de "
            "readings/audit_events deben reescribirse al uuid_canonico antes de "
            "cualquier filtro por device_id, join o cálculo de feature. Si aparece "
            "un tercer UUID en el futuro (ej. al sumar un nuevo dump), agregarlo "
            "aquí ANTES de re-ejecutar g03_unify_readings.py."
        ),
    }


def main():
    print("=== g02_uuid_mapping.py — Ciclo Gamma · Fase 1 ===\n")
    DIR_01_RAW.mkdir(parents=True, exist_ok=True)

    mapping = construir_mapping()
    with open(UUID_MAPPING_JSON, "w", encoding="utf-8") as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False)

    print(f"✅ uuid_mapping.json escrito → {UUID_MAPPING_JSON}")
    print(f"   UUID canónico: {UUID_CANONICO}")
    print("   Próximo: g03_unify_readings.py")


if __name__ == "__main__":
    main()
