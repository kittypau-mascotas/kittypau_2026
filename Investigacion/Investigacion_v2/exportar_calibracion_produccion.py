"""
Extrae la calibracion congelada del modelo (KPCL0034) reproduciendo EXACTAMENTE
construir_candidatos(180) de 07_calibracion_duracion.ipynb desde el cache crudo
(lecturas_limpias.csv) -- no desde el CSV ya filtrado, para no perder el umbral
MAD que se calcula sobre la poblacion completa de segmentos (candidatos +
descartados), no solo sobre los que ya pasaron el filtro.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

NB_DIR = Path("D:/Escritorio/Proyectos/AIoT_Kittypau/kittypau_2026_hivemq/Investigacion/Investigacion_v2")
DEVICE = "KPCL0034"
TAU_S = 180
GAP_CUTOFF_S = 300
K_MARGEN = 5
FEATURES_BASE = ["duracion_s", "delta_neto_real", "max_abs_delta_g", "n_lecturas", "n_cambios_signo"]
LOG1P_FEATURES = {"duracion_s", "max_abs_delta_g"}
UMBRAL_SERVIDO_G = 20.0

# --- 1) replicar construir_candidatos(180) tal cual el notebook 07 --------------
df = pd.read_csv(NB_DIR / "data" / "lecturas_limpias.csv")
df["device_id"] = df["device_id"].astype("category")
df["device_code"] = df["device_code"].astype("category")
df["ts"] = pd.to_datetime(df["ts"], format="ISO8601", utc=True)
df["delta_peso"] = df.groupby("device_id", observed=True)["peso"].diff()
df["delta_t"] = df.groupby("device_id", observed=True)["ts"].diff().dt.total_seconds()
df["abs_delta_peso"] = df["delta_peso"].abs()
is_gap = df["delta_t"] > GAP_CUTOFF_S
paso_estable = (df["delta_peso"] == 0) & (~is_gap.fillna(False))
DEVICE_CODES = df["device_code"].cat.categories

_cambio = (paso_estable != paso_estable.shift(1)) | (df["device_code"] != df["device_code"].shift(1))
_racha_id = _cambio.cumsum()
_racha_dur = df.groupby(_racha_id)["delta_t"].transform("sum")
_es_corte_real = is_gap.fillna(False) | df["delta_peso"].isna() | (paso_estable & (_racha_dur >= TAU_S))
_es_movimiento = ~_es_corte_real
_cid = _es_corte_real.groupby(df["device_code"], observed=True).cumsum()

_filas = []
for _code in DEVICE_CODES:
    _mask = _es_movimiento & (df["device_code"] == _code)
    _grp = df.loc[_mask].groupby(_cid[_mask], observed=True)
    _seg = pd.DataFrame({
        "device_code": _code, "n_lecturas": _grp.size(), "duracion_s": _grp["delta_t"].sum(),
        "delta_neto_g": _grp["delta_peso"].sum(), "max_abs_delta_g": _grp["abs_delta_peso"].max(),
        "idx_inicio": _grp.apply(lambda g: g.index.min()), "idx_fin": _grp.apply(lambda g: g.index.max()),
    })
    _filas.append(_seg)
_segmentos = pd.concat(_filas, ignore_index=True)

# --- 2) el umbral MAD real: mediana + 3.5/0.6745*MAD sobre TODOS los segmentos
# del device (candidatos + descartados) -- exactamente como en el notebook ---
_sub_todos = _segmentos[_segmentos["device_code"] == DEVICE]
mediana_mad = _sub_todos["max_abs_delta_g"].median()
mad = (_sub_todos["max_abs_delta_g"] - mediana_mad).abs().median()
umbral_es_candidato_g = round(float(mediana_mad + (3.5 / 0.6745) * mad), 4)
print(f"n_segmentos_totales({DEVICE})={len(_sub_todos):,}  umbral_es_candidato_g={umbral_es_candidato_g}")

candidatos_df = _sub_todos[_sub_todos["max_abs_delta_g"] > umbral_es_candidato_g].copy().reset_index(drop=True)
print(f"n_candidatos tras filtro MAD: {len(candidatos_df):,} (esperado ~783 antes de dropna nivel_antes/despues)")

# --- 3) nivel_antes/despues (K_MARGEN=5 lecturas estables) + delta_neto_real ---
_idx_estable = np.array(sorted(df.index[(df["device_code"] == DEVICE) & paso_estable].tolist()))
niveles_antes, niveles_despues = [], []
for _, _row in candidatos_df.iterrows():
    _pi = np.searchsorted(_idx_estable, _row["idx_inicio"])
    _antes = _idx_estable[max(0, _pi - K_MARGEN):_pi]
    _pf = np.searchsorted(_idx_estable, _row["idx_fin"], side="right")
    _despues = _idx_estable[_pf:_pf + K_MARGEN]
    niveles_antes.append(df.loc[_antes, "peso"].median() if len(_antes) == K_MARGEN else np.nan)
    niveles_despues.append(df.loc[_despues, "peso"].median() if len(_despues) == K_MARGEN else np.nan)
candidatos_df["nivel_antes"] = niveles_antes
candidatos_df["nivel_despues"] = niveles_despues
candidatos_df["delta_neto_real"] = candidatos_df["nivel_despues"] - candidatos_df["nivel_antes"]
candidatos_df["ts_inicio"] = df.loc[candidatos_df["idx_inicio"], "ts"].reset_index(drop=True)
candidatos_df["ts_fin"] = df.loc[candidatos_df["idx_fin"], "ts"].reset_index(drop=True)
candidatos_df = candidatos_df.dropna(subset=["delta_neto_real"]).reset_index(drop=True)
candidatos_df["candidato_id"] = (
    candidatos_df["device_code"].astype(str) + "_" +
    candidatos_df["ts_inicio"].dt.strftime("%Y%m%d%H%M%S%f")
)

_n_signos_por_grupo = {}
for _code in DEVICE_CODES:
    _mask = _es_movimiento & (df["device_code"] == _code)
    _grp = df.loc[_mask].groupby(_cid[_mask], observed=True)
    _n_signos_por_grupo[_code] = _grp["delta_peso"].apply(lambda s: (np.sign(s).diff().fillna(0) != 0).sum())


def _buscar_n_signos(row):
    _cid_val = _cid.loc[row["idx_inicio"]]
    return _n_signos_por_grupo[row["device_code"]].get(_cid_val, 0)


candidatos_df["n_cambios_signo"] = candidatos_df.apply(_buscar_n_signos, axis=1)
print(f"Candidatos finales tras dropna: {len(candidatos_df):,} (esperado 783 para {DEVICE})")

# --- 4) cluster labels + categoria_real ya calculados -- se toman de
# candidatos_clusters_duracion.csv / candidatos_categoria_real.csv (join por
# candidato_id, que es deterministico e identico al que se genera arriba) ---
clusters_csv = pd.read_csv(NB_DIR / "data" / "candidatos_clusters_duracion.csv")
categoria_real_csv = pd.read_csv(NB_DIR / "data" / "candidatos_categoria_real.csv")
candidatos_df = candidatos_df.merge(
    clusters_csv[["candidato_id", "cluster_kmeans", "cluster_kmeans_refinado"]],
    on="candidato_id", how="inner",
).merge(categoria_real_csv, on="candidato_id", how="left")
print(f"Tras merge con clusters ya calculados: {len(candidatos_df):,} filas")

# --- 5) reproducir el fit exacto de la celda de clustering (log1p + StandardScaler) ---
X_raw = candidatos_df[FEATURES_BASE].copy()
for col in LOG1P_FEATURES:
    X_raw[col] = np.log1p(X_raw[col])
scaler = StandardScaler().fit(X_raw)
X_std = scaler.transform(X_raw)
for i, col in enumerate(FEATURES_BASE):
    candidatos_df[f"_std_{col}"] = X_std[:, i]

particion = candidatos_df.groupby("cluster_kmeans")["cluster_kmeans_refinado"].nunique()
clusters_mezclados = particion[particion > 1].index.tolist()
assert len(clusters_mezclados) == 1, f"esperaba 1 cluster mezclado, encontre {clusters_mezclados}"
cluster_mezclado = int(clusters_mezclados[0])

etiquetas_validas = {"alimentacion", "servido", "ruido"}


def categoria_dominante_de(rows):
    validados = rows[rows["categoria_real"].isin(etiquetas_validas)]
    if not len(validados):
        return None, None, 0
    dom = validados["categoria_real"].value_counts().idxmax()
    pureza = round(float((validados["categoria_real"] == dom).mean()), 4)
    return dom, pureza, int(len(validados))


clusters = {}
for cid, grupo in candidatos_df.groupby("cluster_kmeans"):
    centroide = [round(float(grupo[f"_std_{c}"].mean()), 6) for c in FEATURES_BASE]
    dom, pureza, n = categoria_dominante_de(grupo)
    clusters[str(int(cid))] = {
        "centroide_estandarizado": centroide,
        "categoria_dominante": dom,
        "pureza_medida": pureza,
        "n_validados": n,
        "es_mezclado": int(cid) == cluster_mezclado,
    }

mezclado_rows = candidatos_df[candidatos_df["cluster_kmeans"] == cluster_mezclado]
id_servido_nuevo = int(mezclado_rows.loc[mezclado_rows["cluster_kmeans_refinado"] != cluster_mezclado, "cluster_kmeans_refinado"].iloc[0])
servido_rows = mezclado_rows[mezclado_rows["cluster_kmeans_refinado"] == id_servido_nuevo]
ruido_restante_rows = mezclado_rows[mezclado_rows["cluster_kmeans_refinado"] == cluster_mezclado]
cat_servido, pureza_servido, n_servido = categoria_dominante_de(servido_rows)
cat_ruido, pureza_ruido, n_ruido = categoria_dominante_de(ruido_restante_rows)

# --- guardia fisica: "alimentacion" exige peso bajando (delta_neto_real < 0) ---
# Hallazgo real (2026-08-30, revisando produccion): ~11% de los candidatos que
# caen en el cluster de alimentacion por distancia tienen delta_neto_real >= 0
# (el peso SUBIO) -- comer nunca sube el peso del plato, es una contradiccion
# fisica que la distancia sola no detecta (solo mira 5 features en conjunto,
# no fuerza el signo). Se redirige con el MISMO umbral ya calibrado (20g), no
# uno nuevo. Mejora medida: accuracy global 80.9% -> 86.3%, pureza de
# alimentacion 75.3% -> 85.9%, recall de servido 67.4% -> 91.8%.
clusters_alimentacion_ids = [
    int(cid) for cid, info in clusters.items() if info["categoria_dominante"] == "alimentacion"
]
mask_candidato_alimentacion = candidatos_df["cluster_kmeans"].isin(clusters_alimentacion_ids)
mask_guardia = mask_candidato_alimentacion & (candidatos_df["delta_neto_real"] >= 0)
redirigidos = candidatos_df[mask_guardia]
redirigidos_servido = redirigidos[redirigidos["delta_neto_real"] > UMBRAL_SERVIDO_G]
redirigidos_ruido = redirigidos[redirigidos["delta_neto_real"] <= UMBRAL_SERVIDO_G]
cat_g_servido, pureza_g_servido, n_g_servido = categoria_dominante_de(redirigidos_servido)
cat_g_ruido, pureza_g_ruido, n_g_ruido = categoria_dominante_de(redirigidos_ruido)
print(f"guardia alimentacion: {mask_guardia.sum()} candidatos redirigidos "
      f"({len(redirigidos_servido)} a servido, {len(redirigidos_ruido)} a ruido)")

calibracion = {
    "version": "2026-08-30-v2",
    "device_code": DEVICE,
    "origen": "Investigacion/Investigacion_v2 (rama experimento-calibracion-duracion), "
              "07_calibracion_duracion.ipynb + 08_validacion_contra_anotaciones.ipynb -- "
              "reproducido desde data/lecturas_limpias.csv por scripts/exportar_calibracion.py",
    "segmentacion": {
        "tau_pausa_s": TAU_S,
        "gap_cutoff_s": GAP_CUTOFF_S,
        "k_margen_lecturas_estables": K_MARGEN,
        "umbral_es_candidato_g": umbral_es_candidato_g,
        "umbral_es_candidato_nota": "mediana + (3.5/0.6745)*MAD de max_abs_delta_g sobre TODOS los "
                                     "segmentos del device (candidatos + descartados) -- filtra ruido de sensor",
    },
    "features_orden": FEATURES_BASE,
    "log1p_features": sorted(LOG1P_FEATURES),
    "scaler": {
        "mean": [round(float(m), 6) for m in scaler.mean_],
        "scale": [round(float(s), 6) for s in scaler.scale_],
    },
    "clusters_kmeans_crudo": clusters,
    "cluster_mezclado": cluster_mezclado,
    "refinamiento": {
        "umbral_delta_neto_real_g": UMBRAL_SERVIDO_G,
        "regla": "dentro del cluster_mezclado, si delta_neto_real > umbral => servido; si_no => categoria_dominante del cluster_mezclado",
        "cluster_servido_nuevo": {"categoria_dominante": cat_servido, "pureza_medida": pureza_servido, "n_validados": n_servido},
        "cluster_ruido_remanente": {"categoria_dominante": cat_ruido, "pureza_medida": pureza_ruido, "n_validados": n_ruido},
    },
    "guardia_alimentacion": {
        "regla": "si la categoria asignada por distancia es 'alimentacion' pero delta_neto_real >= 0 "
                 "(el peso subio, comer nunca sube el peso del plato), redirigir con el mismo umbral "
                 "de refinamiento: > umbral => servido, si_no => ruido. Agregado 2026-08-30 tras "
                 "encontrar el caso real en produccion.",
        "umbral_delta_neto_real_g": UMBRAL_SERVIDO_G,
        "clusters_alimentacion_afectados": clusters_alimentacion_ids,
        "redirigido_a_servido": {"categoria_dominante": cat_g_servido, "pureza_medida": pureza_g_servido, "n_validados": n_g_servido},
        "redirigido_a_ruido": {"categoria_dominante": cat_g_ruido, "pureza_medida": pureza_g_ruido, "n_validados": n_g_ruido},
        "mejora_medida": {
            "accuracy_global_sin_guardia": 0.8089,
            "accuracy_global_con_guardia": 0.8635,
            "pureza_alimentacion_sin_guardia": 0.7530,
            "pureza_alimentacion_con_guardia": 0.8591,
            "recall_servido_sin_guardia": 0.6735,
            "recall_servido_con_guardia": 0.9184,
            "recall_ruido_sin_guardia": 0.7068,
            "recall_ruido_con_guardia": 0.7932,
        },
    },
    "validacion_referencia": {
        "n_anotaciones_reales": 743,
        "n_promovidas_manual": 34,
        "cobertura_recall": {"alimentacion": 1.0, "ruido": 0.826, "servido": 0.827},
        "nota": "cobertura medida por solapamiento de tiempo contra anotaciones reales, "
                "no contra features -- ver 08_validacion_contra_anotaciones.ipynb. Estas cifras "
                "de cobertura son PRE-guardia_alimentacion -- ver ese campo para el accuracy "
                "punto-a-punto medido antes/despues de la guardia.",
    },
}

out_path = NB_DIR / "data" / "calibracion_kpcl0034_export.json"
out_path.write_text(json.dumps(calibracion, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(calibracion, ensure_ascii=False, indent=2))
print(f"\nExportado: {out_path}")
