
"""
g10_quality_report.py — Fase 1 Gamma
Checkpoint obligatorio antes de Fase 2: valida >= MIN_SERVIDO_SESSIONS y
>= MIN_ALIM_SESSIONS, y genera distribucion_clases_gamma.txt.
"""
import sys
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import (
    DIR_04_ANOTACION, DIR_05_REPORTE, DISTRIBUCION_CLASES_TXT,
    MIN_SERVIDO_SESSIONS, MIN_ALIM_SESSIONS,
    cargar_sessions_con_augmentation,
)


def main():
    print("=== g10_quality_report.py — Ciclo Gamma · Fase 1 (checkpoint final) ===\n")

    sessions_path = DIR_04_ANOTACION / "sessions_labeled.parquet"
    if not sessions_path.exists():
        raise FileNotFoundError("sessions_labeled.parquet no existe — ejecutar g09 primero")

    # Conteos reales (sin augmentación) — para el reporte de distribución
    sesiones_real = pd.read_parquet(sessions_path)
    dist = sesiones_real["session_type"].value_counts()
    n_alim  = int(dist.get("alimentacion", 0))
    n_serv  = int(dist.get("servido", 0))
    n_hid   = int(dist.get("hidratacion", 0))
    n_reposo = int(dist.get("reposo", 0))

    lineas = [
        "Distribución de clases — Ciclo Gamma (Pre-G, post-retiquetado)",
        "=" * 60,
        f"alimentacion: {n_alim}",
        f"servido:      {n_serv}",
        f"hidratacion:  {n_hid}",
        f"reposo:       {n_reposo}",
        "",
        "Por período:",
        sesiones_real.groupby("periodo")["session_type"].value_counts().to_string(),
        "",
        "Duración media por tipo (s):",
        sesiones_real.groupby("session_type")["duracion_s"].mean().to_string(),
    ]

    DIR_05_REPORTE.mkdir(parents=True, exist_ok=True)
    DISTRIBUCION_CLASES_TXT.write_text("\n".join(lineas), encoding="utf-8")
    print("\n".join(lineas))
    print(f"\n✅ distribucion_clases_gamma.txt → {DISTRIBUCION_CLASES_TXT}")

    # Checkpoint evaluado sobre el dataset con augmentación
    sesiones_aug = cargar_sessions_con_augmentation()
    dist_aug = sesiones_aug["session_type"].value_counts()
    n_serv_aug = int(dist_aug.get("servido", 0))
    n_alim_aug = int(dist_aug.get("alimentacion", 0))
    n_sintetico = int(sesiones_aug.get("is_augmented", pd.Series(False)).sum())

    print("\n── Checkpoint ──────────────────────────────────────────")
    if n_sintetico > 0:
        print(f"⚠️  Augmentación activa: +{n_sintetico} servido sintético(s) para llegar a {MIN_SERVIDO_SESSIONS}")
    print(f"Servido:      {n_serv} reales + {n_sintetico} sint. = {n_serv_aug} / {MIN_SERVIDO_SESSIONS}")
    print(f"Alimentacion: {n_alim_aug} / {MIN_ALIM_SESSIONS}")

    errores = []
    if n_serv_aug < MIN_SERVIDO_SESSIONS:
        errores.append(f"Servido insuficiente incluso con augmentación: {n_serv_aug}/{MIN_SERVIDO_SESSIONS}")
    if n_alim_aug < MIN_ALIM_SESSIONS:
        errores.append(f"Alimentación insuficiente: {n_alim_aug}/{MIN_ALIM_SESSIONS}")

    if errores:
        for e in errores:
            print(f"❌ {e}")
        print("\n   Acción: volver a app_anotacion.py y revisar más candidatos.")
        print("   Si los candidatos generados en g07 ya se agotaron, considerar bajar")
        print("   THRESHOLD_CANDIDATOS_GAMMA en _gamma_utils.py y re-ejecutar desde g06.")
        raise AssertionError("Checkpoint de Fase 1 no superado — ver detalle arriba")

    print("\n✅ Checkpoint superado. Fase 1 completa.")
    if n_sintetico > 0:
        print(f"   Nota: {n_sintetico} sesiones sintéticas en uso. Al llegar a {MIN_SERVIDO_SESSIONS} reales se desactivará la augmentación.")
    print("   Próximo: Fase 2 — construcción del dataset de entrenamiento de Gamma")
    print("   (pendiente: decidir 12 vs 13 features para entrenamiento, ver instructivo.md §7)")


if __name__ == "__main__":
    main()
