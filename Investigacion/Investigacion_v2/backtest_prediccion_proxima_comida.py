"""
Backtest honesto: mediana pura (la que corre hoy en hunger-bar.ts) vs. un
híbrido mediana + "snap" a hora pico calibrada, para predecir CUÁNDO va a
ser la próxima comida de KPCL0034.

Nada de esto toca producción -- es solo medir, con las 305 comidas reales
de `data/candidatos_categoria_real.csv`, si el híbrido de verdad predice
mejor antes de portarlo a `hunger-bar.ts`.

Metodología (sin fuga de datos -- cada predicción usa SOLO comidas
anteriores a la que se está prediciendo, igual que en producción real):
  - Para la comida N (N >= N_MIN_MUESTRAS+1), calcular la mediana de los
    intervalos válidos entre las comidas 1..N-1 (mismos filtros que
    MIN_INTERVALO_H/MAX_INTERVALO_H de hunger-bar.ts), clampeada igual
    que en producción.
  - predicción_mediana = comida[N-1] + mediana_clampeada
  - predicción_híbrida = si hay una hora pico (calculada SOLO con
    comidas 1..N-1) dentro de ±VENTANA_SNAP_MIN de predicción_mediana,
    usar esa hora pico; si no, igual que predicción_mediana.
  - error = |predicción - hora_real| en minutos.

Correr con: python backtest_prediccion_proxima_comida.py
"""
from pathlib import Path

import numpy as np
import pandas as pd

NB_DIR = Path(__file__).resolve().parent
DEVICE = "KPCL0034"
TZ_STGO = "America/Santiago"

# Mismas constantes exactas que kittypau_app/src/lib/hunger-bar.ts -- no se
# reinventa nada, solo se prueba si agregarle el snap circadiano ayuda.
MIN_INTERVALO_H = 0.33
MAX_INTERVALO_H = 36.0
N_MIN_MUESTRAS = 5
FALLBACK_MEDIANA_H = 5.78
CLAMP_MIN_H = 2.88
CLAMP_MAX_H = 12.02

VENTANA_SNAP_MIN = 90  # qué tan cerca tiene que estar una hora pico para "engancharse"
TOP_N_HORAS_PICO = 8   # misma cantidad que HORAS_PICO ya calibrado, para comparar manzanas con manzanas

candidatos = pd.read_csv(NB_DIR / "data" / "candidatos_clusters_duracion.csv")
categoria_real = pd.read_csv(NB_DIR / "data" / "candidatos_categoria_real.csv")
df = candidatos.merge(categoria_real, on="candidato_id")
df = df[(df["device_code"] == DEVICE) & (df["categoria_real"] == "alimentacion")].copy()
df["ts_inicio"] = pd.to_datetime(df["ts_inicio"], format="ISO8601", utc=True)
df = df.sort_values("ts_inicio").reset_index(drop=True)
comidas = df["ts_inicio"].tolist()
print(f"Comidas reales de KPCL0034: {len(comidas)}")


def intervalos_validos(ts_list: list[pd.Timestamp]) -> list[float]:
    out = []
    for i in range(1, len(ts_list)):
        h = (ts_list[i] - ts_list[i - 1]).total_seconds() / 3600
        if MIN_INTERVALO_H <= h <= MAX_INTERVALO_H:
            out.append(h)
    return out


def horas_pico(ts_list: list[pd.Timestamp], top_n: int = TOP_N_HORAS_PICO) -> list[int]:
    horas = [t.tz_convert(TZ_STGO).hour for t in ts_list]
    conteo = pd.Series(horas).value_counts()
    return conteo.head(top_n).index.tolist()


def snap_a_hora_pico(pred: pd.Timestamp, picos: list[int], ventana_min: int) -> pd.Timestamp:
    """Busca, entre las horas pico, la más cercana a `pred` (mirando ±1 día
    para no perder picos que caen "al otro lado" de medianoche) -- si cae
    dentro de la ventana, usa esa hora; si no, deja `pred` sin tocar.
    nonexistent/ambiguous explícitos porque Chile tiene DST -- medianoche
    de algunos días (ej. 2026-09-06) no existe en hora local."""
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


errores_mediana, errores_hibrido = [], []
usó_snap = 0

for n in range(N_MIN_MUESTRAS + 1, len(comidas)):
    historial = comidas[:n]  # solo el pasado -- sin fuga de datos
    iv = intervalos_validos(historial)
    usando_fallback = len(iv) < N_MIN_MUESTRAS
    mediana_h = FALLBACK_MEDIANA_H if usando_fallback else float(np.median(iv))
    mediana_h = min(CLAMP_MAX_H, max(CLAMP_MIN_H, mediana_h))

    pred_mediana = historial[-1] + pd.Timedelta(hours=mediana_h)
    picos = horas_pico(historial)
    pred_hibrida = snap_a_hora_pico(pred_mediana, picos, VENTANA_SNAP_MIN)
    if pred_hibrida != pred_mediana:
        usó_snap += 1

    real = comidas[n]
    err_med = abs((pred_mediana - real).total_seconds()) / 60
    err_hib = abs((pred_hibrida - real).total_seconds()) / 60
    errores_mediana.append(err_med)
    errores_hibrido.append(err_hib)

errores_mediana = np.array(errores_mediana)
errores_hibrido = np.array(errores_hibrido)
n_eval = len(errores_mediana)

print(f"\nComidas evaluadas (con historial suficiente): {n_eval}")
print(f"Snap a hora pico aplicado en: {usó_snap} de {n_eval} ({100*usó_snap/n_eval:.1f}%)")

print("\n--- Mediana pura (producción actual) ---")
print(f"MAE: {errores_mediana.mean():.1f} min  |  mediana del error: {np.median(errores_mediana):.1f} min  |  <30min: {100*(errores_mediana<30).mean():.1f}%")

print("\n--- Híbrido (mediana + snap a hora pico ±{}min) ---".format(VENTANA_SNAP_MIN))
print(f"MAE: {errores_hibrido.mean():.1f} min  |  mediana del error: {np.median(errores_hibrido):.1f} min  |  <30min: {100*(errores_hibrido<30).mean():.1f}%")

mejora_pct = 100 * (errores_mediana.mean() - errores_hibrido.mean()) / errores_mediana.mean()
print(f"\nMejora del MAE: {mejora_pct:+.1f}%  ({'híbrido gana' if mejora_pct > 0 else 'mediana pura gana'})")

# Signo de significancia simple: wilcoxon pareado (mismo par de predicciones)
from scipy.stats import wilcoxon
stat, p = wilcoxon(errores_mediana, errores_hibrido)
print(f"Wilcoxon pareado: p={p:.4f} ({'diferencia significativa (p<0.05)' if p < 0.05 else 'NO significativa'})")
