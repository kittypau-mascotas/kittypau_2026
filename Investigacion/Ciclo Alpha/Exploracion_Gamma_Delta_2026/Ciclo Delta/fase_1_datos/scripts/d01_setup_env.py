"""
d01_setup_env.py — Fase 1 Delta
Verifica artefactos de Gamma, paquetes Python y crea la estructura de carpetas
de Ciclo Delta. Ejecutar una vez antes de correr d02/d03.
"""
import sys
import importlib
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

from _delta_utils import (
    GAMMA_READINGS, GAMMA_SESSIONS,
    FASE1_DATA_RAW, FASE1_DATA_PROC,
    FASE2_MODELS, FASE2_OUTPUTS,
    FASE3_MODELS, FASE3_OUTPUTS,
    FASE4_OUTPUTS,
)

_DELTA_ROOT = Path(__file__).resolve().parent.parent.parent

REQUIRED_PACKAGES = ["sklearn", "hdbscan", "umap", "plotly", "seaborn"]


def check_gamma_artifacts():
    results = {}
    for name, path in [("readings_raw", GAMMA_READINGS),
                        ("sessions_labeled", GAMMA_SESSIONS)]:
        p = Path(path)
        results[name] = (p.exists(), str(p.resolve()))
    return results


def check_packages():
    results = {}
    for pkg in REQUIRED_PACKAGES:
        try:
            mod = importlib.import_module(pkg)
            results[pkg] = (True, getattr(mod, "__version__", "unknown"))
        except ImportError:
            results[pkg] = (False, None)
    return results


def create_delta_folders():
    folders = [
        FASE1_DATA_RAW, FASE1_DATA_PROC,
        FASE2_MODELS, FASE2_OUTPUTS,
        FASE3_MODELS, FASE3_OUTPUTS,
        FASE4_OUTPUTS,
    ]
    for p in folders:
        p.mkdir(parents=True, exist_ok=True)
    print(f"  {len(folders)} carpetas verificadas/creadas.")


def write_report(gamma_check, pkg_check, out_path):
    lines = [f"Ciclo Delta - Env check - {datetime.now().isoformat()}", ""]
    lines.append("Artefactos Gamma:")
    for name, (ok, path) in gamma_check.items():
        lines.append(f"  [{'OK' if ok else 'FALTA'}] {name}: {path}")
    lines.append("")
    lines.append("Paquetes Python:")
    for pkg, (ok, version) in pkg_check.items():
        lines.append(f"  [{'OK' if ok else 'FALTA'}] {pkg}: {version}")
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    gamma_check = check_gamma_artifacts()
    if not all(ok for ok, _ in gamma_check.values()):
        missing = [n for n, (ok, _) in gamma_check.items() if not ok]
        raise FileNotFoundError(
            f"Faltan artefactos de Gamma Pre-G: {missing}. "
            "Ejecutar el pipeline de Gamma antes de iniciar Delta."
        )
    pkg_check = check_packages()
    create_delta_folders()
    out = _DELTA_ROOT / "fase_1_datos" / "outputs" / "quality_report" / "env_check.txt"
    write_report(gamma_check, pkg_check, out)
    print(f"Env check completo. Ver {out}")
