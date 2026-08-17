---
tags: [kittypau, ciclo-alpha-v2, app, streamlit, anotacion]
fecha_creacion: 2026-06-26
fecha_actualizacion: 2026-06-26
estado: activo
---

# App de Anotación — `app_anotacion_av2.py`

> Ver [[av2_00_INDICE_Y_VISION_GENERAL]] para el índice completo. Ver [[av2_05_ANOTACION_Y_CATEGORIAS]] para el workflow de anotación.

**Archivo:** `fase_0_ruido/app_anotacion_av2.py`
**Framework:** Streamlit (dark theme personalizado)
**Cómo ejecutar:**
```bash
cd "Investigacion/Ciclo_Alpha_v2/fase_0_ruido"
python -m streamlit run app_anotacion_av2.py
```

---

## Descripción general

La app es la interfaz principal del Ciclo Alpha v2. Permite al operador:
1. Revisar cada candidato detectado por [[av2_03_DETECCION_SEGMENTOS|`01_genera_candidatos.py`]]
2. Visualizar la curva de peso con contexto
3. Ver métricas y [[av2_04_MOTOR_MATEMATICO|shape features]] calculadas automáticamente
4. Asignar una categoría (alimentacion / servido / ruido)
5. Analizar la distribución estadística del dataset anotado
6. Ajustar y entender los umbrales de detección

---

## Estructura — 7 pestañas

### Tab 1 — 📋 Anotar

La pestaña principal de trabajo. Por cada candidato muestra:

**Controles de navegación:**
- Botones `← Ant` y `Sig →` para moverse entre candidatos
- Selector de `id_candidato` para ir a uno específico
- Filtros: por `direction` (bajada/subida/mixto) y por fecha

**Información del candidato:**
- Fecha y hora en horario Santiago
- Duración, Δpeso, rango
- Si ya fue anotado: muestra la categoría previa con badge de color

**Gráfico interactivo (Plotly):**
- Curva de peso del candidato en azul sobre fondo oscuro
- Banda naranja = región del candidato (ventana de análisis)
- Banda verde = extensión de contexto (±5 min alrededor)
- Líneas verticales en `t_inicio` y `t_fin`
- Hover con timestamp y peso exacto

**Panel de métricas — fila 1 (métricas clásicas):**
```
[ Duración ] [ Δpeso ] [ Rango ] [ Pendiente ] [ N lecturas ]
```

**Panel de métricas — fila 2 (shape features):**
```
[ Monotonía ] [ R² lineal ] [ ZCR deriv. ]
```
Cada métrica incluye `help` explicando su significado y rango.

**Panel de anotación:**
- Radio buttons: `🍽️ Alimentación` | `🫙 Servido` | `📶 Ruido`
- Campo de notas opcionales
- Botones: `✅ Guardar` y `⏭️ Saltar`

---

### Tab 2 — 📊 Explorar

Análisis visual del dataset de candidatos completo:

**Distribución de candidatos:**
- Histograma de `duracion_min` por categoría (si están anotados)
- Histograma de `delta_w_total`
- Histograma de `rango_g`

**Tabla de candidatos anotados:**
- Dataframe filtrable por categoría
- Columnas: id, fecha, hora, duración, Δpeso, dirección, categoría

**Progreso de anotación:**
- Barra de progreso: X de 916 candidatos anotados

---

### Tab 3 — 🔍 Comparar

Permite comparar curvas de la misma categoría para validar consistencia:

**Controles:**
- Selector de categoría (alimentacion / servido / ruido)
- Selector de anotaciones a comparar (multiselect por ID)

**Visualización:**
- Overlay de curvas seleccionadas en el mismo gráfico
- Curvas normalizadas (t=0 en el inicio) para comparar forma
- Estadísticas de la selección: media, std de Δpeso y duración

---

### Tab 4 — ⚙️ Ajustar Umbrales

Pestaña técnica con tres secciones:

**Sección A — Parámetros de detección:**
- Sliders para ajustar `umbral_std_g`, `umbral_delta_g`, `min_rango_g`, `min_duracion_s`, `gap_merge_s`
- Botón `💾 Guardar umbrales de detección` → guarda en `umbrales.json`

**Sección B — Reglas emergentes:**
- Tabla de estadísticas reales (media, std, min, max) por categoría y feature
- Scatter: `monotonicity` vs `r2_lineal` coloreado por categoría
- Actualización automática cuando hay nuevas anotaciones

**Sección C — Guía visual de shape features:**
Expander `📖 Guía visual — ¿qué mide cada feature de forma?` con:

1. **3 curvas template** — alimentación (bajada lineal), servido (subida asintótica), ruido (sinusoidal)
2. **Box plots de monotonicity, r2_lineal, zcr** por categoría — distribución real de 814 anotaciones (actualizado 2026-08-16)
3. **Mapa 2D sim_alimentacion vs sim_servido** — scatter coloreado por categoría con líneas de umbral en ±0.70
4. **Scatter monotonicity vs r2_lineal** (en expander anidado)

**Sección D — Glosario:**
Expander `📚 Glosario — conceptos y métricas utilizados` con:
- Tabla resumen de 4 shape features (rango, descripción)
- Descripción detallada de cada feature con fórmula y valores reales
- Descripción del pipeline de detección
- Links a Wikipedia, numpy docs, scipy, Plotly
- Tabla de categorías con criterios y estadísticas actualizadas

---

### Tab 5 — 🧮 Motor Matemático

Análisis completo del candidato seleccionado con el Motor Matemático v2 (`shape_features_v2.py`):

**Predicción Evidence Engine:**
- Scores de probabilidad para alimentacion / servido / ruido (barras coloreadas)
- Clasificador determinístico v1.2 con predicción y confianza
- Resumen textual de features discriminativas clave (`resumen_features()`)

**Vector de features completo:**
- 15 secciones expansibles (una por familia F00–F14)
- Cada sección muestra un dataframe con nombre / valor / rango / significado

**Cuadro comparativo:**
- 25 features con µ±σ por categoría, calibrado sobre **814 anotaciones reales** (actualizado 2026-08-16)
- Columna "Valor candidato" para comparar el evento actual contra las distribuciones
- Separación A/S y A/R en unidades σ
- Datos de `comp_stats_v2.json` (generado por `revisar_anotaciones_v2.py`)

**Cálculo en vivo (expander):**
- Extrae features v2 para todas las anotaciones actuales en tiempo real
- Genera tabla comparativa dinámica y exportable a CSV

**Visualizaciones:**
- Radar chart: 10 features clave vs referencias por categoría
- Bar chart horizontal: similitudes con los 12 templates canónicos (F12)
- Bar chart: complejidad (entropías F06 + fractal F07 + Lempel-Ziv F08 + índices F14)
- Tabla de dinámica temporal (rise time, settling time, time-to-50%, overshoot)
- Feature Registry completo: tabla descargable con definición, rango y fórmula de cada feature

---

### Tab 6 — 📝 Anotaciones

Lista completa de anotaciones realizadas:
- Filtro por categoría (multiselect)
- Tabla con: ID, Hora Santiago, Duración, Categoría, Notas
- Expander `Borrar anotación` (por ID)

---

### Tab 7 — 📤 Exportar

Resumen del estado y herramientas de exportación:

**Métricas de progreso:**
- Conteo por categoría
- Barras de progreso hacia las metas (alimentacion 40, ruido 30, servido 20)

**Descarga de archivos:**
- `📥 anotaciones_av2.csv` — todas las anotaciones
- `📥 candidatos_av2.csv (con estado)` — candidatos con columna `estado` ("anotado"/"pendiente")

**Flujo recomendado:**
```bash
# Las anotaciones (data/anotaciones_av2.csv) son el input para Fase 1
# Las reglas de detección están en config/umbrales.json
# Continuar con:
#   fase_1_extraccion/  → extraer y etiquetar segmentos finales
#   fase_5_modelo/      → PELT / BOCPD sobre segmentos
```

---

## Componentes técnicos clave

### Dark theme personalizado

```python
_DARK = {
    "plot_bgcolor":  "#111827",   # fondo del gráfico
    "paper_bgcolor": "#1f2937",   # fondo del contenedor
    "grid_color":    "#374151",   # líneas de grilla
    "line_color":    "#4b5563",   # ejes
    "tick_color":    "#9ca3af",   # etiquetas de ejes
    "label_color":   "#d1d5db",   # títulos de ejes
}
```

### Función de timestamp para Plotly

Pandas 2.x usa `Timestamp` objects que Plotly no acepta directamente en `add_vline`. Se usa un helper:

```python
def _ts_ms(ts) -> float:
    """Convierte Timestamp a milisegundos Unix para add_vline de Plotly."""
    return float(ts.value) / 1e6
```

### Carga con caché

```python
@st.cache_data
def load_lecturas() -> pd.DataFrame | None:
    """Carga lecturas crudas. Cacheado para no releer en cada rerun."""
    ...
```

### Shape features en la app

Para candidatos sin shape features en el CSV (generados con versiones antiguas), la app recalcula en tiempo real:

```python
def _shape_features_app(valores: np.ndarray) -> dict:
    # Función espejo de la del generador
    # Permite retrocompatibilidad con CSVs sin estas columnas
    ...
```

### Categorías y colores

```python
CATEGORIAS = {
    "alimentacion": ("🍽️ Alimentación", "#00b45a", "Bandida come — peso baja gradual, 2–10 min"),
    "servido":      ("🫙 Servido",       "#1e64ff", "Agregan comida — peso sube rápido, 20–90 s"),
    "ruido":        ("📶 Ruido",         "#f59e0b", "Movimiento/error del sensor — sin tendencia"),
}
```

---

## Correcciones y mejoras aplicadas

| Fecha | Problema | Solución |
|---|---|---|
| 2026-06 | `UnicodeEncodeError` en Windows cp1252 | `sys.stdout.reconfigure(encoding="utf-8")` al inicio |
| 2026-06 | `#rrggbbaa` no soportado por Plotly | Convertir a `rgba(r,g,b,a)` explícito |
| 2026-06 | `use_container_width` deprecado en Streamlit | Reemplazar por `width="stretch"` (24 ocurrencias) |
| 2026-06 | Timestamps incompatibles en Plotly `add_vline` | Helper `_ts_ms()` para convertir a ms Unix |
| 2026-06 | `StreamlitAPIException`: slider `min_value == max_value` cuando hay 1 solo candidato | Condicional `if n_filt > 1:` — muestra texto estático en lugar del slider |
| 2026-06 | `AttributeError: np.trapz` eliminado en numpy >= 2.0 | Reemplazar por `np.trapezoid` en `shape_features_v2.py` |
| 2026-06 | `COMP_STATS` hardcodeado con solo 5 features de 304 anots. | Actualizado con 25 features y estadísticas reales de 417 anotaciones via `revisar_anotaciones_v2.py` |

---

## Ver también

- [[av2_03_DETECCION_SEGMENTOS]] — Generador de candidatos que alimenta la app
- [[av2_04_MOTOR_MATEMATICO]] — Features visualizadas en Tab 1 y Tab 4
- [[av2_05_ANOTACION_Y_CATEGORIAS]] — Workflow de uso de la app
- [[av2_06_UMBRALES_Y_REGLAS]] — Umbrales que se ajustan en Tab 4
