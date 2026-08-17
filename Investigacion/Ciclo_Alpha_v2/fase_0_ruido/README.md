---
fase: 0
nombre: App de Anotación Alpha v2 + Motor Matemático v2
estado: activo
ciclo: Alpha v2
actualizado: 2026-06-28
---

# Fase 0 — App de Anotación y Motor Matemático v2

> **Objetivo original:** Caracterizar estadísticamente qué es "nada" —
> la distribución del sensor KPCL0034 en reposo.
>
> **Estado actual (2026-06-28):** La fase evolucionó en una app completa de
> anotación + análisis. El modelo de ruido quedó implícito en las 421
> anotaciones (categoría "ruido" = 167 eventos) y en las 102 features del
> Motor Matemático v2. Separación ruido vs alimentación: 1.63σ en
> `tpl_doble_rampa`.

---

## Lanzar la app

```powershell
cd "d:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Investigacion\Ciclo_Alpha_v2\fase_0_ruido"
streamlit run app_anotacion_av2.py
```

### Navegación (lazy loading — solo el tab activo ejecuta su código)

| Tab | Nombre | Función |
|-----|--------|---------|
| 0 | 🌐 Vista Global | Serie temporal completa con bandas de anotaciones |
| 1 | 🔍 Revisar Candidatos | Anotar candidatos (cola, slider, formulario) |
| 2 | 📏 Analizar Curva | Estadísticas y distribuciones por categoría |
| 3 | 🔄 Comparar Curvas | Spaghetti overlay de curvas del mismo tipo |
| 4 | 📊 Panel de Features | Reglas emergentes y outliers por candidato |
| 5 | 🧮 Motor Matemático | 102 features v2 + Evidence Engine + Feature Atlas |
| 6 | 📋 Anotaciones | Lista completa guardada localmente |
| 7 | 🕐 Próxima Comida | Predictor estadístico (intervalos + modelo circadiano) |
| 8 | 🐱 Kittypau | Dashboard de bienestar Bandida (10 indicadores Sims) |

Cada tab muestra barra de progreso real 0→100% al cargar.

---

## Input

| Archivo | Ruta | Regla |
|---------|------|-------|
| `readings.csv` | `11_Data/2026/` | **NUNCA modificar.** 8,024 lecturas Abr 2026 |
| `readings_rows.csv` | `11_Data/2026/` | Append-only. 94,588 lecturas May–Jun 2026 |

## Artefactos generados

| Artefacto | Ruta | Estado al 2026-06-28 |
|-----------|------|----------------------|
| `candidatos_av2.csv` | `data/` | 421 candidatos · Abr 8 → Jun 27 |
| `anotaciones_av2.csv` | `data/` | 421 anot. (alim=209 / serv=45 / ruido=167) |
| `features_anotaciones_v2.csv` | `data/` | 417 filas × 109 cols |
| `comp_stats_v2.json` | `data/` | 102 features · µ/σ/n por categoría |
| `ciclos_servido_alimento.csv` | `data/` | 28 ciclos manuales de servido/alimento (Tab 7/8) |
| `_cache_lecturas_30s.parquet` | `data/` | Caché regenerable — se puede borrar |
| `umbrales.json` | `config/` | Umbrales detector (editables en Tab 4) |
| `data/backups/` | `data/backups/` | Backups diarios de anotaciones y ciclos (auto) |

---

## Motor Matemático v2

**Archivo:** `shape_features_v2.py`  
**Features:** 102 en 15 familias (F00–F14) — solo numpy + scipy  
**Importar:** `from shape_features_v2 import extraer_features, evidence_score`

**Mejor feature discriminativo:** `tpl_doble_rampa` (7.69σ sep. Alimentación vs Servido, medido sobre 496 anotaciones)  
**Optimización aplicada (2026-06-28):** `_f08_lempel_ziv` O(n²) → O(n log n) con set-based LZ78  
**Fix aplicado (2026-08-10):** `evidence_score()` normaliza features (z-score) y calcula pesos desde los
datos en vez de usarlos crudos con pesos a mano — accuracy 49.6% → 78.8% (held-out). Ver
[RECOPILACION_DATOS_APP.md §12bis](Documentacion/RECOPILACION_DATOS_APP.md#12bis-actualización-2026-08-10--el-problema-real-no-eran-los-pesos-era-la-escala).

---

## Scripts de pipeline

| Script | Acción |
|--------|--------|
| `01_genera_candidatos.py` | Detecta eventos → `candidatos_av2.csv` |
| `revisar_anotaciones_v2.py` | Extrae 102 features por anotación → CSV + JSON stats |

**Botón "🔄 Actualizar Todo"** en la app: sync Supabase → ejecuta ambos scripts → invalida cachés → recarga.

---

## Estructura del directorio

```
fase_0_ruido/
├── app_anotacion_av2.py          ← App principal (streamlit run)
├── 01_genera_candidatos.py       ← Script 1: detecta eventos
├── revisar_anotaciones_v2.py     ← Script 2: extrae features y stats
├── shape_features_v2.py          ← Motor Matemático v2 (102 features)
├── supabase_client.py            ← Sync incremental desde Supabase
├── requirements_check.py         ← Verifica dependencias antes de arrancar
├── Documentacion/                 ← ARQUITECTURA_APP, ACTUALIZACION_DATA, HISTORIAL_RESULTADOS, RECOPILACION_DATOS_APP
├── config/
│   └── umbrales.json             ← Umbrales detector (editables en Tab 4)
├── data/
│   ├── anotaciones_av2.csv       ← CRÍTICO: etiquetas del operador
│   ├── candidatos_av2.csv        ← Generado por Script 1
│   ├── features_anotaciones_v2.csv ← Generado por Script 2
│   ├── comp_stats_v2.json        ← Generado por Script 2
│   ├── ciclos_servido_alimento.csv ← Ciclos manuales (Tab 7/8)
│   ├── _cache_lecturas_30s.parquet ← Caché regenerable
│   └── backups/                  ← Backups diarios automáticos (auto-generado)
├── Resultados/benchmark_data_abril_mayo_junio/  ← Análisis benchmark (referencia)
├── tests/                        ← Tests unitarios
└── 0A_exploracion/               ← Scripts de exploración inicial (no en pipeline activo)
    0B_deteccion_inactividad/
    0C_modelo_ruido/
```

> Los directorios `0A_`, `0B_` y `0C_` son la exploración inicial que derivó en el pipeline
> actual. Sus scripts no se ejecutan en producción pero se conservan como referencia metodológica.

---

## Ver también

- [HISTORIAL_RESULTADOS.md](Documentacion/HISTORIAL_RESULTADOS.md) — snapshots históricos por ingesta de datos
- [ACTUALIZACION_DATA.md](Documentacion/ACTUALIZACION_DATA.md) — pipeline completo y rutas críticas
- [ARQUITECTURA_APP.md](Documentacion/ARQUITECTURA_APP.md) — arquitectura de caché y responsabilidades por función
