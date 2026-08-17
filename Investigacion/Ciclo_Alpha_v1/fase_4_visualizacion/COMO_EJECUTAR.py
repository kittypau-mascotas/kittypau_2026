# Fase 4 — Visualización de Investigación · KPCL0034

## Posición en el pipeline

```
Fase 1 (extracción) → Fase 2 (dataset) → Fase 3 (modelos) → Fase 4 (visualización) ← aquí
      ↓ readings_raw.parquet          ↓ dataset_meta.json       ↓ feature_importance.csv
      ↓ sessions_labeled.parquet      ↓ label_encoder.json       ↓ training_history.json
      ↓ events_labeled.parquet
```

## Requisitos

- Node.js 18+ (`node -v`)
- Python 3.9+ con `pandas`, `pyarrow`, `numpy` instalados
- Los artefactos de Fase 1 deben existir en `../fase_1_extraccion/data/raw/`
- Los artefactos de Fase 3 deben existir en `../fase_3_modelos/models/`

## Flujo completo (primera vez)

### Paso 1 — Preparar los datos desde las fases anteriores

```powershell
cd "Data Science/fase_4_visualizacion"
python prepare_data.py
```

Esto lee los parquets de Fase 1 y los modelos de Fase 3, y genera en `public/data/`:

| Archivo generado            | Fuente                                          |
|-----------------------------|--------------------------------------------------|
| `readings_chart.json`       | `fase_1_extraccion/data/raw/readings_raw.parquet` |
| `sessions.json`             | `fase_1_extraccion/data/raw/sessions_labeled.parquet` |
| `events.json`               | `fase_1_extraccion/data/raw/events_labeled.parquet` |
| `kpis.json`                 | Calculado desde sessions.json                   |
| `daily.json`                | Calculado desde sessions.json                   |
| `histogram.json`            | Calculado desde sessions.json                   |
| `feature_importance.json`   | `fase_3_modelos/models/modelo_a(b)/feature_importance.csv` |
| `dataset_meta.json`         | `fase_2_dataset/data/train/dataset_meta.json`   |

### Paso 2 — Instalar dependencias y arrancar

```powershell
npm install
npm run dev
```

El navegador se abre en `http://localhost:5174`.

---

## Flujo con nueva ingesta de datos

Cada vez que se re-ejecutan Fases 1, 2 o 3 con nuevos datos:

```powershell
python prepare_data.py   # re-genera los JSON
# El servidor dev ya recarga automáticamente
```

---

## Qué muestra el dashboard

| Panel | Datos de entrada |
|---|---|
| **KPIs** | `kpis.json` |
| **Gráfico principal** (peso + sesiones) | `readings_chart.json` + `sessions.json` + `events.json` |
| **Consumo diario** | `daily.json` |
| **Distribución de duración** | `histogram.json` |
| **Evolución experimentos ML** | Datos hardcoded de los 5 experimentos documentados |
| **Importancia de features** | `feature_importance.json` (Fase 3) |
| **Estado vs. Fase 4** | `dataset_meta.json` (Fase 2) |
| **Tabla de sesiones** | `sessions.json` |

## Leyenda de colores

| Color | Tipo de sesión |
|---|---|
| 🟢 Verde | Alimentación |
| 🟠 Naranja | Servido |
| 🔵 Azul | Hidratación |
| 🔴 Rojo | Curva de peso bruto |
