
"""
g01_setup_env.py — Fase 1 Gamma (Pre-G, Paso 0)
Verifica el entorno, crea la estructura de carpetas de la unificación
Abril-Mayo-Junio y confirma que los dos CSV fuente y el Modelo A (usado
únicamente para preselección de candidatos en app_anotacion) son accesibles.
Gamma no hereda anotaciones ni resultados de Alpha — solo reutiliza el mejor
Modelo A disponible como ayuda de preselección, nada más.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import (
    asegurar_carpetas, ABRIL_READINGS_CSV, MAYO_JUNIO_READINGS_CSV,
    MODELO_A_LGB, CALIBRATION_ISOTONIC_JSON, DATA_UNIFICADO_ROOT,
)

PAQUETES_REQUERIDOS = [
    "pandas", "numpy", "scipy", "lightgbm", "pyarrow", "dateutil",
]


def verificar_paquetes():
    print("── Verificando paquetes ──────────────────────────────────")
    faltantes = []
    for pkg in PAQUETES_REQUERIDOS:
        try:
            __import__(pkg)
            print(f"  ✅ {pkg}")
        except ImportError:
            print(f"  ❌ {pkg} — no instalado")
            faltantes.append(pkg)
    if faltantes:
        raise ImportError(f"Instalar antes de continuar: {', '.join(faltantes)}")


def verificar_rutas_fuente():
    print("\n── Verificando rutas de datos fuente ─────────────────────")
    rutas = {
        "readings.csv (Abril)": ABRIL_READINGS_CSV,
        "readings_rows.csv (Mayo-Jun)": MAYO_JUNIO_READINGS_CSV,
        "modelo_a.lgb (preselección candidatos)": MODELO_A_LGB,
        "calibration_isotonic.json (preselección candidatos)": CALIBRATION_ISOTONIC_JSON,
    }
    faltantes = []
    for nombre, ruta in rutas.items():
        if ruta.exists():
            print(f"  ✅ {nombre}: {ruta}")
        else:
            print(f"  ❌ {nombre} NO encontrado: {ruta}")
            faltantes.append(nombre)
    if faltantes:
        print("\n⚠️  Faltan archivos fuente. Revisar rutas en _gamma_utils.py antes de continuar.")
    return len(faltantes) == 0


def main():
    print("=== g01_setup_env.py — Ciclo Gamma · Fase 1 ===\n")
    verificar_paquetes()
    ok = verificar_rutas_fuente()

    print("\n── Creando estructura de carpetas ────────────────────────")
    asegurar_carpetas()
    print(f"  ✅ Estructura creada bajo {DATA_UNIFICADO_ROOT}")

    if ok:
        print("\n✅ Entorno listo. Próximo: g02_uuid_mapping.py")
    else:
        print("\n❌ Resolver artefactos faltantes antes de continuar.")
        sys.exit(1)


if __name__ == "__main__":
    main()