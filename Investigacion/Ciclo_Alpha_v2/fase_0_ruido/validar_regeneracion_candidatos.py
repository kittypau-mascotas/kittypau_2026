"""
validar_regeneracion_candidatos.py — Alpha v2

Gate de validación antes de promover un candidatos_av2.csv (o candidatos_agua.csv)
recién regenerado a la ruta canónica. Ver incidente "Corrupción de
candidatos_av2.csv" (agosto 2026) — Knowledge/29_Specs/SPEC_13_Reorganizacion_09_Investigacion.md §19.

Causa raíz del incidente: id_candidato era un índice posicional
(range(len(df))) que se reasignaba en cada regeneración, así que una
anotación guardada contra el candidato #37 de una corrida podía apuntar a un
candidato completamente distinto en la siguiente. Este gate no arregla eso
directamente (para eso ver id_candidato por hash en 01_genera_candidatos.py) —
sirve para detectar, ANTES de sobreescribir el archivo canónico, si el
detector cambió de comportamiento lo suficiente como para que las anotaciones
ya guardadas dejen de corresponder a ningún candidato de la nueva corrida.

El join es por SOLAPE de intervalo [t_inicio, t_fin], nunca por id_candidato
ni por timestamps exactos. Se probó exact-match primero (como sugería el
informe del incidente) y dio ~11% incluso en una regeneración sana, idéntica
en umbrales y datos a la que generó candidatos_av2.csv actual -- porque el
operador ajusta manualmente t_inicio/t_fin al guardar ("Ajustar tiempos" en
la app, ver 03_recalibrar_umbrales.py), así que casi ninguna anotación
conserva los límites exactos del candidato. El chequeo real que importa es
"¿la anotación sigue solapando ALGÚN candidato de la corrida nueva?" -- eso
sí da ~100% en una regeneración sana, y cae si el detector deja de detectar
eventos que antes sí detectaba.

Uso standalone:
    python validar_regeneracion_candidatos.py <candidatos_nuevo.csv> [--umbral 0.90]

Uso como módulo (desde 01_genera_candidatos.py):
    from validar_regeneracion_candidatos import validar
    paso, reporte = validar(df_cand_nuevo, anotaciones_csv, device_code)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")


def _tiene_solape(ti: np.ndarray, tf: np.ndarray, cti: np.ndarray, ctf: np.ndarray) -> np.ndarray:
    """Para cada intervalo [ti[k], tf[k]], ¿existe algún [cti[i], ctf[i]] que lo
    solape? cti/ctf deben venir ordenados por cti. Búsqueda binaria + barrido
    acotado hacia atrás (los candidatos no se solapan entre sí, así que unos
    pocos vecinos alrededor del punto de inserción bastan)."""
    idx = np.searchsorted(cti, tf, side="right")
    out = np.zeros(len(ti), dtype=bool)
    n_cand = len(cti)
    for k in range(len(ti)):
        lo = max(0, idx[k] - 8)
        hi = min(n_cand, idx[k] + 1)
        for i in range(lo, hi):
            if cti[i] <= tf[k] and ctf[i] >= ti[k]:
                out[k] = True
                break
    return out


def validar(
    df_nuevo: pd.DataFrame,
    anotaciones_csv: Path,
    device_code: str,
    umbral: float = 0.90,
) -> tuple[bool, dict]:
    """Retorna (paso, reporte).

    paso=False si la fracción de anotaciones existentes cuyo intervalo
    [t_inicio, t_fin] ya NO solapa ningún candidato de `df_nuevo` cae por
    debajo de `umbral`. Si no hay anotaciones todavía (primera corrida) o
    ninguna pertenece a este dispositivo, pasa trivialmente.

    Solape, no timestamps exactos: el operador ajusta manualmente los límites
    al guardar en la app ("Ajustar tiempos"), así que casi ninguna anotación
    conserva el (t_inicio, t_fin) exacto del candidato original -- eso es
    esperado, no corrupción. Ver docstring del módulo.
    """
    if not anotaciones_csv.exists():
        return True, {"motivo": "sin anotaciones todavía -- nada que validar"}

    anot = pd.read_csv(anotaciones_csv, low_memory=False)
    if "device_code" in anot.columns:
        anot = anot[anot["device_code"] == device_code]
    if len(anot) == 0:
        return True, {"motivo": f"sin anotaciones de {device_code} todavía -- nada que validar"}

    anot_ti = pd.to_datetime(anot["t_inicio"], format="ISO8601", utc=True).values.astype("int64")
    anot_tf = pd.to_datetime(anot["t_fin"],    format="ISO8601", utc=True).values.astype("int64")

    cand = df_nuevo.sort_values("t_inicio")
    cand_ti = pd.to_datetime(cand["t_inicio"], format="ISO8601", utc=True).values.astype("int64")
    cand_tf = pd.to_datetime(cand["t_fin"],    format="ISO8601", utc=True).values.astype("int64")

    matches = _tiene_solape(anot_ti, anot_tf, cand_ti, cand_tf)
    n_total = len(matches)
    n_match = int(matches.sum())
    tasa    = n_match / n_total

    reporte = {
        "device_code":        device_code,
        "total_anotaciones":  n_total,
        "con_solape":         n_match,
        "sin_solape":         n_total - n_match,
        "tasa_match":         round(tasa, 4),
        "umbral":             umbral,
    }
    return tasa >= umbral, reporte


def imprimir_reporte(paso: bool, reporte: dict, umbral: float) -> None:
    print("=== Gate de validación: anotaciones vs candidatos nuevos ===\n")
    for k, v in reporte.items():
        print(f"  {k}: {v}")
    print()
    if paso:
        tasa = reporte.get("tasa_match", 1.0)
        print(f"[OK] PASA -- tasa de match {tasa:.1%} >= umbral {umbral:.0%}")
    else:
        print(f"[FALLA] tasa de match {reporte['tasa_match']:.1%} < umbral {umbral:.0%}")
        print("   El detector probablemente cambió de comportamiento (umbrales, splits,")
        print("   fusión de segmentos, etc.). Si es intencional, documentarlo como")
        print("   experimento explícito (ver regla estructural #5) antes de promover con --force.")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("candidatos_csv", type=Path)
    ap.add_argument("--anotaciones", type=Path, default=None,
                     help="Default: data/anotaciones_av2.csv junto al script")
    ap.add_argument("--device-code", default="KPCL0034")
    ap.add_argument("--umbral", type=float, default=0.90)
    args = ap.parse_args()

    anot_csv = args.anotaciones or (Path(__file__).parent / "data" / "anotaciones_av2.csv")
    df_nuevo = pd.read_csv(args.candidatos_csv, low_memory=False)

    paso, reporte = validar(df_nuevo, anot_csv, args.device_code, args.umbral)
    imprimir_reporte(paso, reporte, args.umbral)
    sys.exit(0 if paso else 1)


if __name__ == "__main__":
    main()
