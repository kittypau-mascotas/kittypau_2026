"""Script 01 - Verificacion del entorno.
Valida Python >= 3.10, dependencias instaladas y credenciales de Supabase.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ENV_PATH = Path(r"D:\Escritorio\Proyectos\KittyPaw\kittypau_2026_hivemq\.env.local")
REQUIRED_PACKAGES = ["supabase", "pandas", "numpy", "pyarrow", "dotenv"]
REQUIRED_VARS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]


def main() -> None:
    assert sys.version_info >= (3, 10), (
        f"Python 3.10+ requerido. Version actual: {sys.version}"
    )
    print(f"[OK] Python {sys.version_info.major}.{sys.version_info.minor}")

    for pkg in REQUIRED_PACKAGES:
        try:
            __import__(pkg)
            print(f"[OK] {pkg}")
        except ImportError:
            print(f"[ERROR] Paquete faltante: {pkg}")
            print("        Ejecuta: pip install -r requirements.txt")
            raise SystemExit(1)

    if not ENV_PATH.exists():
        print(f"[ERROR] No se encontro .env.local en: {ENV_PATH}")
        raise SystemExit(1)

    load_dotenv(ENV_PATH)

    missing = [name for name in REQUIRED_VARS if not os.getenv(name)]
    if missing:
        present = [name for name in os.environ.keys() if name in REQUIRED_VARS]
        print("[ERROR] Faltan variables en .env.local")
        print("        Requeridas:", ", ".join(REQUIRED_VARS))
        print("        Presentes :", ", ".join(present) if present else "(ninguna)")
        raise SystemExit(1)

    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    print(f"[OK] NEXT_PUBLIC_SUPABASE_URL = {url}")
    print(f"[OK] SUPABASE_SERVICE_ROLE_KEY = {key[:12]}...")
    print()
    print("Entorno verificado correctamente. Puedes continuar con el script 02.")


if __name__ == "__main__":
    main()
