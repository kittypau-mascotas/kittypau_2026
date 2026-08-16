"""
requirements_check.py — Verifica el entorno antes de correr Alpha v2.
Ejecutar: python requirements_check.py
"""
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

REQUIRED = [
    ("pandas",      "pandas"),
    ("numpy",       "numpy"),
    ("plotly",      "plotly"),
    ("streamlit",   "streamlit"),
    ("scipy",       "scipy"),
    ("statsmodels", "statsmodels"),
    ("sklearn",     "scikit-learn"),
    ("pyarrow",     "pyarrow"),
]
OPTIONAL = [("ruptures", "ruptures")]

print(f"Python: {sys.version}\n")

ok = True
for mod, pkg in REQUIRED:
    try:
        __import__(mod)
        print(f"  ✓ {pkg}")
    except ImportError:
        print(f"  ✗ {pkg}  ← FALTA — pip install {pkg}")
        ok = False

for mod, pkg in OPTIONAL:
    try:
        __import__(mod)
        print(f"  ✓ {pkg} (opcional)")
    except ImportError:
        print(f"  ~ {pkg} (opcional — no es bloqueante)")

# Verificar zoneinfo (stdlib Python 3.9+)
try:
    from zoneinfo import ZoneInfo
    ZoneInfo("America/Santiago")
    print("  ✓ zoneinfo (stdlib)")
except Exception as e:
    print(f"  ✗ zoneinfo — {e}")
    ok = False

SCRIPT_DIR   = Path(__file__).parent
DATA_DIR     = SCRIPT_DIR / "data"
RAW_DATA_DIR = SCRIPT_DIR.parent.parent.parent / "Docs" / "11_Data" / "2026"
print()

# ─── Datos crudos (Docs/11_Data/2026/) ───────────────────────────────────────
KPCL0034_UUIDS = {
    "9510a455-b0e9-4932-8be1-03976d31228a",
    "3a460074-e7c3-41bf-ae5a-a011445f927a",
}
data_ok = True
import pandas as pd

for csv_name in ["readings.csv", "readings_rows.csv"]:
    csv_path = RAW_DATA_DIR / csv_name
    if csv_path.exists():
        df_dev = pd.read_csv(csv_path, usecols=["device_id"], low_memory=False)
        n_total = len(df_dev)
        n_kpcl = df_dev["device_id"].isin(KPCL0034_UUIDS).sum()
        print(f"  ✓ {csv_name} — {n_total:,} filas totales, {n_kpcl:,} de KPCL0034")
    else:
        print(f"  ✗ {csv_name} NO encontrado en: {RAW_DATA_DIR}")
        data_ok = False

# ─── Archivos generados ───────────────────────────────────────────────────────
CANDIDATOS = DATA_DIR / "candidatos_av2.csv"
if CANDIDATOS.exists():
    n = len(pd.read_csv(CANDIDATOS))
    print(f"  ✓ candidatos_av2.csv — {n} candidatos")
else:
    print("  ! candidatos_av2.csv no existe (se genera con: python 01_genera_candidatos.py)")

ANOTACIONES = DATA_DIR / "anotaciones_av2.csv"
if ANOTACIONES.exists():
    n = len(pd.read_csv(ANOTACIONES))
    print(f"  ✓ anotaciones_av2.csv — {n} anotaciones")
else:
    print("  ! anotaciones_av2.csv no existe aún (se crea en la app al anotar)")

print()
if ok and data_ok:
    print("✅ Entorno listo.")
    print("   Paso 1: python 01_genera_candidatos.py")
    print("   Paso 2: python -m streamlit run app_anotacion_av2.py")
elif ok:
    print("⚠️  Entorno OK pero faltan archivos de datos crudos.")
    print(f"   Verificar que existan en: {RAW_DATA_DIR}")
else:
    print("❌ Hay dependencias faltantes. Resolver antes de continuar.")
