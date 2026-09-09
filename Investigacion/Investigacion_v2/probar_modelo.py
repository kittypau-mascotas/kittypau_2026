"""
Prueba del modelo EN PRODUCCIÓN (kittypau_app/.../calibracion-kpcl0034.json,
la que corre de verdad en la app) contra el ground truth de KPCL0034 --
ahora 100% completo (0 candidatos "sin_anotacion", ver plan.md de spec 007).

Misma lógica de clasificación exacta que cerrar_validacion_confiable.py
(estandarizar + centroide más cercano + guardia física + refinamiento del
cluster mezclado) -- nada nuevo, solo evaluación.

Matriz de confusión + precision/recall/F1 por categoría
(alimentacion/servido/ruido), con y sin la guardia física, para ver qué
tanto aporta.

Correr con: python probar_modelo.py
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix

NB_DIR = Path(__file__).resolve().parent
DEVICE = "KPCL0034"
CALIBRACION_PRODUCCION = (
    NB_DIR.parent.parent / "kittypau_app" / "src" / "lib" / "motor-alimentacion"
    / "calibracion-kpcl0034.json"
)
CATEGORIAS = ["alimentacion", "ruido", "servido"]

candidatos = pd.read_csv(NB_DIR / "data" / "candidatos_clusters_duracion.csv")
categoria_real = pd.read_csv(NB_DIR / "data" / "candidatos_categoria_real.csv")
calibracion = json.loads(CALIBRACION_PRODUCCION.read_text(encoding="utf-8"))
print(f"Calibración en producción: version={calibracion['version']}")

df = candidatos[candidatos["device_code"] == DEVICE].merge(
    categoria_real, on="candidato_id", how="left"
)
df = df[df["categoria_real"] != "sin_anotacion"].copy()
print(f"Candidatos KPCL0034 con categoría real confirmada: {len(df):,}")

FEATURES_ORDEN = calibracion["features_orden"]
LOG1P = set(calibracion["log1p_features"])
MEAN = np.array(calibracion["scaler"]["mean"])
SCALE = np.array(calibracion["scaler"]["scale"])
CLUSTERS = calibracion["clusters_kmeans_crudo"]


def estandarizar(row):
    crudas = {
        "duracion_s": row["duracion_s"], "delta_neto_real": row["delta_neto_real"],
        "max_abs_delta_g": row["max_abs_delta_g"], "n_lecturas": row["n_lecturas"],
        "n_cambios_signo": row["n_cambios_signo"],
    }
    x = np.array([np.log1p(crudas[n]) if n in LOG1P else crudas[n] for n in FEATURES_ORDEN])
    return (x - MEAN) / SCALE


def clasificar(row, con_guardia: bool):
    x = estandarizar(row)
    dists = sorted(
        (float(np.sqrt(((x - np.array(info["centroide_estandarizado"])) ** 2).sum())), cid, info)
        for cid, info in CLUSTERS.items()
    )
    (_, _, info1), _ = dists[0], dists[1]
    categoria = info1["categoria_dominante"]
    if not con_guardia:
        return categoria
    if categoria == "alimentacion" and row["delta_neto_real"] >= 0:
        g = calibracion["guardia_alimentacion"]
        categoria = (
            g["redirigido_a_servido"]["categoria_dominante"]
            if row["delta_neto_real"] > g["umbral_delta_neto_real_g"]
            else g["redirigido_a_ruido"]["categoria_dominante"]
        )
    elif info1["es_mezclado"]:
        r = calibracion["refinamiento"]
        categoria = (
            r["cluster_servido_nuevo"]["categoria_dominante"]
            if row["delta_neto_real"] > r["umbral_delta_neto_real_g"]
            else r["cluster_ruido_remanente"]["categoria_dominante"]
        )
    return categoria


df["pred_sin_guardia"] = df.apply(lambda r: clasificar(r, con_guardia=False), axis=1)
df["pred_con_guardia"] = df.apply(lambda r: clasificar(r, con_guardia=True), axis=1)

for etiqueta, col in [("SIN guardia física", "pred_sin_guardia"), ("CON guardia física (producción real)", "pred_con_guardia")]:
    print(f"\n{'=' * 70}\n{etiqueta}\n{'=' * 70}")
    y_true, y_pred = df["categoria_real"], df[col]
    cm = confusion_matrix(y_true, y_pred, labels=CATEGORIAS)
    cm_df = pd.DataFrame(cm, index=[f"real_{c}" for c in CATEGORIAS], columns=[f"pred_{c}" for c in CATEGORIAS])
    print("\nMatriz de confusión (filas=real, columnas=predicho):")
    print(cm_df.to_string())
    print("\nReporte por categoría:")
    print(classification_report(y_true, y_pred, labels=CATEGORIAS, digits=3, zero_division=0))

print(f"\nAccuracy global CON guardia: {(df['categoria_real'] == df['pred_con_guardia']).mean():.4f}")
print(f"Accuracy global SIN guardia: {(df['categoria_real'] == df['pred_sin_guardia']).mean():.4f}")
print(f"N total evaluado: {len(df):,}")
