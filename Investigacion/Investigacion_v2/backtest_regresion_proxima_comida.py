"""
Compara 3 métodos para predecir CUÁNDO va a ser la próxima comida de
KPCL0034, todos sobre el MISMO conjunto de test (split cronológico:
primer 75% para calibrar/entrenar, último 25% para evaluar -- nunca se
mezcla futuro con pasado, ni en la mediana ni en el ML):

  1. Mediana pura -- la que corre hoy en hunger-bar.ts.
  2. Híbrido (mediana + snap a hora pico calibrada, ±90min) -- ya probado
     en backtest_prediccion_proxima_comida.py, no ganó de forma
     significativa. Se re-evalúa acá SOLO en el tramo de test para que la
     comparación con el punto 3 sea sobre exactamente los mismos casos.
  3. Regresión (RandomForest + GradientBoosting) -- features: hora de la
     última comida (sin/cos), día de la semana (sin/cos), intervalo
     anterior, mediana histórica hasta ese punto. Target: minutos hasta
     la próxima comida.

Mismo criterio de siempre: si el método más complejo no mide mejor en el
held-out, no se usa -- el punto es que sea barato descartar lo que no
sirve, no justificar la complejidad de antemano.

Correr con: python backtest_regresion_proxima_comida.py
"""
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import wilcoxon
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error

NB_DIR = Path(__file__).resolve().parent
DEVICE = "KPCL0034"
TZ_STGO = "America/Santiago"

MIN_INTERVALO_H = 0.33
MAX_INTERVALO_H = 36.0
N_MIN_MUESTRAS = 5
FALLBACK_MEDIANA_H = 5.78
CLAMP_MIN_H = 2.88
CLAMP_MAX_H = 12.02
VENTANA_SNAP_MIN = 90
TOP_N_HORAS_PICO = 8
FRACCION_TRAIN = 0.75

candidatos = pd.read_csv(NB_DIR / "data" / "candidatos_clusters_duracion.csv")
categoria_real = pd.read_csv(NB_DIR / "data" / "candidatos_categoria_real.csv")
df = candidatos.merge(categoria_real, on="candidato_id")
df = df[(df["device_code"] == DEVICE) & (df["categoria_real"] == "alimentacion")].copy()
df["ts_inicio"] = pd.to_datetime(df["ts_inicio"], format="ISO8601", utc=True)
df = df.sort_values("ts_inicio").reset_index(drop=True)
comidas = df["ts_inicio"].tolist()
print(f"Comidas reales de KPCL0034: {len(comidas)}")


def intervalos_validos(ts_list):
    out = []
    for i in range(1, len(ts_list)):
        h = (ts_list[i] - ts_list[i - 1]).total_seconds() / 3600
        if MIN_INTERVALO_H <= h <= MAX_INTERVALO_H:
            out.append(h)
    return out


def horas_pico(ts_list, top_n=TOP_N_HORAS_PICO):
    horas = [t.tz_convert(TZ_STGO).hour for t in ts_list]
    return pd.Series(horas).value_counts().head(top_n).index.tolist()


def snap_a_hora_pico(pred, picos, ventana_min):
    pred_stgo = pred.tz_convert(TZ_STGO)
    mejor_cand, mejor_diff = None, None
    for dia_offset in (-1, 0, 1):
        fecha = (pred_stgo + pd.Timedelta(days=dia_offset)).date()
        try:
            medianoche = pd.Timestamp(fecha).tz_localize(
                TZ_STGO, nonexistent="shift_forward", ambiguous="NaT"
            )
        except Exception:
            continue
        if pd.isna(medianoche):
            continue
        for h in picos:
            cand = medianoche + pd.Timedelta(hours=h)
            diff_min = abs((cand - pred_stgo).total_seconds() / 60)
            if mejor_diff is None or diff_min < mejor_diff:
                mejor_diff, mejor_cand = diff_min, cand
    if mejor_diff is not None and mejor_diff <= ventana_min:
        return mejor_cand.tz_convert("UTC")
    return pred


# ── Features para la regresión, calculadas sin fuga (solo con el pasado) ──
filas = []
for n in range(N_MIN_MUESTRAS + 1, len(comidas)):
    historial = comidas[:n]
    iv = intervalos_validos(historial)
    usando_fallback = len(iv) < N_MIN_MUESTRAS
    mediana_h = FALLBACK_MEDIANA_H if usando_fallback else float(np.median(iv))
    mediana_h_clamp = min(CLAMP_MAX_H, max(CLAMP_MIN_H, mediana_h))

    ultima = historial[-1]
    ultima_stgo = ultima.tz_convert(TZ_STGO)
    intervalo_prev_h = iv[-1] if iv else FALLBACK_MEDIANA_H

    real = comidas[n]
    target_min = (real - ultima).total_seconds() / 60

    pred_mediana = ultima + pd.Timedelta(hours=mediana_h_clamp)
    picos = horas_pico(historial)
    pred_hibrida = snap_a_hora_pico(pred_mediana, picos, VENTANA_SNAP_MIN)

    hora_f = ultima_stgo.hour + ultima_stgo.minute / 60
    filas.append({
        "n": n,
        "hora_sin": np.sin(2 * np.pi * hora_f / 24), "hora_cos": np.cos(2 * np.pi * hora_f / 24),
        "dow_sin": np.sin(2 * np.pi * ultima_stgo.weekday() / 7), "dow_cos": np.cos(2 * np.pi * ultima_stgo.weekday() / 7),
        "intervalo_prev_h": intervalo_prev_h,
        "mediana_hist_h": mediana_h_clamp,
        "target_min": target_min,
        "ts_real": real,
        "ts_ultima": ultima,
        "err_mediana_min": abs((pred_mediana - real).total_seconds() / 60),
        "err_hibrido_min": abs((pred_hibrida - real).total_seconds() / 60),
    })

data = pd.DataFrame(filas)
n_train = int(len(data) * FRACCION_TRAIN)
train, test = data.iloc[:n_train], data.iloc[n_train:]
print(f"Train: {len(train)} (comidas 1-{n_train})  |  Test (held-out, al final): {len(test)}")

FEATURES = ["hora_sin", "hora_cos", "dow_sin", "dow_cos", "intervalo_prev_h", "mediana_hist_h"]
X_train, y_train = train[FEATURES], train["target_min"]
X_test, y_test = test[FEATURES], test["target_min"]

modelos = {
    "RandomForest": RandomForestRegressor(n_estimators=300, max_depth=4, min_samples_leaf=5, random_state=42),
    "GradientBoosting": GradientBoostingRegressor(n_estimators=200, max_depth=2, learning_rate=0.05, random_state=42),
}

resultados = {
    "Mediana pura": test["err_mediana_min"].values,
    "Híbrido (snap)": test["err_hibrido_min"].values,
}
for nombre, modelo in modelos.items():
    modelo.fit(X_train, y_train)
    pred_min = modelo.predict(X_test)
    err = np.abs(pred_min - y_test.values)
    resultados[nombre] = err

print(f"\n{'Método':<20}{'MAE (min)':>12}{'Mediana err':>14}{'<30min':>10}")
print("-" * 56)
for nombre, err in resultados.items():
    print(f"{nombre:<20}{err.mean():>12.1f}{np.median(err):>14.1f}{100*(err<30).mean():>9.1f}%")

base = resultados["Mediana pura"]
print("\nSignificancia vs. mediana pura (Wilcoxon pareado, mismo conjunto de test):")
for nombre, err in resultados.items():
    if nombre == "Mediana pura":
        continue
    try:
        stat, p = wilcoxon(base, err)
        mejora = 100 * (base.mean() - err.mean()) / base.mean()
        print(f"  {nombre:<20} mejora MAE: {mejora:+.1f}%  p={p:.4f}  ({'SIGNIFICATIVA' if p < 0.05 else 'no significativa'})")
    except ValueError as e:
        print(f"  {nombre:<20} no se pudo calcular ({e})")

# Importancia de features (solo para entender qué mira el modelo, no para producción)
print("\nImportancia de features (RandomForest):")
for feat, imp in sorted(zip(FEATURES, modelos["RandomForest"].feature_importances_), key=lambda x: -x[1]):
    print(f"  {feat:<20} {imp:.3f}")
