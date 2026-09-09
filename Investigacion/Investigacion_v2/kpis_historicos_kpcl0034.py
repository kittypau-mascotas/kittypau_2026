"""
KPIs de consumo de KPCL0034 sobre TODO el histórico real (abril 8 -- hoy),
no solo los 10 días que trae la app en vivo (`WINDOW_DAYS` de hunger-bar.ts).

Fuente: `data/candidatos_clusters_duracion.csv` + `data/candidatos_categoria_real.csv`
-- 928 eventos, 100% con categoría humana real (no predicción de modelo),
merge por `candidato_id`. Mismo dataset que ya valida el motor en producción.

Responde:
  - ¿Cuánto se demora en comer?
  - ¿Cuánto come por día / semana / mes?
  - ¿Cada cuánto come?
  - ¿Cuánto se sirve (vs. lo que realmente come)?
  - + regularidad, tendencia y ruido, en la misma pasada.

Correr con: python kpis_historicos_kpcl0034.py
"""
from pathlib import Path

import numpy as np
import pandas as pd

NB_DIR = Path(__file__).resolve().parent
DEVICE = "KPCL0034"
TZ_STGO = "America/Santiago"

candidatos = pd.read_csv(NB_DIR / "data" / "candidatos_clusters_duracion.csv")
categoria_real = pd.read_csv(NB_DIR / "data" / "candidatos_categoria_real.csv")
df = candidatos.merge(categoria_real, on="candidato_id")
df = df[df["device_code"] == DEVICE].copy()
df["ts_inicio"] = pd.to_datetime(df["ts_inicio"], format="ISO8601", utc=True)
df = df.sort_values("ts_inicio").reset_index(drop=True)
df["ts_inicio_stgo"] = df["ts_inicio"].dt.tz_convert(TZ_STGO)
df["dia"] = df["ts_inicio_stgo"].dt.date
df["semana"] = df["ts_inicio_stgo"].dt.to_period("W")
df["mes"] = df["ts_inicio_stgo"].dt.to_period("M")
df["gramos"] = df["delta_neto_real"].abs()

desde, hasta = df["ts_inicio_stgo"].min(), df["ts_inicio_stgo"].max()
dias_totales = (hasta.normalize() - desde.normalize()).days + 1
print(f"KPCL0034 -- histórico completo: {desde:%Y-%m-%d} a {hasta:%Y-%m-%d} ({dias_totales} días, {len(df)} eventos)")
print(f"Categorías: {df['categoria_real'].value_counts().to_dict()}")

comidas = df[df["categoria_real"] == "alimentacion"]
servidos = df[df["categoria_real"] == "servido"]

print(f"\n{'='*60}\n1. ¿Cuánto se demora en comer?\n{'='*60}")
dur_min = comidas["duracion_s"] / 60
print(f"Duración: media={dur_min.mean():.1f}min  mediana={dur_min.median():.1f}min  "
      f"p10={dur_min.quantile(.1):.1f}  p90={dur_min.quantile(.9):.1f}  (n={len(comidas)})")

print(f"\n{'='*60}\n2. ¿Cuánto come por día / semana / mes?\n{'='*60}")
for etiqueta, col in [("día", "dia"), ("semana", "semana"), ("mes", "mes")]:
    g = comidas.groupby(col)["gramos"].sum()
    print(f"Por {etiqueta} (n={len(g)} periodos con >=1 comida): "
          f"media={g.mean():.1f}g  mediana={g.median():.1f}g  min={g.min():.1f}g  max={g.max():.1f}g")

print(f"\n{'='*60}\n3. ¿Cada cuánto come?\n{'='*60}")
comidas_ts = comidas["ts_inicio"].tolist()
intervalos_h = [(comidas_ts[i] - comidas_ts[i-1]).total_seconds() / 3600 for i in range(1, len(comidas_ts))]
intervalos_h = pd.Series(intervalos_h)
comidas_por_dia = comidas.groupby("dia").size()
print(f"Intervalo entre comidas: mediana={intervalos_h.median():.2f}h  "
      f"p25={intervalos_h.quantile(.25):.2f}h  p75={intervalos_h.quantile(.75):.2f}h")
print(f"Comidas/día: mediana={comidas_por_dia.median():.1f}  "
      f"rango={comidas_por_dia.min()}-{comidas_por_dia.max()}  (sobre {len(comidas_por_dia)} días con >=1 comida)")

print(f"\n{'='*60}\n4. ¿Cuánto se sirve? (vs. lo que realmente come)\n{'='*60}")
if len(servidos):
    print(f"Servido: {len(servidos)} eventos, {servidos['gramos'].sum():.0f}g totales, "
          f"media={servidos['gramos'].mean():.1f}g/evento")
print(f"Comido:  {len(comidas)} eventos, {comidas['gramos'].sum():.0f}g totales, "
      f"media={comidas['gramos'].mean():.1f}g/evento")
if len(servidos) and comidas['gramos'].sum() > 0:
    ratio = servidos['gramos'].sum() / comidas['gramos'].sum()
    print(f"Servido/Comido: {ratio:.2f}x")

print(f"\n{'='*60}\n5. Extra -- regularidad y tendencia\n{'='*60}")
gramos_dia = comidas.groupby("dia")["gramos"].sum()
cv = gramos_dia.std() / gramos_dia.mean()
print(f"Regularidad diaria (CV gramos/día): {cv:.2f}  ({'regular' if cv < 0.3 else 'irregular'})")
ruido = df[df["categoria_real"] == "ruido"]
ruido_por_dia = ruido.groupby("dia").size()
print(f"Ruido/día: mediana={ruido_por_dia.median():.1f} eventos "
      f"(sobre {ruido_por_dia.sum()} eventos ruido totales, {100*len(ruido)/len(df):.1f}% del total de candidatos)")

# Tendencia simple: regresión lineal de gramos/día en el tiempo
x = np.arange(len(gramos_dia))
if len(x) >= 2:
    pendiente = np.polyfit(x, gramos_dia.values, 1)[0]
    print(f"Tendencia gramos/día: {pendiente:+.2f}g por día "
          f"({'subiendo apetito' if pendiente > 0.5 else 'bajando apetito' if pendiente < -0.5 else 'estable'})")
