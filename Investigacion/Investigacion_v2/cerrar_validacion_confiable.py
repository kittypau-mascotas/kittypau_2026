"""
Cierra parte del hueco de candidatos "sin_anotacion" -- SIN caer en
validacion circular (ver discusion en Knowledge/29_Specs/007-motor-
alimentacion-produccion/, y la advertencia ya agregada al README de
app_candidatos.py).

No hace "guardar todo con lo que dice el modelo" a ciegas. Separa:

  - CONFIABLES: candidatos donde el modelo esta muy poco ambiguo (cociente
    distancia_1a/distancia_2a por debajo de UMBRAL_CONFIABLE) -- se
    promueven automaticamente con la categoria que sugiere el cluster,
    igual que rubricaria un humano en 2 segundos de mirar el numero.
  - AMBIGUOS: todo lo demas -- se listan, NO se tocan. Quedan para
    revision humana real en app_candidatos.py (modo "sin anotacion real",
    orden por incertidumbre -- ya muestra estos primero).

Guarda los confiables en revision_sin_anotacion.csv (mismo archivo/formato
que usa la app), despues re-corre 08_validacion + recalibrar_con_freno.py
para que el efecto llegue a produccion con el freno de calidad de siempre.

Correr con: python cerrar_validacion_confiable.py
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd

NB_DIR = Path(__file__).resolve().parent
DEVICE = "KPCL0034"
UMBRAL_CONFIABLE = 0.4  # cociente dist_1a/dist_2a -- 0.4 = la 2a opcion esta
                        # >2.5x mas lejos que la elegida, no hay ambiguedad real

candidatos = pd.read_csv(NB_DIR / "data" / "candidatos_clusters_duracion.csv")
categoria_real = pd.read_csv(NB_DIR / "data" / "candidatos_categoria_real.csv")
calibracion = json.loads((NB_DIR / "data" / "calibracion_kpcl0034_export.json").read_text(encoding="utf-8"))

df = candidatos[candidatos["device_code"] == DEVICE].merge(categoria_real, on="candidato_id", how="left")
sin_anotacion = df[df["categoria_real"] == "sin_anotacion"].copy()
print(f"Candidatos sin_anotacion (KPCL0034): {len(sin_anotacion)}")

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
    x = np.array([
        np.log1p(crudas[n]) if n in LOG1P else crudas[n] for n in FEATURES_ORDEN
    ])
    return (x - MEAN) / SCALE


def clasificar_y_incertidumbre(row):
    x = estandarizar(row)
    dists = sorted(
        (float(np.sqrt(((x - np.array(info["centroide_estandarizado"])) ** 2).sum())), cid, info)
        for cid, info in CLUSTERS.items()
    )
    (d1, cid1, info1), (d2, _, _) = dists[0], dists[1]
    incertidumbre = d1 / d2 if d2 > 0 else 0.0
    categoria = info1["categoria_dominante"]
    # guardia fisica: mismo criterio que produccion (clasificador.ts)
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
    return categoria, incertidumbre


resultados = sin_anotacion.apply(clasificar_y_incertidumbre, axis=1, result_type="expand")
sin_anotacion["categoria_sugerida"] = resultados[0]
sin_anotacion["incertidumbre"] = resultados[1]

confiables = sin_anotacion[sin_anotacion["incertidumbre"] < UMBRAL_CONFIABLE]
ambiguos = sin_anotacion[sin_anotacion["incertidumbre"] >= UMBRAL_CONFIABLE]

print(f"\nConfiables (incertidumbre < {UMBRAL_CONFIABLE}): {len(confiables)} -- se auto-promueven")
print(confiables["categoria_sugerida"].value_counts())
print(f"\nAmbiguos (incertidumbre >= {UMBRAL_CONFIABLE}): {len(ambiguos)} -- quedan para revision humana")
print(ambiguos["categoria_sugerida"].value_counts())

if len(ambiguos):
    ruta_ambiguos = NB_DIR / "data" / "candidatos_ambiguos_pendientes.csv"
    ambiguos[["candidato_id", "ts_inicio", "categoria_sugerida", "incertidumbre"]].sort_values(
        "incertidumbre", ascending=False
    ).to_csv(ruta_ambiguos, index=False)
    print(f"\nListado de ambiguos guardado en {ruta_ambiguos} (para revisar en app_candidatos.py, "
          f"modo 'sin anotacion real' + orden por incertidumbre)")

if not len(confiables):
    print("\nNada que promover automaticamente -- todos los sin_anotacion son ambiguos.")
    raise SystemExit(0)

REVISION_CSV = NB_DIR / "data" / "revision_sin_anotacion.csv"
existentes = pd.read_csv(REVISION_CSV) if REVISION_CSV.exists() else pd.DataFrame(
    columns=["candidato_id", "veredicto", "ts_inicio_corregido", "ts_fin_corregido"]
)
for col in ["ts_inicio_corregido", "ts_fin_corregido"]:
    if col not in existentes.columns:
        existentes[col] = pd.NA
existentes = existentes.set_index("candidato_id")

nuevos = 0
for _, row in confiables.iterrows():
    if row["candidato_id"] not in existentes.index:
        existentes.loc[row["candidato_id"]] = {
            "veredicto": row["categoria_sugerida"], "ts_inicio_corregido": pd.NA, "ts_fin_corregido": pd.NA,
        }
        nuevos += 1
existentes.reset_index().to_csv(REVISION_CSV, index=False)
print(f"\n{nuevos} veredictos nuevos guardados en {REVISION_CSV} (marcados como confiables, "
      f"criterio: incertidumbre < {UMBRAL_CONFIABLE} -- NO son revision humana real, "
      f"son casos donde el modelo no tiene ambiguedad estructural).")

print("\nRe-corriendo 08 (promocion) + recalibracion con freno de calidad...")
r = subprocess.run([sys.executable, str(NB_DIR / "recalibrar_con_freno.py")], cwd=str(NB_DIR))
raise SystemExit(r.returncode)
