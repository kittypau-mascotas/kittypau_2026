"""
Motor Matemático v2 — Kittypau Alpha v2
=======================================
~130 features matemáticas de curvas de peso del sensor KPCL.
Sin modelos ML: solo geometría, estadística y teoría de información.

Familias implementadas:
  F00  Features clásicas base (legado v1)                   5 features
  F01  Geometría diferencial (derivadas 1ª, 2ª, 3ª)        25 features
  F02  Curvatura κ                                           5 features
  F03  Longitud de arco                                      4 features
  F04  Tortuosidad                                           2 features
  F05  Energía                                               6 features
  F06  Entropías (Shannon, Sample, Permutation)              3 features
  F07  Dimensión fractal (Higuchi, Katz)                     2 features
  F08  Complejidad Lempel-Ziv normalizada                    1 feature
  F09  Análisis frecuencial (FFT, autocorrelación)           7 features
  F10  Estadística robusta                                   7 features
  F11  Topología (picos, valles, plateaus)                   8 features
  F12  Ajuste a templates canónicos (12 similitudes coseno) 12 features
  F13  Dinámica temporal (rise time, settling, etc.)        12 features
  F14  Features derivadas (índices compuestos)               6 features

Total: ~105 features + Evidence Engine + clasificador determinístico

Uso rápido:
    from shape_features_v2 import extraer_features, evidence_score, clasificar
    feats = extraer_features(peso_array, resample_s=30.0)
    pred  = evidence_score(feats)
    cat   = clasificar(feats)
"""
from __future__ import annotations

import warnings
from typing import Any

import numpy as np
from scipy import signal as ssignal
from scipy import stats

# ─────────────────────────────────────────────────────────────────────────────
# Feature Registry
# ─────────────────────────────────────────────────────────────────────────────

REGISTRY: dict[str, dict[str, Any]] = {}


def _reg(nombre: str, familia: str, formula: str, rango: tuple,
         unidad: str, significado: str, complejidad: str = "O(n)") -> None:
    REGISTRY[nombre] = {
        "familia":      familia,
        "formula":      formula,
        "rango":        rango,
        "unidad":       unidad,
        "significado":  significado,
        "complejidad":  complejidad,
    }


def feature_list_by_family() -> dict[str, list[str]]:
    """Retorna dict {familia: [feature_names]}."""
    result: dict[str, list[str]] = {}
    for k, v in REGISTRY.items():
        result.setdefault(v["familia"], []).append(k)
    return result


def feature_info(nombre: str) -> dict | None:
    return REGISTRY.get(nombre)


# ─────────────────────────────────────────────────────────────────────────────
# F00 — Features clásicas base (compatibilidad con v1)
# ─────────────────────────────────────────────────────────────────────────────

def _f00_clasicas(valores: np.ndarray, resample_s: float) -> dict:
    n  = len(valores)
    dy = np.diff(valores)

    # Índice de monotonía
    monotonicity = float(np.mean(np.sign(dy))) if len(dy) > 0 else 0.0

    # R² del ajuste lineal
    x      = np.arange(n, dtype=float)
    coef   = np.polyfit(x, valores, 1)
    fitted = np.polyval(coef, x)
    ss_res = float(np.sum((valores - fitted) ** 2))
    ss_tot = float(np.sum((valores - valores.mean()) ** 2))
    r2     = round(1.0 - ss_res / ss_tot, 4) if ss_tot > 1e-6 else 0.0

    # ZCR de la derivada
    zcr = round(
        float(np.sum(np.diff(np.sign(dy)) != 0) / max(len(dy), 1)), 4
    ) if len(dy) > 1 else 0.0

    # Similitud coseno v1 — invariante a escala y nivel
    v_delta   = valores - valores[0]
    v_abs_max = float(np.max(np.abs(v_delta))) + 1e-6
    v_norm    = v_delta / v_abs_max

    def _cos(a: np.ndarray, b: np.ndarray) -> float:
        denom = np.linalg.norm(a) * np.linalg.norm(b)
        return float(np.dot(a, b) / denom) if denom > 1e-9 else 0.0

    sim_alim = round(_cos(v_norm, np.linspace(0.0, -1.0, n)), 4)
    sim_serv = round(_cos(v_norm, np.linspace(0.0, +1.0, n)), 4)

    return {
        "monotonicity":     round(monotonicity, 4),
        "r2_lineal":        r2,
        "zcr":              zcr,
        "sim_alimentacion": sim_alim,
        "sim_servido":      sim_serv,
    }


_reg("monotonicity",     "F00_clasicas", "mean(sign(diff(y)))", (-1.0, 1.0), "adim",
     "Consistencia de dirección: −1 baja siempre, +1 sube siempre, 0 oscila")
_reg("r2_lineal",        "F00_clasicas", "1 − SS_res/SS_tot", (0.0, 1.0), "adim",
     "Bondad del ajuste lineal: 1=tendencia perfectamente lineal, 0=sin tendencia")
_reg("zcr",              "F00_clasicas", "count(sign_changes_dy)/n", (0.0, 1.0), "adim",
     "Tasa de cambios de signo en la derivada: alto=oscilante, bajo=tendencia limpia")
_reg("sim_alimentacion", "F00_clasicas", "cos(v_norm, ramp_down)", (-1.0, 1.0), "adim",
     "Similitud coseno con rampa descendente (template ideal de alimentación)")
_reg("sim_servido",      "F00_clasicas", "cos(v_norm, ramp_up)", (-1.0, 1.0), "adim",
     "Similitud coseno con rampa ascendente (template ideal de servido)")


# ─────────────────────────────────────────────────────────────────────────────
# F01 — Geometría diferencial (derivadas 1ª, 2ª, 3ª)
# ─────────────────────────────────────────────────────────────────────────────

def _stats_arr(arr: np.ndarray, prefix: str) -> dict:
    if len(arr) == 0:
        return {f"{prefix}_{s}": 0.0 for s in ("mean", "std", "max", "min", "energy", "rms")}
    return {
        f"{prefix}_mean":   round(float(np.mean(arr)), 4),
        f"{prefix}_std":    round(float(np.std(arr)), 4),
        f"{prefix}_max":    round(float(np.max(arr)), 4),
        f"{prefix}_min":    round(float(np.min(arr)), 4),
        f"{prefix}_energy": round(float(np.sum(arr ** 2)), 4),
        f"{prefix}_rms":    round(float(np.sqrt(np.mean(arr ** 2))), 4),
    }


def _f01_derivadas(valores: np.ndarray, resample_s: float) -> dict:
    dy  = np.diff(valores) / resample_s        # velocidad (g/s)
    d2y = np.diff(dy)  / resample_s if len(dy)  > 1 else np.array([0.0])  # aceleración
    d3y = np.diff(d2y) / resample_s if len(d2y) > 1 else np.array([0.0])  # jerk

    out = {}
    out.update(_stats_arr(dy,  "d1"))
    out.update(_stats_arr(d2y, "d2"))
    out.update(_stats_arr(d3y, "d3"))

    # Cambios de signo
    out["d1_n_sign_changes"] = int(np.sum(np.diff(np.sign(dy))  != 0)) if len(dy)  > 1 else 0
    out["d2_n_sign_changes"] = int(np.sum(np.diff(np.sign(d2y)) != 0)) if len(d2y) > 1 else 0

    # Fracción de tiempo en fase positiva/negativa
    out["d1_frac_pos"] = round(float(np.mean(dy > 0)), 4) if len(dy) > 0 else 0.0
    out["d1_frac_neg"] = round(float(np.mean(dy < 0)), 4) if len(dy) > 0 else 0.0

    return out


for _pfx, _desc in [("d1", "velocidad g/s"), ("d2", "aceleración g/s²"), ("d3", "jerk g/s³")]:
    for _stat in ("mean", "std", "max", "min", "energy", "rms"):
        _reg(f"{_pfx}_{_stat}", "F01_derivadas",
             f"{_stat}(diff(y)/{_pfx.upper()}/dt)", (-1e9, 1e9), "g/s^n",
             f"{_desc.capitalize()}: {_stat}")
_reg("d1_n_sign_changes", "F01_derivadas", "count(diff(sign(dy))≠0)", (0, 1e6), "adim",
     "N° cambios de signo en la velocidad — alto en ruido")
_reg("d1_frac_pos", "F01_derivadas", "mean(dy>0)", (0, 1), "adim",
     "Fracción del tiempo con peso subiendo — ~1 en servido")
_reg("d1_frac_neg", "F01_derivadas", "mean(dy<0)", (0, 1), "adim",
     "Fracción del tiempo con peso bajando — ~0.5 en alimentación (pausas)")


# ─────────────────────────────────────────────────────────────────────────────
# F02 — Curvatura κ
# ─────────────────────────────────────────────────────────────────────────────

def _f02_curvatura(valores: np.ndarray, resample_s: float) -> dict:
    n = len(valores)
    _nan = {"curvature_mean": 0.0, "curvature_max": 0.0, "curvature_min": 0.0,
            "curvature_std": 0.0, "curvature_integral": 0.0}
    if n < 4:
        return _nan

    x   = np.arange(n) * resample_s
    dy  = np.gradient(valores, x)
    d2y = np.gradient(dy, x)
    kappa = np.abs(d2y) / (1.0 + dy ** 2) ** 1.5

    return {
        "curvature_mean":     round(float(np.mean(kappa)), 6),
        "curvature_max":      round(float(np.max(kappa)), 6),
        "curvature_min":      round(float(np.min(kappa)), 6),
        "curvature_std":      round(float(np.std(kappa)), 6),
        "curvature_integral": round(float(np.trapezoid(kappa, dx=resample_s)), 4),
    }


_reg("curvature_mean",     "F02_curvatura", "|y''|/(1+y'^2)^1.5 media", (0, 1e6), "1/g",
     "Curvatura media — mide cuán 'doblada' es la curva en promedio")
_reg("curvature_max",      "F02_curvatura", "max(κ)", (0, 1e6), "1/g",
     "Curvatura máxima — punto de mayor inflexión (muy alto en servido brusco)")
_reg("curvature_std",      "F02_curvatura", "std(κ)", (0, 1e6), "1/g",
     "Variabilidad de la curvatura — alto en señales irregulares")
_reg("curvature_integral", "F02_curvatura", "∫κ dt", (0, 1e6), "adim",
     "Curvatura total acumulada — distingue curvas suaves de bruscas")


# ─────────────────────────────────────────────────────────────────────────────
# F03 — Longitud de arco
# ─────────────────────────────────────────────────────────────────────────────

def _f03_arco(valores: np.ndarray, resample_s: float) -> dict:
    n = len(valores)
    if n < 2:
        return {"arc_length": 0.0, "arc_length_per_min": 0.0,
                "arc_vs_displacement": 1.0, "arc_per_n": 0.0}

    dx      = resample_s
    dy      = np.diff(valores)
    segs    = np.sqrt(dx ** 2 + dy ** 2)
    L       = float(np.sum(segs))
    dur_min = (n - 1) * resample_s / 60
    disp    = abs(float(valores[-1] - valores[0]))

    return {
        "arc_length":          round(L, 3),
        "arc_length_per_min":  round(L / max(dur_min, 1e-6), 3),
        "arc_vs_displacement": round(L / max(disp, 1e-6), 3),
        "arc_per_n":           round(L / n, 3),
    }


_reg("arc_length",          "F03_arco", "Σ√(Δt²+Δy²)", (0, 1e6), "u·g",
     "Longitud real de la trayectoria en el plano tiempo-peso")
_reg("arc_length_per_min",  "F03_arco", "arc_length/dur_min", (0, 1e6), "u·g/min",
     "Actividad normalizada por duración — alto en ruido con oscilaciones rápidas")
_reg("arc_vs_displacement", "F03_arco", "arc_length/|Δpeso|", (1, 1e6), "adim",
     "Cuánto 'rodeo' hace la curva por cada gramo de cambio neto — alto en ruido")


# ─────────────────────────────────────────────────────────────────────────────
# F04 — Tortuosidad
# ─────────────────────────────────────────────────────────────────────────────

def _f04_tortuosidad(valores: np.ndarray, resample_s: float) -> dict:
    n   = len(valores)
    arc = _f03_arco(valores, resample_s)
    L   = arc["arc_length"]

    dur_s  = (n - 1) * resample_s
    disp   = abs(float(valores[-1] - valores[0]))
    direct = float(np.sqrt(dur_s ** 2 + disp ** 2)) + 1e-9

    tortuosity  = L / direct
    straightness = min(1.0, direct / max(L, 1e-9))

    return {
        "tortuosity":   round(tortuosity, 4),
        "straightness": round(straightness, 4),
    }


_reg("tortuosity",   "F04_tortuosidad", "arc_length/dist_directa", (1.0, 1e6), "adim",
     "T≈1: curva recta; T>>1: zigzag — alto en ruido, bajo en alimentación limpia")
_reg("straightness", "F04_tortuosidad", "1/tortuosity", (0, 1), "adim",
     "Rectitud: 1=trayectoria recta, 0=máximo zigzag")


# ─────────────────────────────────────────────────────────────────────────────
# F05 — Energía
# ─────────────────────────────────────────────────────────────────────────────

def _f05_energia(valores: np.ndarray, resample_s: float) -> dict:
    dy  = np.diff(valores) / resample_s
    d2y = np.diff(dy) / resample_s if len(dy) > 1 else np.array([0.0])

    e_sig = float(np.sum(valores ** 2))
    e_d1  = float(np.sum(dy ** 2))

    return {
        "energy_signal":          round(e_sig, 2),
        "energy_d1":              round(e_d1, 4),
        "energy_d2":              round(float(np.sum(d2y ** 2)), 4),
        "rms_signal":             round(float(np.sqrt(np.mean(valores ** 2))), 3),
        "rms_d1":                 round(float(np.sqrt(np.mean(dy ** 2))), 4),
        "energy_ratio_d1_signal": round(e_d1 / max(e_sig, 1e-9), 6),
    }


_reg("energy_signal", "F05_energia", "Σy²", (0, 1e9), "g²",
     "Energía total de la señal de peso")
_reg("energy_d1",     "F05_energia", "Σ(dy/dt)²", (0, 1e9), "g²/s²",
     "Energía de la velocidad de cambio — muy alto en servido brusco")
_reg("energy_d2",     "F05_energia", "Σ(d²y/dt²)²", (0, 1e9), "g²/s⁴",
     "Energía de la aceleración — muy alto en arranques/paradas bruscas")
_reg("rms_d1",        "F05_energia", "√(Σdy²/n)", (0, 1e6), "g/s",
     "RMS de la velocidad — mide la 'agitación' media de la señal")
_reg("energy_ratio_d1_signal", "F05_energia", "energy_d1/energy_signal", (0, 1e6), "1/s²",
     "Energía relativa de cambio: alto=señal muy dinámica respecto a su nivel")


# ─────────────────────────────────────────────────────────────────────────────
# F06 — Entropías
# ─────────────────────────────────────────────────────────────────────────────

def _shannon_entropy(arr: np.ndarray, n_bins: int = 10) -> float:
    if len(arr) < 2:
        return 0.0
    counts, _ = np.histogram(arr, bins=n_bins)
    probs = counts / max(counts.sum(), 1)
    probs = probs[probs > 0]
    return float(-np.sum(probs * np.log2(probs + 1e-12)))


def _permutation_entropy(arr: np.ndarray, m: int = 3, tau: int = 1) -> float:
    """Permutation Entropy normalizada (Bandt & Pompe 2002). m=orden."""
    import math
    n = len(arr)
    if n < m * tau + 1:
        return 0.0
    counts: dict = {}
    for i in range(n - (m - 1) * tau):
        pattern = tuple(np.argsort(arr[i: i + m * tau: tau]))
        counts[pattern] = counts.get(pattern, 0) + 1
    total  = sum(counts.values())
    probs  = np.array([v / total for v in counts.values()])
    h_max  = math.log2(math.factorial(m)) if m >= 1 else 1.0
    return float(-np.sum(probs * np.log2(probs + 1e-12)) / max(h_max, 1e-9))


def _sample_entropy(arr: np.ndarray, m: int = 2, r_factor: float = 0.2) -> float:
    """Sample Entropy (Richman & Moorman 2000). Limitar arr a ≤60 puntos."""
    n = len(arr)
    r = r_factor * float(np.std(arr)) + 1e-9
    if n < 2 * (m + 1):
        return 0.0

    def _count(length: int) -> int:
        cnt = 0
        for i in range(n - length):
            t = arr[i: i + length]
            for j in range(i + 1, n - length):
                if np.max(np.abs(arr[j: j + length] - t)) < r:
                    cnt += 1
        return cnt

    A, B = _count(m + 1), _count(m)
    if B == 0:
        return 0.0
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return round(float(-np.log(max(A, 1e-9) / max(B, 1e-9))), 4)


def _f06_entropias(valores: np.ndarray, resample_s: float) -> dict:
    arr_short = valores[: min(len(valores), 60)]  # limitar O(n²) de Sample Entropy
    return {
        "entropy_shannon":     round(_shannon_entropy(valores), 4),
        "entropy_permutation": round(_permutation_entropy(valores, m=3), 4),
        "entropy_sample":      _sample_entropy(arr_short, m=2),
    }


_reg("entropy_shannon",     "F06_entropias", "−Σp_i·log₂(p_i)", (0, 1e6), "bits",
     "Entropía de Shannon del histograma: alto=distribución plana (ruido)")
_reg("entropy_permutation", "F06_entropias", "PE norm. (m=3)", (0, 1), "adim",
     "Permutation Entropy: 0=completamente predecible, 1=máxima complejidad ordinal")
_reg("entropy_sample",      "F06_entropias", "−log(A/B) m=2", (0, 1e6), "adim",
     "Sample Entropy: irregularidad intrínseca de la señal (Richman & Moorman 2000)")


# ─────────────────────────────────────────────────────────────────────────────
# F07 — Dimensión fractal
# ─────────────────────────────────────────────────────────────────────────────

def _higuchi_fd(arr: np.ndarray, kmax: int = 5) -> float:
    """Dimensión fractal de Higuchi 1988."""
    n = len(arr)
    if n < 2 * kmax + 2:
        return 1.0
    ks = list(range(1, kmax + 1))
    L  = []
    for k in ks:
        lk = []
        for m in range(1, k + 1):
            indices = np.arange(m - 1, n, k)
            if len(indices) < 2:
                continue
            sub  = arr[indices]
            norm = (n - 1) / (len(sub) * k)
            lk.append(np.sum(np.abs(np.diff(sub))) * norm)
        if lk:
            L.append(float(np.mean(lk)))
    if len(L) < 2:
        return 1.0
    x = np.log(np.array(ks[: len(L)], dtype=float))
    y = np.log(np.maximum(L, 1e-12))
    try:
        slope = float(np.polyfit(x, y, 1)[0])
        return round(abs(slope), 4)
    except Exception:
        return 1.0


def _katz_fd(arr: np.ndarray) -> float:
    """Dimensión fractal de Katz 1988. O(n)."""
    n = len(arr)
    if n < 2:
        return 1.0
    L = float(np.sum(np.abs(np.diff(arr)))) + 1e-9
    d = float(np.max(np.abs(arr - arr[0]))) + 1e-9
    log_n = np.log10(n)
    denom = log_n + np.log10(L / d)
    return round(float(log_n / denom) if denom != 0 else 1.0, 4)


def _f07_fractal(valores: np.ndarray, resample_s: float) -> dict:
    return {
        "fractal_higuchi": _higuchi_fd(valores),
        "fractal_katz":    _katz_fd(valores),
    }


_reg("fractal_higuchi", "F07_fractal", "log-log pendiente de L(k)", (1.0, 2.0), "adim",
     "Dimensión fractal Higuchi: 1=curva suave, >1.5=señal muy rugosa (ruido)")
_reg("fractal_katz",    "F07_fractal", "log(n)/(log(n)+log(L/d))", (1.0, 2.0), "adim",
     "Dimensión fractal Katz: estimación rápida O(n) de la rugosidad")


# ─────────────────────────────────────────────────────────────────────────────
# F08 — Complejidad de Lempel-Ziv
# ─────────────────────────────────────────────────────────────────────────────

def _f08_lempel_ziv(valores: np.ndarray, resample_s: float) -> dict:
    import math
    n = len(valores)
    if n < 2:
        return {"lempel_ziv": 0.0}

    med    = np.median(valores)
    binary = "".join("1" if v >= med else "0" for v in valores)

    # LZ78-style con set — O(n log n) vs O(n²) del substring search original
    seen: set[str] = set()
    i, c = 0, 1
    while i < n:
        length = 1
        while i + length <= n and binary[i: i + length] in seen:
            length += 1
        seen.add(binary[i: i + length])
        c += 1
        i += length

    b_n = n / math.log2(n) if n > 1 else 1.0
    return {"lempel_ziv": round(float(c) / b_n, 4)}


_reg("lempel_ziv", "F08_lempel_ziv", "C(n)/b(n) — señal binarizada", (0, 1), "adim",
     "Complejidad Lempel-Ziv: 0=repetitiva (alimentación rítmica), 1=aleatoria (ruido eléctrico)")


# ─────────────────────────────────────────────────────────────────────────────
# F09 — Análisis frecuencial
# ─────────────────────────────────────────────────────────────────────────────

def _f09_frecuencial(valores: np.ndarray, resample_s: float) -> dict:
    n  = len(valores)
    _z = {"freq_dominant_hz": 0.0, "freq_centroid_hz": 0.0, "power_ratio_low": 0.0,
          "autocorr_lag1": 0.0, "autocorr_lag3": 0.0, "autocorr_lag5": 0.0,
          "spectral_entropy": 0.0}
    if n < 4:
        return _z

    fs    = 1.0 / resample_s
    freqs = np.fft.rfftfreq(n, d=resample_s)
    psd   = np.abs(np.fft.rfft(valores - valores.mean())) ** 2

    # Frecuencia dominante (ignorar DC)
    dom_idx       = int(np.argmax(psd[1:]) + 1) if len(psd) > 1 else 0
    freq_dominant = float(freqs[dom_idx]) if dom_idx < len(freqs) else 0.0

    # Centroide espectral
    total_power   = float(np.sum(psd))
    freq_centroid = float(np.sum(freqs * psd) / total_power) if total_power > 0 else 0.0

    # Fracción de potencia en bajas frecuencias (< fs/4)
    low_mask       = freqs < (fs / 4)
    power_ratio_low = float(np.sum(psd[low_mask]) / max(total_power, 1e-9))

    # Entropía espectral
    psd_n = psd / max(total_power, 1e-9)
    psd_n = psd_n[psd_n > 0]
    sp_entropy = float(-np.sum(psd_n * np.log2(psd_n + 1e-12)))

    # Autocorrelación
    def _acf(lag: int) -> float:
        if len(valores) <= lag:
            return 0.0
        xc  = valores - valores.mean()
        var = float(np.var(xc))
        return float(np.mean(xc[:-lag] * xc[lag:])) / var if var > 1e-9 else 0.0

    return {
        "freq_dominant_hz":  round(freq_dominant, 6),
        "freq_centroid_hz":  round(freq_centroid, 6),
        "power_ratio_low":   round(power_ratio_low, 4),
        "autocorr_lag1":     round(_acf(1), 4),
        "autocorr_lag3":     round(_acf(3), 4),
        "autocorr_lag5":     round(_acf(5), 4),
        "spectral_entropy":  round(sp_entropy, 4),
    }


_reg("freq_dominant_hz",  "F09_frecuencial", "argmax(|FFT|²)", (0, 1e6), "Hz",
     "Frecuencia de mayor potencia espectral del segmento")
_reg("power_ratio_low",   "F09_frecuencial", "P(<fs/4)/P_total", (0, 1), "adim",
     "Fracción de potencia en bajas frecuencias: alto=variación lenta (alimentación)")
_reg("autocorr_lag1",     "F09_frecuencial", "corr(y[t], y[t-1])", (-1, 1), "adim",
     "Autocorrelación lag-1: alta en señales suaves (tendencia), baja en ruido")
_reg("spectral_entropy",  "F09_frecuencial", "−Σp_f·log₂(p_f)", (0, 1e6), "bits",
     "Entropía espectral: alto=energía en muchas frecuencias (ruido), bajo=frecuencia dominante")


# ─────────────────────────────────────────────────────────────────────────────
# F10 — Estadística robusta
# ─────────────────────────────────────────────────────────────────────────────

def _f10_robusta(valores: np.ndarray, resample_s: float) -> dict:
    q75, q25 = np.percentile(valores, [75, 25])
    med  = float(np.median(valores))
    mad  = float(np.median(np.abs(valores - med)))

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        sk = float(stats.skew(valores))     if len(valores) > 2 else 0.0
        ku = float(stats.kurtosis(valores)) if len(valores) > 2 else 0.0

    n10     = max(1, int(len(valores) * 0.10))
    trimmed = np.sort(valores)[n10: -n10] if len(valores) > 2 * n10 else valores
    cv      = float(np.std(valores) / max(abs(float(np.mean(valores))), 1e-9))

    return {
        "stat_median":       round(med, 3),
        "stat_mad":          round(mad, 3),
        "stat_iqr":          round(float(q75 - q25), 3),
        "stat_skewness":     round(sk, 4),
        "stat_kurtosis":     round(ku, 4),
        "stat_trimmed_mean": round(float(np.mean(trimmed)), 3),
        "stat_cv":           round(cv, 4),
    }


_reg("stat_median",       "F10_robusta", "median(y)", (-1e6, 1e6), "g",
     "Mediana del peso — robusta a outliers del sensor")
_reg("stat_mad",          "F10_robusta", "median(|y−median(y)|)", (0, 1e6), "g",
     "MAD: variabilidad robusta del peso alrededor de la mediana")
_reg("stat_iqr",          "F10_robusta", "Q75−Q25", (0, 1e6), "g",
     "Rango intercuartílico — mide la dispersión central del peso")
_reg("stat_skewness",     "F10_robusta", "E[(y−μ)³]/σ³", (-1e6, 1e6), "adim",
     "Asimetría: <0=cola izquierda larga (bajada rápida inicial), >0=cola derecha")
_reg("stat_kurtosis",     "F10_robusta", "E[(y−μ)⁴]/σ⁴−3", (-1e6, 1e6), "adim",
     "Curtosis: >0=distribución apuntada (picos bruscos), <0=distribución plana")
_reg("stat_cv",           "F10_robusta", "std/|mean|", (0, 1e6), "adim",
     "Coeficiente de variación: variabilidad relativa al nivel medio del bowl")


# ─────────────────────────────────────────────────────────────────────────────
# F11 — Topología (picos y valles)
# ─────────────────────────────────────────────────────────────────────────────

def _f11_topologia(valores: np.ndarray, resample_s: float) -> dict:
    n    = len(valores)
    _nan = {"n_maxima": 0, "n_minima": 0, "n_plateaus": 0,
            "peak_prominence_mean": 0.0, "peak_width_mean": 0.0,
            "peak_density": 0.0, "peak_height_max": 0.0, "valley_depth_min": 0.0}
    if n < 4:
        return _nan

    min_prom = max(float(np.std(valores)) * 0.3, 0.5)
    peaks,   pp = ssignal.find_peaks( valores, prominence=min_prom, width=1)
    valleys, vp = ssignal.find_peaks(-valores, prominence=min_prom, width=1)

    # Plateaus: ventanas de 5 puntos con std < 0.5 g
    w = min(5, n)
    pla_mask = np.array([
        float(np.std(valores[max(0, i - w // 2): min(n, i + w // 2 + 1)])) < 0.5
        for i in range(n)
    ])
    n_plateaus = int(np.sum(np.diff(pla_mask.astype(int)) > 0))
    dur_min    = (n - 1) * resample_s / 60

    return {
        "n_maxima":             int(len(peaks)),
        "n_minima":             int(len(valleys)),
        "n_plateaus":           n_plateaus,
        "peak_prominence_mean": round(float(np.mean(pp["prominences"])) if len(peaks) > 0 else 0.0, 3),
        "peak_width_mean":      round(float(np.mean(pp["widths"]) * resample_s / 60) if len(peaks) > 0 else 0.0, 3),
        "peak_density":         round(len(peaks) / max(dur_min, 0.5), 3),
        "peak_height_max":      round(float(np.max(valores[peaks])) if len(peaks) > 0 else float(np.max(valores)), 2),
        "valley_depth_min":     round(float(np.min(valores[valleys])) if len(valleys) > 0 else float(np.min(valores)), 2),
    }


_reg("n_maxima",             "F11_topologia", "find_peaks(y)", (0, 1e6), "adim",
     "N° de máximos locales")
_reg("n_minima",             "F11_topologia", "find_peaks(−y)", (0, 1e6), "adim",
     "N° de mínimos locales")
_reg("n_plateaus",           "F11_topologia", "grupos con std<0.5g", (0, 1e6), "adim",
     "N° de regiones planas (pausas): más en alimentación que en ruido continuo")
_reg("peak_prominence_mean", "F11_topologia", "mean(prominence)", (0, 1e6), "g",
     "Prominencia media de los picos — alta en ruido con spikes")
_reg("peak_density",         "F11_topologia", "n_peaks/dur_min", (0, 1e6), "picos/min",
     "Densidad de picos: alta en ruido, baja en alimentación gradual")


# ─────────────────────────────────────────────────────────────────────────────
# F12 — Ajuste a templates canónicos (similitud coseno)
# ─────────────────────────────────────────────────────────────────────────────

def _cos_sim(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom > 1e-9 else 0.0


def _norm_seg(valores: np.ndarray) -> np.ndarray:
    """Normaliza: relativo al inicio, rango [-1, 1]."""
    v     = valores - valores[0]
    v_max = float(np.max(np.abs(v))) + 1e-6
    return v / v_max


def _make_templates(n: int) -> dict[str, np.ndarray]:
    t = np.linspace(0, 1, n)
    serv = np.concatenate([
        np.linspace(0, 1, max(1, n // 3)),
        np.ones(n - max(1, n // 3))
    ])
    doble = np.concatenate([
        np.zeros(n // 3),
        np.linspace(0, -1, n - n // 3)
    ])
    return {
        # Bajada (alimentación)
        "tpl_ramp_down":       np.linspace(0.0, -1.0, n),
        "tpl_exp_decay":       -(1 - np.exp(-3 * t)),
        "tpl_alim_lenta":      -(t ** 0.5),
        "tpl_alim_escalonada": -np.round(t * 4) / 4,
        # Subida (servido)
        "tpl_ramp_up":         np.linspace(0.0, +1.0, n),
        "tpl_exp_rise":        (1 - np.exp(-3 * t)),
        "tpl_sigmoide":        (2 / (1 + np.exp(-6 * (t - 0.5))) - 1),
        "tpl_serv_brusco":     serv - serv[0],
        # Ruido / plateau / complejos
        "tpl_plateau":         np.zeros(n),
        "tpl_triangular":      np.abs(2 * t - 1) - 1,
        "tpl_parabola_down":   -(4 * t * (1 - t)),
        "tpl_doble_rampa":     doble,
    }


_TPL_NAMES = [
    "tpl_ramp_down", "tpl_exp_decay", "tpl_alim_lenta", "tpl_alim_escalonada",
    "tpl_ramp_up",   "tpl_exp_rise",  "tpl_sigmoide",   "tpl_serv_brusco",
    "tpl_plateau",   "tpl_triangular","tpl_parabola_down","tpl_doble_rampa",
]
_TPL_DESC = {
    "tpl_ramp_down":       "Rampa descendente lineal — template base de alimentación",
    "tpl_exp_decay":       "Exponencial decreciente — consumo que desacelera",
    "tpl_alim_lenta":      "Raíz cuadrada descendente — alimentación muy gradual",
    "tpl_alim_escalonada": "Escalera descendente — consumo en tandas discretas",
    "tpl_ramp_up":         "Rampa ascendente lineal — template base de servido",
    "tpl_exp_rise":        "Exponencial creciente — llenado asintótico",
    "tpl_sigmoide":        "Sigmoide — transición suave S (servido gradual)",
    "tpl_serv_brusco":     "Subida rápida + plateau — servido con estabilización",
    "tpl_plateau":         "Señal plana — sin cambio (reposo o sensor estático)",
    "tpl_triangular":      "Triángulo — sube y baja simétricamente",
    "tpl_parabola_down":   "Parábola invertida — pico y regreso",
    "tpl_doble_rampa":     "Plateau + rampa — servido seguido de inicio de consumo",
}


def _f12_templates(valores: np.ndarray, resample_s: float) -> dict:
    n = len(valores)
    if n < 3:
        return {k: 0.0 for k in _TPL_NAMES}

    v_norm    = _norm_seg(valores)
    templates = _make_templates(n)
    out       = {}
    for name, tpl in templates.items():
        tpl_rel  = tpl - tpl[0]
        tpl_max  = float(np.max(np.abs(tpl_rel))) + 1e-6
        tpl_norm = tpl_rel / tpl_max
        out[name] = round(_cos_sim(v_norm, tpl_norm), 4)
    return out


for _tn in _TPL_NAMES:
    _reg(_tn, "F12_templates", "cos(v_norm, template)", (-1, 1), "adim",
         _TPL_DESC.get(_tn, f"Similitud coseno con template {_tn}"))


# ─────────────────────────────────────────────────────────────────────────────
# F13 — Dinámica temporal
# ─────────────────────────────────────────────────────────────────────────────

def _f13_dinamica(valores: np.ndarray, resample_s: float) -> dict:
    n     = len(valores)
    _zero = {k: 0.0 for k in [
        "time_to_max_s", "time_to_min_s", "time_to_25pct_s", "time_to_50pct_s",
        "time_to_75pct_s", "rise_time_s", "fall_time_s", "settling_time_s",
        "overshoot_g", "undershoot_g", "initial_slope_g_min", "final_slope_g_min",
    ]}
    if n < 3:
        return _zero

    times = np.arange(n) * resample_s
    v0    = float(valores[0])
    vf    = float(valores[-1])
    delta = vf - v0

    idx_max = int(np.argmax(valores))
    idx_min = int(np.argmin(valores))

    def _t_pct(pct: float) -> float:
        if abs(delta) < 0.1:
            return float(times[-1])
        target = v0 + pct * delta
        return float(times[int(np.argmin(np.abs(valores - target)))])

    t10, t25, t50, t75, t90 = _t_pct(0.10), _t_pct(0.25), _t_pct(0.50), _t_pct(0.75), _t_pct(0.90)

    # Settling time: último instante donde |y - yf| > 2% del cambio
    band = max(abs(delta) * 0.02, 0.5)
    settled = np.abs(valores - vf) <= band
    settling_idx = n - 1
    for i in range(n - 1, -1, -1):
        if not settled[i]:
            settling_idx = min(i + 1, n - 1)
            break

    # Overshoot / undershoot respecto al valor final
    if delta > 0:
        overshoot  = float(max(0.0, float(np.max(valores)) - vf))
        undershoot = float(max(0.0, v0 - float(np.min(valores))))
    else:
        overshoot  = float(max(0.0, float(np.max(valores)) - v0))
        undershoot = float(max(0.0, v0 - float(np.min(valores))))

    # Pendiente inicial y final (primeros/últimos 20%)
    n20 = max(2, n // 5)
    xm  = np.arange(n20) * (resample_s / 60)
    init_slope  = float(np.polyfit(xm, valores[:n20], 1)[0])   if n20 >= 2 else 0.0
    final_slope = float(np.polyfit(xm, valores[-n20:], 1)[0]) if n20 >= 2 else 0.0

    return {
        "time_to_max_s":       round(float(times[idx_max]), 1),
        "time_to_min_s":       round(float(times[idx_min]), 1),
        "time_to_25pct_s":     round(t25, 1),
        "time_to_50pct_s":     round(t50, 1),
        "time_to_75pct_s":     round(t75, 1),
        "rise_time_s":         round(abs(t90 - t10), 1),
        "fall_time_s":         round(abs(t90 - t10), 1),
        "settling_time_s":     round(float(times[settling_idx]), 1),
        "overshoot_g":         round(overshoot, 2),
        "undershoot_g":        round(undershoot, 2),
        "initial_slope_g_min": round(init_slope, 3),
        "final_slope_g_min":   round(final_slope, 3),
    }


_reg("time_to_max_s",       "F13_dinamica", "t[argmax(y)]", (0, 1e6), "s",
     "Tiempo al máximo global — muy corto en servido brusco")
_reg("time_to_50pct_s",     "F13_dinamica", "t cuando Δ=50% del total", (0, 1e6), "s",
     "Tiempo al 50% del cambio — mediana del tiempo de transición")
_reg("rise_time_s",         "F13_dinamica", "|t(90%)−t(10%)| del Δ", (0, 1e6), "s",
     "Tiempo de subida (10%→90% del Δ) — muy corto en servido brusco")
_reg("settling_time_s",     "F13_dinamica", "t hasta |y−yf|<2%Δ", (0, 1e6), "s",
     "Tiempo de establecimiento — cuándo la señal alcanza el estado estacionario")
_reg("overshoot_g",         "F13_dinamica", "max(y)−yf si Δ>0", (0, 1e6), "g",
     "Sobrepaso: cuánto supera la señal al valor final (raro en alimentación)")
_reg("initial_slope_g_min", "F13_dinamica", "polyfit(y[:20%])[0]", (-1e6, 1e6), "g/min",
     "Pendiente del primer 20% — identifica si el evento empieza bruscamente")


# ─────────────────────────────────────────────────────────────────────────────
# F14 — Features derivadas (índices compuestos)
# ─────────────────────────────────────────────────────────────────────────────

def _f14_compuestos(valores: np.ndarray, resample_s: float, prev: dict) -> dict:
    dur_min  = (len(valores) - 1) * resample_s / 60
    delta_a  = abs(float(valores[-1] - valores[0]))
    arc      = prev.get("arc_length", 1.0)
    e_d1     = prev.get("energy_d1", 0.0)
    ent_s    = prev.get("entropy_sample", 0.0)
    fd_h     = prev.get("fractal_higuchi", 1.0)
    r2       = prev.get("r2_lineal", 0.0)
    mono     = abs(prev.get("monotonicity", 0.0))

    best_tpl = max(
        (abs(v) for k, v in prev.items() if k.startswith("tpl_")),
        default=0.0,
    )

    return {
        "idx_arc_per_delta":  round(arc / max(delta_a, 1.0), 4),
        "idx_energy_per_min": round(e_d1 / max(dur_min, 0.5), 4),
        "idx_complexity":     round(ent_s * fd_h, 4),
        "idx_linearity":      round(r2 * mono, 4),
        "idx_template_max":   round(best_tpl, 4),
        "idx_shape_noise":    round(prev.get("fractal_higuchi", 1.0) *
                                    prev.get("lempel_ziv", 0.5), 4),
    }


_reg("idx_arc_per_delta",  "F14_compuestos", "arc_length/|Δpeso|", (1, 1e6), "adim",
     "Zigzag por gramo de cambio neto — alto en ruido, bajo en curvas limpias")
_reg("idx_energy_per_min", "F14_compuestos", "energy_d1/dur_min", (0, 1e6), "g²/s²/min",
     "Intensidad de cambio por minuto — muy alto en servido")
_reg("idx_complexity",     "F14_compuestos", "entropy_sample × fractal_higuchi", (0, 1e6), "adim",
     "Complejidad global: alto=señal irregular e impredecible (ruido)")
_reg("idx_linearity",      "F14_compuestos", "R² × |monotonicity|", (0, 1), "adim",
     "Linealidad direccional: alto solo si la tendencia es LINEAL Y CONSISTENTE (alimentación)")
_reg("idx_template_max",   "F14_compuestos", "max(|tpl_sim|)", (0, 1), "adim",
     "Máxima similitud con cualquier template — muy bajo en ruido puro")
_reg("idx_shape_noise",    "F14_compuestos", "fractal × lempel_ziv", (0, 1e6), "adim",
     "Índice de ruido de forma: alto=señal fractal y de alta complejidad (ruido)")


# ─────────────────────────────────────────────────────────────────────────────
# Evidence Engine
# ─────────────────────────────────────────────────────────────────────────────

# Pesos calibrados en ~304 anotaciones (separación en σ entre categorías).
# Recalibrado 2026-08-10 contra 496 anotaciones (alim=254/serv=55/ruido=187) —
# ver 09_Investigacion/Ciclo Alpha v2/fase_0_ruido/RECOPILACION_DATOS_APP.md §12:
# agregados tpl_doble_rampa (mejor discriminador del motor, 7.69σ A/S, no estaba
# usado en clasificación pese a estar calculado), d1_frac_neg (mejor discriminador
# A/R, 3.22σ) y entropy_shannon (3.69σ A/S, 2.43σ A/R). Removido tpl_plateau
# (constante 0.0 en 496/496 anotaciones — sin poder discriminativo, no aportaba
# nada al softmax).
# (w_alim, w_serv, w_ruido): contribución de cada feature a cada hipótesis
EVIDENCE_WEIGHTS: dict[str, tuple[float, float, float]] = {
    # F00 — Features primarias
    "sim_alimentacion":     (+5.0, -5.0,  0.0),
    "sim_servido":          (-5.0, +5.0,  0.0),
    "monotonicity":         (-3.0,  0.0,  0.0),
    "r2_lineal":            (+2.0, -0.5, -0.5),
    "zcr":                  (-1.0,  0.0, +1.0),
    # F01 — Geometría diferencial
    "d1_frac_neg":          (+2.0, -1.5, -1.5),
    # F12 — Templates
    "tpl_doble_rampa":      (+5.0, -4.0,  0.0),
    "tpl_ramp_down":        (+3.0, -2.0,  0.0),
    "tpl_exp_decay":        (+2.0, -1.0,  0.0),
    "tpl_ramp_up":          (-2.0, +3.0,  0.0),
    "tpl_exp_rise":         (-1.0, +2.0,  0.0),
    "tpl_sigmoide":         (-0.5, +1.5,  0.0),
    # F04 — Tortuosidad
    "tortuosity":           (-1.5, -0.5, +2.0),
    "straightness":         (+1.5,  0.0, -1.5),
    # F07 — Fractal
    "fractal_higuchi":      (-1.5, -0.5, +2.0),
    "fractal_katz":         (-1.0, -0.5, +1.5),
    # F08 — Lempel-Ziv
    "lempel_ziv":           (-1.0, -0.5, +1.5),
    # F06 — Entropías
    "entropy_permutation":  (-1.5,  0.0, +1.5),
    "entropy_sample":       (-1.0,  0.0, +1.0),
    "entropy_shannon":      (+2.0, -1.5, -1.0),
    # F09 — Frecuencia
    "power_ratio_low":      (+1.0,  0.0, -1.0),
    "autocorr_lag1":        (+1.0,  0.0, -1.0),
    "spectral_entropy":     (-1.0, -2.0, +2.5),
    # F01 — Geometría diferencial
    "d1_frac_pos":          (-1.0, +2.0, -1.0),
    # F14 — Compuestos
    "idx_linearity":        (+2.0, -0.5, -0.5),
    "idx_template_max":     (+1.0, +1.0, -2.0),
    "idx_shape_noise":      (-1.5, -0.5, +2.0),
}


# ─────────────────────────────────────────────────────────────────────────────
# Normalización + pesos calculados desde los datos (2026-08-10)
# ─────────────────────────────────────────────────────────────────────────────
# El EVIDENCE_WEIGHTS de arriba, aplicado sobre valores CRUDOS (sin normalizar),
# acertaba 49.6% sobre las 496 anotaciones reales — peor que predecir siempre
# "alimentacion" (51.2%, la clase mayoritaria). Causa: los 26 features pesados
# viven en escalas muy distintas (la mayoría en [-1,1], pero entropy_sample llega
# a 22.7) — con pesos ±1 a ±5 elegidos a mano asumiendo escala uniforme, el
# feature de mayor magnitud cruda domina la suma sin importar su peso asignado.
# Normalizando (z-score pooled) y calculando los pesos directamente desde
# comp_stats_v2.json (discriminante tipo Fisher, sobre las 102 features, no solo
# las 26 elegidas a mano) la accuracy sube a 77.8% en un 20% de datos nunca
# usados para calcular los pesos. Ver RECOPILACION_DATOS_APP.md §12.
#
# EVIDENCE_WEIGHTS queda como fallback legado si no hay comp_stats disponible
# (cold start sin `comp_stats_v2.json` aún generado).

def _pooled_mean_std(comp_stats: dict, fname: str) -> tuple[float, float]:
    """Media y desviación estándar pooled (las 3 categorías juntas) de un feature."""
    total_n = 0
    weighted_mean = 0.0
    per_cat = comp_stats.get(fname, {})
    for cat in ("alimentacion", "servido", "ruido"):
        st = per_cat.get(cat) or {}
        n = st.get("n") or 0
        if n:
            weighted_mean += st["mean"] * n
            total_n += n
    if total_n == 0:
        return 0.0, 1.0
    pooled_mean = weighted_mean / total_n
    pooled_var = 0.0
    for cat in ("alimentacion", "servido", "ruido"):
        st = per_cat.get(cat) or {}
        n = st.get("n") or 0
        if n:
            pooled_var += n * (st["std"] ** 2 + (st["mean"] - pooled_mean) ** 2)
    pooled_var /= total_n
    pooled_std = pooled_var ** 0.5
    return pooled_mean, pooled_std if pooled_std > 1e-9 else 1.0


def compute_data_driven_weights(comp_stats: dict) -> dict[str, tuple[float, float, float]]:
    """
    Calcula pesos del Evidence Engine directamente desde comp_stats_v2.json.

    Discriminante tipo Fisher sobre valores normalizados:
        w_cat(f) = mean_cat_normalizada(f) - mean_resto_normalizada(f)

    Cubre las 102 features de comp_stats_v2.json (no solo las 26 de
    EVIDENCE_WEIGHTS). Se recalcula en cada llamada — es barato (dict lookups
    sobre ~100 features) y así queda al día automáticamente cuando se
    regenera comp_stats_v2.json con más anotaciones, sin tocar código.
    """
    cats = ("alimentacion", "servido", "ruido")
    weights: dict[str, tuple[float, float, float]] = {}
    for fname, per_cat in comp_stats.items():
        pooled_mean, pooled_std = _pooled_mean_std(comp_stats, fname)
        row = []
        for cat in cats:
            st = per_cat.get(cat) or {}
            n_cat = st.get("n") or 0
            if not n_cat:
                row.append(0.0)
                continue
            mean_cat_n = (st["mean"] - pooled_mean) / pooled_std
            rest_n = 0
            rest_weighted_mean = 0.0
            for other in cats:
                if other == cat:
                    continue
                ost = per_cat.get(other) or {}
                on = ost.get("n") or 0
                if on:
                    rest_weighted_mean += ost["mean"] * on
                    rest_n += on
            mean_rest = rest_weighted_mean / rest_n if rest_n else pooled_mean
            mean_rest_n = (mean_rest - pooled_mean) / pooled_std
            row.append(round(mean_cat_n - mean_rest_n, 4))
        weights[fname] = tuple(row)  # type: ignore[assignment]
    return weights


def _normalize_feats(feats: dict, comp_stats: dict) -> dict:
    """z-score pooled de cada feature, usando comp_stats_v2.json como referencia."""
    normed = {}
    for fname, val in feats.items():
        try:
            val_f = float(val)
        except (TypeError, ValueError):
            continue
        pooled_mean, pooled_std = _pooled_mean_std(comp_stats, fname)
        normed[fname] = (val_f - pooled_mean) / pooled_std
    return normed


def evidence_score(feats: dict, comp_stats: dict | None = None) -> dict:
    """
    Calcula el score de evidencia para cada hipótesis.

    Si se pasa `comp_stats` (comp_stats_v2.json cargado), normaliza cada
    feature y usa pesos calculados desde los datos (`compute_data_driven_weights`)
    — 77.8% accuracy validada fuera de muestra, ver comentario arriba. Sin
    `comp_stats`, cae al fallback legado `EVIDENCE_WEIGHTS` sobre valores
    crudos (49.6% accuracy — solo para cuando no hay comp_stats_v2.json aún).

    Retorna:
        dict con keys: 'score_alimentacion', 'score_servido', 'score_ruido',
        'prediccion', 'confianza', 'razon'.
    """
    if comp_stats:
        weights    = compute_data_driven_weights(comp_stats)
        feats_used = _normalize_feats(feats, comp_stats)
    else:
        weights    = EVIDENCE_WEIGHTS
        feats_used = feats

    raw = {"alimentacion": 0.0, "servido": 0.0, "ruido": 0.5}  # prior leve a ruido

    for fname, (w_a, w_s, w_r) in weights.items():
        val = float(feats_used.get(fname, 0.0))
        raw["alimentacion"] += w_a * val
        raw["servido"]      += w_s * val
        raw["ruido"]        += w_r * val

    vals = np.array([raw["alimentacion"], raw["servido"], raw["ruido"]])
    vals -= vals.max()
    exp_v = np.exp(vals)
    probs = exp_v / exp_v.sum()

    cats   = ["alimentacion", "servido", "ruido"]
    best_i = int(np.argmax(probs))
    pred   = cats[best_i]
    conf   = round(float(probs[best_i]), 3)

    # Razón textual (top 3 features más influyentes para la predicción)
    influencia = {
        fname: abs(ws[best_i] * float(feats_used.get(fname, 0.0)))
        for fname, ws in weights.items()
    }
    top3 = sorted(influencia, key=influencia.get, reverse=True)[:3]  # type: ignore
    razon = f"Features clave: {', '.join(top3)}"

    return {
        "score_alimentacion": round(float(probs[0]), 3),
        "score_servido":      round(float(probs[1]), 3),
        "score_ruido":        round(float(probs[2]), 3),
        "prediccion":         pred,
        "confianza":          conf,
        "razon":              razon,
    }


def clasificar(feats: dict, umbrales: dict | None = None) -> str:
    """
    Clasificador determinístico v1.2 (compatible con umbrales.json).
    Reglas: servido → alimentación → ruido.
    """
    u          = umbrales or {}
    sim_alim   = float(feats.get("sim_alimentacion", 0.0))
    sim_serv   = float(feats.get("sim_servido", 0.0))
    mono       = float(feats.get("monotonicity", 0.0))
    delta_w    = float(feats.get("delta_w_g", feats.get("delta_w_total", 0.0)))
    duracion   = float(feats.get("duracion_min", 10.0))

    ssm  = float(u.get("sim_servido_min",       0.70))
    sam  = float(u.get("sim_alimentacion_min",  0.70))
    mm   = float(u.get("monotonicity_max",      -0.03))
    dws  = float(u.get("delta_w_min_g",         20.0))
    dwa  = float(u.get("delta_w_max_g",         -3.0))
    dsm  = float(u.get("duracion_min_max_serv", 15.0))
    dam1 = float(u.get("duracion_min_min_alim",  1.0))
    dam2 = float(u.get("duracion_min_max_alim", 20.0))

    if sim_serv > ssm and delta_w > dws and duracion < dsm:
        return "servido"
    if sim_alim > sam and mono < mm and delta_w < dwa and dam1 <= duracion <= dam2:
        return "alimentacion"
    return "ruido"


# ─────────────────────────────────────────────────────────────────────────────
# API pública
# ─────────────────────────────────────────────────────────────────────────────

def extraer_features(valores_raw: "list | np.ndarray", resample_s: float = 30.0) -> dict:
    """
    Extrae el vector completo de ~105 features para un segmento de peso.

    Args:
        valores_raw: lista o array de lecturas de peso (g), sin NaN
        resample_s:  segundos entre lecturas (default 30s — cadencia KPCL)

    Returns:
        dict ordenado con todas las features etiquetadas por familia
    """
    valores = np.asarray(valores_raw, dtype=float)
    if len(valores) < 2:
        return {}

    out: dict = {}
    out.update(_f00_clasicas(valores, resample_s))
    out.update(_f01_derivadas(valores, resample_s))
    out.update(_f02_curvatura(valores, resample_s))
    out.update(_f03_arco(valores, resample_s))
    out.update(_f04_tortuosidad(valores, resample_s))
    out.update(_f05_energia(valores, resample_s))
    out.update(_f06_entropias(valores, resample_s))
    out.update(_f07_fractal(valores, resample_s))
    out.update(_f08_lempel_ziv(valores, resample_s))
    out.update(_f09_frecuencial(valores, resample_s))
    out.update(_f10_robusta(valores, resample_s))
    out.update(_f11_topologia(valores, resample_s))
    out.update(_f12_templates(valores, resample_s))
    out.update(_f13_dinamica(valores, resample_s))
    out.update(_f14_compuestos(valores, resample_s, out))

    return out


def resumen_features(feats: dict) -> str:
    """Genera un resumen textual compacto de las features más discriminativas."""
    sa  = feats.get("sim_alimentacion", 0)
    ss  = feats.get("sim_servido", 0)
    mo  = feats.get("monotonicity", 0)
    r2  = feats.get("r2_lineal", 0)
    fd  = feats.get("fractal_higuchi", 1.5)
    lz  = feats.get("lempel_ziv", 0.5)
    pe  = feats.get("entropy_permutation", 0.5)
    acf = feats.get("autocorr_lag1", 0)
    tor = feats.get("tortuosity", 1)
    il  = feats.get("idx_linearity", 0)

    best_tpl = max(
        ((k, v) for k, v in feats.items() if k.startswith("tpl_")),
        key=lambda x: abs(x[1]),
        default=("—", 0),
    )

    lines = [
        "--- Discriminadores primarios ---",
        f"  sim_alim={sa:+.3f}  sim_serv={ss:+.3f}  monotonicity={mo:+.3f}  R2={r2:.3f}",
        "--- Complejidad y forma ---",
        f"  FD_Higuchi={fd:.3f}  Lempel-Ziv={lz:.3f}  PermEntropy={pe:.3f}",
        f"  tortuosidad={tor:.3f}  autocorr_lag1={acf:.3f}  idx_linearity={il:.4f}",
        "--- Mejor template ---",
        f"  {best_tpl[0]}  ->  {best_tpl[1]:+.3f}",
    ]
    return "\n".join(lines)
