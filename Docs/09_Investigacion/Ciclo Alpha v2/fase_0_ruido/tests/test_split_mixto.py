"""
tests/test_split_mixto.py — punto_split_mixto() debe partir un segmento con
giro interno claro (ej. baja fuerte y luego sube fuerte) en el punto exacto
del extremo, y NO partir un segmento monótono (el extremo cae en el borde).

Ejecutar: python -m pytest tests/test_split_mixto.py -v
"""
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from importlib import import_module

_gen = import_module("01_genera_candidatos")


def _df(pesos: list[float]) -> pd.DataFrame:
    ts = pd.date_range("2026-08-01T00:00:00Z", periods=len(pesos), freq="30s")
    return pd.DataFrame({"ts": ts, "peso_g": pesos})


def test_giro_interno_claro_se_parte():
    """142 -> 24 (minimo, indice 4) -> 141 — caso real del dataset (id_candidato=6)."""
    pesos = [142, 110, 80, 50, 24, 60, 100, 141]
    df = _df(pesos)
    punto = _gen.punto_split_mixto(df, 0, len(pesos) - 1, min_rango_g=4.0)
    assert punto == 4, f"deberia partir en el indice del minimo (4), dio {punto}"


def test_segmento_monotono_no_se_parte():
    """Bajada limpia y sostenida — el minimo esta en el borde, no hay giro."""
    pesos = [100, 95, 90, 85, 80]
    df = _df(pesos)
    punto = _gen.punto_split_mixto(df, 0, len(pesos) - 1, min_rango_g=4.0)
    assert punto is None, f"un tramo monotono no deberia partirse, dio {punto}"


def test_giro_chico_no_se_parte():
    """Giro real pero de magnitud menor al umbral — no debe partirse (ruido, no evento)."""
    pesos = [100, 98, 97, 99, 101]  # baja 3g, sube 4g — ambos < min_rango_g=4.0 estricto? probamos con 5.0
    df = _df(pesos)
    punto = _gen.punto_split_mixto(df, 0, len(pesos) - 1, min_rango_g=5.0)
    assert punto is None, f"un giro chico bajo el umbral no deberia partirse, dio {punto}"


def test_split_produce_dos_candidatos_validos():
    """Integración: tras partir, calcular_metadata() sobre cada mitad da
    direction limpia (no 'mixto') si el umbral de deteccion se cumple."""
    pesos = [142.0, 110.0, 80.0, 50.0, 24.0, 60.0, 100.0, 141.0]
    df = _df(pesos)
    u = {"min_duracion_s": 0, "min_rango_g": 4.0}
    punto = _gen.punto_split_mixto(df, 0, len(pesos) - 1, min_rango_g=4.0)
    assert punto is not None
    meta1 = _gen.calcular_metadata(df, 0, punto, u)
    meta2 = _gen.calcular_metadata(df, punto, len(pesos) - 1, u)
    assert meta1["direction"] == "bajada"
    assert meta2["direction"] == "subida"
