"""
tests/test_candidatos.py — Verificaciones básicas de candidatos_av2.csv.

Ejecutar: python -m pytest tests/ -v
"""
from pathlib import Path

import pandas as pd
import pytest

CSV = Path(__file__).parent.parent / "data" / "candidatos_av2.csv"

COLUMNAS_REQUERIDAS = [
    "id_candidato", "t_inicio", "t_fin", "duracion_min",
    "delta_w_total", "peso_inicio_g", "peso_fin_g",
    "rango_g", "n_lecturas", "direction",
    "hora_inicio_stgo", "fecha_inicio_stgo",
]


@pytest.fixture(scope="module")
def df():
    if not CSV.exists():
        pytest.skip("candidatos_av2.csv no existe — ejecutar 01_genera_candidatos.py primero")
    d = pd.read_csv(CSV, low_memory=False)
    d["t_inicio"] = pd.to_datetime(d["t_inicio"], utc=True)
    d["t_fin"]    = pd.to_datetime(d["t_fin"],    utc=True)
    return d


def test_columnas_requeridas(df):
    for col in COLUMNAS_REQUERIDAS:
        assert col in df.columns, f"Columna faltante: {col}"


def test_sin_duplicados_t_inicio(df):
    dups = df["t_inicio"].duplicated().sum()
    assert dups == 0, f"Hay {dups} t_inicio duplicados"


def test_timestamps_tienen_timezone(df):
    for col in ["t_inicio", "t_fin"]:
        assert df[col].dt.tz is not None, f"{col} no tiene timezone"


def test_t_fin_mayor_que_t_inicio(df):
    invalidos = (df["t_fin"] <= df["t_inicio"]).sum()
    assert invalidos == 0, f"{invalidos} filas tienen t_fin <= t_inicio"


def test_duracion_positiva(df):
    invalidas = (df["duracion_min"] <= 0).sum()
    assert invalidas == 0, f"{invalidas} candidatos con duración <= 0"


def test_direction_valores_validos(df):
    validos = {"subida", "bajada", "mixto"}
    invalidos = df[~df["direction"].isin(validos)]
    assert len(invalidos) == 0, f"direction con valores inválidos: {invalidos['direction'].unique()}"


def test_no_cruza_gaps_grandes(df):
    """Ningún candidato debe durar más de 4h — gap real si dura tanto."""
    max_dur_h = (df["t_fin"] - df["t_inicio"]).dt.total_seconds().max() / 3600
    assert max_dur_h <= 4, f"Candidato sospechoso de {max_dur_h:.1f}h — posible gap no detectado"


def test_id_candidato_unico(df):
    dups = df["id_candidato"].duplicated().sum()
    assert dups == 0, f"id_candidato duplicado en {dups} filas"
