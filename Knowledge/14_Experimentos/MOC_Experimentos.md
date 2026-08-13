---
id: moc_experimentos
title: MOC — Experimentos
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-13
tags:
  - moc
  - experimentos
  - alpha
related:
  - [[00_HOME]]
  - [[15_Resultados/MOC_Resultados]]
  - [[29_Specs/SPEC_07_Investigacion_Hidratacion]]
---

# MOC — Experimentos

---

## Experimentos activos

| Documento | Estado | Descripción |
|-----------|--------|-------------|
| [[EXP_AlphaV2_Pipeline]] | Activo | Pipeline completo anotación + Motor v2 (comida, KPCL0034; 916 candidatos en vivo al 2026-08-13, 102 features) |
| [[EXP_AlphaV2_AppArq]] | Activo | Arquitectura de app_anotacion_av2.py — caché 3 capas, lazy tabs, flujo offline. Parametrizada por `DEVICE_PROFILES` desde 2026-08-13 (ver [[29_Specs/SPEC_07_Investigacion_Hidratacion]] §5.1) — perfil KPCL0034 activo, KPCL0036 registrado pero inerte. Auditada 2026-08-13: certeza matemática (números hardcodeados → en vivo), redundancia, y 1 bug de crash preexistente corregido (Kittypau + df_lec=None) |
| [[29_Specs/SPEC_07_Investigacion_Hidratacion]] | 🚧 En curso — paso 3/10 del roadmap hecho | Réplica de la línea de investigación de comida para hidratación (KPCL0036, bebedero). Paso 3 hecho y verificado 2026-08-13: perfil `KPCL0036` agregado a `DEVICE_PROFILES`; `01_genera_candidatos.py`/`revisar_anotaciones_v2.py` ya generan datos reales de agua (`candidatos_agua.csv`, 393 candidatos); `app_anotacion_av2.py` lo tiene registrado pero **inerte** (no seleccionable en UI — bloqueado por indirección de nombres de categoría, SPEC_07 §5.1). Falta: resolver esa indirección, anotar a mano, calibrar `umbrales_agua.json` |

## Experimentos archivados / legacy

| Experimento | Estado | Descripción |
|-------------|--------|-------------|
| Alpha v1 | Archivado | Motor v1, 5 features básicas |
| fase_0_ruido v1 | Archivado | Exploración inicial distribución de ruido |

---

## Relaciones

- Depende de: [[10_Datasets/README_Datasets]]
- Genera: [[15_Resultados/MOC_Resultados]]
- Usa: [[13_Features/README_ShapeFeatures]]

---

## Estado de documentación

- [x] EXP_AlphaV2_Pipeline con frontmatter
- [x] EXP_AlphaV2_AppArq con frontmatter
- [x] SPEC_07 (hidratación) con frontmatter y decisiones confirmadas registradas
- [ ] Experimentos Alpha v1 documentados
- [ ] Benchmark data documentado (`benchmark_data_abril_mayo_junio/`)
- [ ] EXP propio para hidratación una vez exista el perfil agua (paso 3+ de SPEC_07)
