"""
Recalibra las constantes de `kittypau_app/src/lib/hunger-bar.ts:34-59` con el
histórico completo de KPCL0034 (928 candidatos, abril 8 - hoy, 305 comidas
reales) en vez de las 254 comidas abr-jul con que se calibraron originalmente.

Misma metodología exacta que ya documentan los comentarios de hunger-bar.ts
(mediana/P10/P90 de intervalos válidos, MIN_INTERVALO_H/MAX_INTERVALO_H como
filtro, horas pico = top 8 más frecuentes en hora local Chile) -- no se
inventa criterio nuevo, solo se re-ejecuta con más datos.

Solo imprime los valores nuevos -- no escribe hunger-bar.ts. Aplicar a mano
tras revisar que los números tengan sentido.

Correr con: python recalibrar_constantes_hunger_bar.py
"""
from pathlib import Path

import numpy as np
import pandas as pd

NB_DIR = Path(__file__).resolve().parent
DEVICE = "KPCL0034"
TZ_STGO = "America/Santiago"

# Mismos filtros que hunger-bar.ts -- no se recalibran, son el criterio de
# "qué cuenta como intervalo válido", no un resultado.
MIN_INTERVALO_H = 0.33
MAX_INTERVALO_H = 36.0
TOP_N_HORAS_PICO = 8

candidatos = pd.read_csv(NB_DIR / "data" / "candidatos_clusters_duracion.csv")
categoria_real = pd.read_csv(NB_DIR / "data" / "candidatos_categoria_real.csv")
df = candidatos.merge(categoria_real, on="candidato_id")
df = df[(df["device_code"] == DEVICE) & (df["categoria_real"] == "alimentacion")].copy()
df["ts_inicio"] = pd.to_datetime(df["ts_inicio"], format="ISO8601", utc=True)
df = df.sort_values("ts_inicio").reset_index(drop=True)
comidas = df["ts_inicio"].tolist()
print(f"Comidas reales de KPCL0034: {len(comidas)} (vs. 254 usadas en la calibración anterior)")

intervalos_h = [
    (comidas[i] - comidas[i - 1]).total_seconds() / 3600 for i in range(1, len(comidas))
]
intervalos_h = np.array(intervalos_h)
validos = intervalos_h[(intervalos_h >= MIN_INTERVALO_H) & (intervalos_h <= MAX_INTERVALO_H)]
print(f"Intervalos totales: {len(intervalos_h)}  |  válidos (dentro de {MIN_INTERVALO_H}h-{MAX_INTERVALO_H}h): {len(validos)}")

fallback_mediana_h = round(float(np.median(validos)), 2)
clamp_min_h = round(float(np.percentile(validos, 10)), 2)
clamp_max_h = round(float(np.percentile(validos, 90)), 2)
intervalo_p25_h = round(float(np.percentile(validos, 25)), 2)
intervalo_p75_h = round(float(np.percentile(validos, 75)), 2)

df["dia"] = df["ts_inicio"].dt.tz_convert(TZ_STGO).dt.date
comidas_por_dia = df.groupby("dia").size()
comidas_dia_mediana = int(round(comidas_por_dia.median()))
comidas_dia_rango = (int(comidas_por_dia.min()), int(comidas_por_dia.max()))

horas = df["ts_inicio"].dt.tz_convert(TZ_STGO).dt.hour
horas_pico = pd.Series(horas).value_counts().head(TOP_N_HORAS_PICO).index.tolist()

print(f"""
--- Valores nuevos para hunger-bar.ts (856 -> reemplazar líneas 38, 43-44, 55-59) ---

export const FALLBACK_MEDIANA_H = {fallback_mediana_h}; // mediana global real, {len(validos)} intervalos válidos KPCL0034 (abril-hoy)
export const CLAMP_MIN_H = {clamp_min_h};
export const CLAMP_MAX_H = {clamp_max_h};

export const COMIDAS_DIA_MEDIANA = {comidas_dia_mediana};
export const COMIDAS_DIA_RANGO: [number, number] = [{comidas_dia_rango[0]}, {comidas_dia_rango[1]}];
export const HORAS_PICO = {horas_pico}; // hora local Chile
export const INTERVALO_P25_H = {intervalo_p25_h};
export const INTERVALO_P75_H = {intervalo_p75_h};

--- Valores anteriores (comentario actual del archivo) ---
FALLBACK_MEDIANA_H = 5.78  |  CLAMP_MIN_H = 2.88  |  CLAMP_MAX_H = 12.02
COMIDAS_DIA_MEDIANA = 4  |  COMIDAS_DIA_RANGO = [1, 6]
HORAS_PICO = [19, 5, 16, 10, 17, 6, 7, 9]
INTERVALO_P25_H = 3.8  |  INTERVALO_P75_H = 8.27
""")
