# Investigación Kittypau — Referencia Maestra

> **🔬 Ciclo Alpha v2 — ACTIVO (documentación técnica detallada):**
> - **[Ciclo Alpha v2/00_INDICE_AV2.md](Ciclo%20Alpha%20v2/00_INDICE_AV2.md)** ⭐ — MOC principal con fases, objetivos, estructura de archivos
> - [Ciclo Alpha v2/04_MATEMATICA_SHAPE_FEATURES.md](Ciclo%20Alpha%20v2/04_MATEMATICA_SHAPE_FEATURES.md) — fórmulas completas (monotonía, R², ZCR, similitud coseno)
> - [Ciclo Alpha v2/06_UMBRALES_Y_REGLAS.md](Ciclo%20Alpha%20v2/06_UMBRALES_Y_REGLAS.md) — `umbrales.json` v1.2, orden del detector
> - [Ciclo Alpha v2/07_RESULTADOS_304_ANOTACIONES.md](Ciclo%20Alpha%20v2/07_RESULTADOS_304_ANOTACIONES.md) — estadísticas por categoría, separación en σ
> - [Ciclo Alpha v2/08_APP_ANOTACION_AV2.md](Ciclo%20Alpha%20v2/08_APP_ANOTACION_AV2.md) — app Streamlit (6 tabs, dark theme, correcciones)
>
> **Para agentes IA — leer primero:**
> Este archivo es el punto de entrada operativo del ecosistema. Documentos maestros:
> - **[GLOSARIO.md](GLOSARIO.md)** — devices, features, clases, parámetros globales, convenciones
> - **[EXPERIMENT_TRACKER.md](EXPERIMENT_TRACKER.md)** — tabla de experimentos del Ciclo Alpha (Exp01–11) con métricas, artefactos y roadmap
> - **[Ciclo Alpha/experiments/README.md](Ciclo Alpha/experiments/README.md)** — índice de iteraciones ML con hitos y protocolo
> - **[Ciclo Alpha v2/APRENDIZAJES_CONSOLIDADOS.md](Ciclo Alpha v2/APRENDIZAJES_CONSOLIDADOS.md)** ← **LEER ESTE PARA ALPHA v2** — todos los aprendizajes de Alpha + Gamma + Delta + Exp10-NN en un documento
>
> **Estructura rápida de la carpeta:**
> ```
> investigacion/
> ├── README.md + GLOSARIO.md + EXPERIMENT_TRACKER.md   ← ecosistema maestro (Ciclo Alpha)
> ├── ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md               ← estado actual y dirección Ciclo Alpha v2
> ├── 01–08_*.md                                         ← contexto, reglas, auditorías
> ├── Ciclo Alpha/                                       ← pipeline ML supervisado (Exp01–11, CERRADO)
> │   ├── experiments/exp_01–11_*.md                    ← iteraciones del modelo
> │   └── Exploracion_Gamma_Delta_2026/                  ← archivo de Gamma+Delta (exploración 2026-06)
> │       ├── APRENDIZAJES_GAMMA_DELTA.md               ← aprendizajes de Gamma y Delta
> │       ├── COMPARACION_ALPHA_GAMMA.md                ← comparación de datos y métricas
> │       ├── Ciclo Gamma/                               ← pipeline multi-modelo supervisado (archivado)
> │       └── Ciclo Delta/                               ← pipeline no supervisado (archivado)
> ├── Ciclo Alpha v2/                                    ← ACTIVO — detección por segmentos
> │   ├── README.md                                      ← descripción de las 7 fases + constantes
> │   ├── APRENDIZAJES_CONSOLIDADOS.md                   ← ⭐ MEMORIA DE TODOS LOS CICLOS
> │   ├── fase_0_ruido/                                  ← PRIMERA FASE — modelo de ruido del sensor
> │   ├── fase_1_extraccion/ … fase_6_evaluacion/        ← fases pendientes
> │   └── experiments/README.md                          ← tracker de experimentos v2 + baselines
> └── Data_2026/[Mes_Año]/                               ← dumps de datos crudos
> ```
>
> **Cómo categorizar un archivo nuevo:** ver sección [Regla de uso de la carpeta](#regla-de-uso-de-la-carpeta) + [EXPERIMENT_TRACKER.md](EXPERIMENT_TRACKER.md) para experimentos.

**Proyecto:** Kittypau — Ecosistema IoT para monitoreo de mascotas  
**Dispositivos documentados:** KPCL0034 (food_bowl) · KPCL0036 (water_bowl)  
**Mascota tester:** Bandida  
**Última actualización:** 2026-06-14

Esta carpeta consolida dos líneas de trabajo paralelas e interdependientes:

1. **Línea operativa** — Dashboard interactivo para visualizar lecturas de peso/batería y categorizar manualmente sesiones de alimentación, hidratación y servido en tiempo real.
2. **Línea de Data Science** — Pipeline de ML supervisado de 3 fases (extracción → dataset → modelos) para detectar automáticamente patrones de consumo desde la curva de peso.

La **fuente de verdad** de ambas líneas es `public.audit_events` en Supabase. Todo análisis, entrenamiento o visualización debe derivar de ahí.

---

## Contexto del proyecto

### Qué mide cada device

| Device | Tipo | Bowl | Qué registra |
|---|---|---|---|
| `KPCL0034` | `food_bowl` | Plato de comida | Peso del alimento en gramos. Baja cuando Bandida come. |
| `KPCL0036` | `water_bowl` | Fuente de agua | Peso del agua en gramos. Baja cuando Bandida bebe. |

### Cómo funciona el sistema

Cada KPCL envía lecturas de peso (y datos ambientales) vía MQTT al bridge (Raspberry Pi Zero 2W), que las escribe en `public.readings` de Supabase. La app web en Next.js lee esos datos y permite al operador categorizar manualmente cada sesión desde la vista Today.

```
KPCL → MQTT → Bridge (RPi) → Supabase
                                 └── public.readings     (telemetría)
                                 └── public.audit_events (eventos manuales y de bridge)
                                 └── public.devices      (metadata del device)
```

### Por qué el 50% de readings tiene `clock_invalid = true`

El reloj interno del KPCL puede desincronizarse cuando el dispositivo pierde energía y no tiene acceso a NTP. Cuando `clock_invalid = true`, el timestamp confiable es `ingested_at` (momento en que el bridge recibió el paquete), no `recorded_at` (timestamp del device). Todos los scripts del pipeline usan `ingested_at` como fallback automático.

---

## Inventario completo de archivos

### Scripts operativos

#### [`plot_kpcl_experimento.py`](Dashboard_KPCL/plot_kpcl_experimento.py)

**Propósito:** Genera el dashboard HTML interactivo con tres paneles: peso KPCL0034, peso KPCL0036 y batería de ambos.

**Entradas:**
- Supabase (preferente): `public.readings` + `public.audit_events` via SQL directo o REST fallback
- CSV local (fallback): `kpcl0034_sin_batera_actual.csv` y `kpcl0036_sin_batera_actual.csv`

**Salidas:**
- `kpcl_pruebas_eventos.html` — gráfico interactivo Plotly (~4.2 MB)
- `kpcl0034_sin_batera_actual.csv` — export filtrado KPCL0034 (sobreescribe)
- `kpcl0036_sin_batera_actual.csv` — export filtrado KPCL0036 (sobreescribe)

**Variables de entorno requeridas (desde `.env.local`):**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL          (opcional, para SQL directo)
SUPABASE_DB_POOLER_URL   (opcional, alternativa al anterior)
```

**Modo solo CSV local (sin credenciales):**
```powershell
$env:FORCE_LOCAL_CSV='1'; python Investigacion/Dashboard_KPCL/plot_kpcl_experimento.py
```

**Funciones principales:**
| Función | Responsabilidad |
|---|---|
| `load_env_from_file()` | Lee `.env.local` desde la raíz del repo |
| `build_supabase_sql()` | Construye query SQL canónico con JOIN a `audit_events` |
| `load_rows_from_supabase()` | Intenta SQL directo vía `psycopg2`; cae a REST si falla |
| `rows_to_points()` | Normaliza filas crudas a puntos graficables |
| `export_rows()` | Reescribe CSV filtrado por device; elimina CSVs anteriores del patrón `kpclXXXX_sin_batera_*.csv` |
| `build_event_intervals()` | Convierte eventos pares `inicio_*/termino_*` en bandas de sesión |
| `build_device_figure()` | Genera panel de peso (Plotly) con bandas y marcadores |
| `build_battery_figure()` | Genera panel de batería |
| `build_stats_html()` | Genera tabla HTML de resumen de sesiones |
| `generate_dashboard()` | Coordina todo: lectura → exportación → render → escritura |

---

#### [`serve_kpcl_dashboard.py`](Dashboard_KPCL/serve_kpcl_dashboard.py)

**Propósito:** Servidor HTTP local (puerto 8765) que sirve el dashboard con refresh de datos en tiempo real, sin exponer credenciales al navegador.

**Endpoints:**

| Endpoint | Método | Acción |
|---|---|---|
| `/` | GET | Sirve el HTML regenerado del dashboard |
| `/health` | GET | Health check — responde `200 OK` cuando el servidor está listo |
| `/refresh` | POST | Descarga data fresca de Supabase, reescribe CSV y HTML |
| `/favicon.ico` | GET | Responde `204 No Content` para no contaminar logs |

**Flujo de refresh:**
1. El cliente (HTML o lanzador) hace `POST /refresh`
2. El servidor llama internamente a `generate_dashboard()` del script de plot
3. Reescribe los CSV y el HTML
4. El cliente recibe confirmación y recarga con `?v=<timestamp>` como cache-buster

**Iniciar manualmente:**
```powershell
python Investigacion/Dashboard_KPCL/serve_kpcl_dashboard.py
# Luego abrir: http://127.0.0.1:8765/
```

---

#### [`abrir_kpcl_dashboard.ps1`](Dashboard_KPCL/abrir_kpcl_dashboard.ps1)

**Propósito:** Lanzador de un solo comando. Levanta el servidor en segundo plano y abre el navegador automáticamente cuando el servidor está listo.

**Secuencia de pasos internos:**
1. Mata cualquier proceso anterior en el puerto 8765
2. Lanza `serve_kpcl_dashboard.py` en segundo plano (ventana oculta)
3. Hace polling a `GET /health` hasta recibir `200 OK`
4. Dispara `POST /refresh` para que la data esté fresca al abrir
5. Abre `http://127.0.0.1:8765/?autoload=1` en el navegador predeterminado

**Uso:**
```powershell
.\Investigacion\Dashboard_KPCL\abrir_kpcl_dashboard.ps1
```

> **Nota:** El parámetro `?autoload=1` le dice al HTML que inicie el refresh automático al cargar, sin necesidad de hacer click en el botón verde.

---

### Datos CSV

#### [`kpcl0034_full_eventos.csv`](Dashboard_KPCL/kpcl0034_full_eventos.csv)

**Tamaño:** ~9.2 MB  
**Contenido:** Export completo de KPCL0034 con lecturas de peso + columna `evento` con etiquetas de `public.audit_events` alineadas.  
**Propósito:** Foco operacional; incluye trazabilidad completa de categorizaciones manuales. Es el CSV de referencia para análisis de KPCL0034.

**Columnas principales:**

| Columna | Tipo | Descripción |
|---|---|---|
| `recorded_at` | timestamp UTC | Timestamp del device (puede ser inválido si `clock_invalid=true`) |
| `ingested_at` | timestamp UTC | Timestamp de recepción en el bridge (siempre confiable) |
| `weight_grams` | float | Peso total bruto del bowl incluyendo plato + contenido |
| `temperature` | float | Temperatura ambiente (°C) |
| `humidity` | float | Humedad relativa (%) |
| `battery_level` | float | Nivel de batería (0–100); 100% NaN por limitación de hardware actual |
| `clock_invalid` | bool | True → usar `ingested_at` como timestamp canónico |
| `plate_weight_grams` | float | Peso del plato vacío (desde `devices`); permite calcular `net_weight` |
| `evento` | string | Categoría manual del evento más cercano (±30s); null si no hay evento |

---

#### [`kpcl0034_kpcl0036_prueba_sincargador.csv`](Dashboard_KPCL/kpcl0034_kpcl0036_prueba_sincargador.csv)

**Tamaño:** ~63 MB  
**Contenido:** Snapshot bruto combinado de KPCL0034 y KPCL0036 durante el experimento sin cargador. Incluye columna `device_code` para distinguir entre devices.  
**Propósito:** Experimento compartido para validar comportamiento de batería en descarga libre. Ver [`06_AUDITORIA_SIN_CARGADOR.md`](06_AUDITORIA_SIN_CARGADOR.md) para el diagnóstico completo.

---

#### [`kpcl0034_sin_batera_actual.csv`](Dashboard_KPCL/kpcl0034_sin_batera_actual.csv)

**Tamaño:** ~27 MB  
**Contenido:** Export filtrado de KPCL0034 excluyendo columna de batería (para optimizar visualización). Generado y sobreescrito automáticamente por `plot_kpcl_experimento.py`.  
**Nombre:** El sufijo `_actual` indica que es el export vigente. Cualquier versión anterior con patrón `kpcl0034_sin_batera_*.csv` se elimina al regenerar.

---

#### [`kpcl0036_sin_batera_actual.csv`](Dashboard_KPCL/kpcl0036_sin_batera_actual.csv)

**Tamaño:** ~143 MB  
**Contenido:** Equivalente al anterior para KPCL0036.  
**Nota:** El mayor tamaño refleja que KPCL0036 tiene más tiempo de uptime registrado en el período de análisis.

---

### Salidas generadas

#### [`kpcl_pruebas_eventos.html`](Dashboard_KPCL/kpcl_pruebas_eventos.html)

**Tamaño:** ~4.2 MB  
**Contenido:** Dashboard interactivo Plotly exportado como HTML standalone.

**Paneles:**
1. **Panel KPCL0034** — Curva de `Peso total` + `Comida neta`, bandas de sesión (`alimentacion`, `servido`, `hidratacion`), marcadores verticales de eventos puntuales.
2. **Panel KPCL0036** — Curva de `Peso total`, bandas de sesión de hidratación.
3. **Panel Batería** — Nivel de batería de ambos devices en la misma vista.
4. **Tabla de resumen** — Lista de sesiones con timestamp, tipo, duración y gramos consumidos.
5. **Modal de categorización** — Se abre al hacer click en un punto de la curva. Permite guardar un evento manual directamente en `public.audit_events`.

**Funciones JavaScript del HTML:**

| Función | Acción |
|---|---|
| `bootstrapDashboard()` | Auto-inicia el dashboard al cargar; si el servidor está activo, llama a `/refresh` |
| `openModal(deviceCode, ts, weight)` | Abre el modal para categorizar un punto de la curva |
| `selectCat(btn, category, label)` | Asigna la categoría en el modal |
| `saveEvent()` | Llama a la API de Supabase para guardar el evento y recarga la vista |
| `refreshDataAndCsv(options)` | Llama a `POST /refresh` y recarga el HTML con cache-buster |
| `zoomToEvent(row)` | Centra el gráfico en la sesión seleccionada desde la tabla |
| `showToast(msg)` | Muestra feedback visual en la parte inferior de la pantalla |

**Nota de fallback:** Si el HTML se abre como archivo local (sin servidor activo), se redirige automáticamente a `http://127.0.0.1:8765/?autoload=1`. Si el servidor no responde, avisa con un mensaje visible.

---

### Documentación técnica

#### [`01_GUIA_DASHBOARD_KPCL.md`](01_GUIA_DASHBOARD_KPCL.md)

Guía operativa paso a paso para usar el dashboard. Incluye:
- Flujo completo de apertura (lanzador → servidor → navegador)
- Cómo registrar sesiones de alimentación manualmente
- Reglas de intervalos (todo `inicio_*` debe cerrarse con `termino_*`)
- Cómo interpretar la tarjeta de estado de fuente (Supabase vs. fallback CSV)
- Descripción de todas las funciones del gráfico y del generador Python

---

#### [`02_REGLAS_EVENTOS_ALIMENTACION.md`](02_REGLAS_EVENTOS_ALIMENTACION.md)

Especificación canónica de las reglas de detección y categorización. Incluye:
- Definición formal de "sesión de alimentación" e "hidratación"
- Mapa de las 4 fuentes de detección del proyecto (con roles, limitaciones y alineación requerida)
- Diagrama de prioridad para el gráfico hero
- Pseudo-código de la estructura de una sesión para ML
- Tabla de inconsistencias pendientes entre fuentes

---

#### [`03_ML_PREDICCION_ALIMENTACION.md`](03_ML_PREDICCION_ALIMENTACION.md)

Especificación completa del problema de ML. Incluye:
- Formulación del problema (segmentación de 3 estados: baseline / inicio_alimentacion / post_alimentacion)
- Dataset etiquetado disponible y su fuente canónica
- Lista completa de features (primarias y derivadas)
- Query SQL de extracción para entrenamiento
- Baseline heurístico (`detectIntakeSessions`) que el modelo debe superar
- Arquitecturas sugeridas (Gradient Boosting, LSTM/GRU, cambio de régimen)
- Métricas de éxito: F1 macro ≥ 0.75, Precisión `inicio_alimentacion` ≥ 0.80, error timestamp ≤ 60s

---

#### [`04_OPERATIVIZACION_SESIONES_SUPABASE.md`](04_OPERATIVIZACION_SESIONES_SUPABASE.md)

Documentación de la implementación SQL/API en Supabase. Incluye:
- Estructura de `public.device_bowl_sessions` y `public.device_bowl_session_anomalies`
- Función `rebuild_device_bowl_sessions()` y cuándo usarla
- Regla de gramos netos: `alimentacion/hidratacion` → `start - end`; `servido` → `end - start`
- Endpoint `GET /api/devices/[id]/sessions` con parámetros de filtro
- Queries SQL de ejemplo para resumen diario auditado

---

### Análisis Colab (export 07-05-2026)

- [`05_ANALISIS_COLAB_KPCL0034_07052026.md`](05_ANALISIS_COLAB_KPCL0034_07052026.md) — documentación completa del análisis exploratorio en Colab: pipeline de 2 fases, features por sesión, 4 paneles del dashboard, cruce servido vs. consumido, diferencias vs. pipeline ML.
- [`Ciclo Alpha/colab_analisis_kpcl0034_07052026.py`](Data%20Science/colab_analisis_kpcl0034_07052026.py) — script Python completo para Google Colab. Lee CSVs exportados desde Google Drive, reconstruye sesiones, calcula features de comportamiento y genera dashboard HTML interactivo con 4 paneles Plotly.

### Datos históricos — `Data_2026/`

Carpeta que consolida los exports de Supabase organizados por período. Es la **fuente canónica para el pipeline ML desde Experimento 06**.

#### `Data_2026/Abril_2026/kittypau_full_07-05-2026_csv/`

Export completo de todas las tablas de Supabase al 2026-05-07.

| Archivo | Tamaño | Contenido |
|---|---|---|
| `readings.csv` | 242 MB | 1,085,889 lecturas — tabla activa (`public.readings`) |
| `sensor_readings.csv` | 74 MB | 543,332 lecturas — tabla legacy (no usar en pipeline ML) |
| `audit_events.csv` | 234 KB | 749 eventos totales · 271 `manual_bowl_category` |
| `devices.csv` | 527 KB | Metadata de los 12 devices registrados |
| `pets.csv` | 2.5 KB | Información de mascotas (Bandida) |

**Tabla activa vs. legacy:**
- `readings` → esquema moderno con `clock_invalid`, `ingested_at`, `net_weight`. **Usar esta.**
- `sensor_readings` → esquema antiguo sin `clock_invalid` ni `ingested_at`. Descartada.

**Encoding:** Todos los CSVs del dump se leen con `encoding="latin1"` (exports Supabase con caracteres especiales).

#### `Data_2026/Abril_2026/kittypau_full_07-05-2026.dump`

Dump PostgreSQL completo (52 MB). Permite restaurar el estado completo de la base de datos al 07-05-2026 en un entorno local. Equivalente al CSV pero en formato PostgreSQL nativo.

---

### Archivos pendientes (referenciados, en proceso de creación)

| Archivo | Descripción | Estado |
|---|---|---|
| [`08_REGISTRO_EVENTOS_2026-04-16.md`](08_REGISTRO_EVENTOS_2026-04-16.md) | Bitácora del backfill inicial de 49 eventos manuales de KPCL0034 | ✅ Disponible |
| [`06_AUDITORIA_SIN_CARGADOR.md`](06_AUDITORIA_SIN_CARGADOR.md) | Diagnóstico del experimento compartido sin cargador | ✅ Disponible |
| [`07_AUDITORIA_KPCL0036_ERROR_PESO.md`](07_AUDITORIA_KPCL0036_ERROR_PESO.md) | Diagnóstico del historial de peso anómalo sin batería en KPCL0036 | ✅ Disponible |
| `SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql` | SQL canónico de exportación del tramo de experimento | ⏳ Pendiente |
| `refresh_kpcl_experimento.py` | Script de descarga histórica desde Supabase | ⏳ Pendiente |
| `SQL_VALIDACION_KPCL0036_TARE_FILL.sql` | Validación SQL de secuencia tare/llenado en KPCL0036 | ⏳ Pendiente |

---

## Datos actuales del dataset (estado al 2026-05-07 — dump Colab)

> **Fuente:** `Data_2026/Abril_2026/kittypau_full_07-05-2026_csv/` · Export Supabase completo al 07-05-2026.
> **Tabla de readings activa:** `readings.csv` (no `sensor_readings.csv`).

### Lecturas totales (tabla `readings`)

| Métrica | Valor |
|---|---|
| Total readings brutas | 1,085,889 filas (5 devices) |
| Readings limpias (`clock_invalid = False`) | 1,083,737 filas |
| Rango temporal KPCL0034 | `2026-04-08` → `2026-05-01` |
| Cadencia típica KPCL0034 | ~14.6 segundos |
| `clock_invalid = True` | ~50% de filas (usar `ingested_at` como fallback) |
| NaN en `battery_level` | 100% (hardware no envía el dato aún) |

### Etiquetas en `public.audit_events`

| Categoría | Cantidad |
|---|---|
| `inicio_alimentacion` | 103 |
| `termino_alimentacion` | 103 |
| `inicio_servido` | 20 |
| `termino_servido` | 20 |
| `inicio_hidratacion` | 1 |
| `termino_hidratacion` | 1 |
| Setup (`kpcl_con_plato`, `kpcl_sin_plato`, `tare_con_plato`) | ~23 |
| **Total `manual_bowl_category`** | **271** |

### Sesiones reconstruidas (KPCL0034)

| Tipo | N | Duración media | Consumo medio |
|---|---|---|---|
| `alimentacion` | 103 | 445s (~7.4 min) | 12.2 g |
| `servido` | 18 | — | 68.4 g servido |

**Features de comportamiento (análisis Colab):**
- Sesiones con consumo positivo: 98 de 103
- Ritmo promedio: 2.21 g/min
- Servido máximo en una sesión: 126.0 g
- Cruce global (Apr 8 – May 1): **1,232 g consumidos / 1,259 g servidos = 102.2% aprovechamiento**

### Incremento vs. pipeline local (Experimento 05)

| Métrica | Exp 05 (local, Apr 27) | Colab dump (07-05-2026) | Delta |
|---|---|---|---|
| Etiquetas `manual_bowl_category` | 202 | **271** | +69 (+34%) |
| Sesiones alimentación | 95 | **103** | +8 |
| Sesiones servido | 14 | **18–20** | +4–6 (+30%) |
| Readings usadas (tabla) | 96,807 (`sensor_readings` API) | **1,083,737** (`readings.csv`) | tabla diferente |
| Cobertura temporal | Apr 8 – Apr 27 | Apr 8 – **May 1** | +5 días |

> El incremento de sesiones de `servido` (+4–6 pares) es el hallazgo más relevante: aborda directamente el cuello de botella identificado en los Experimentos 3–5. El desbalance extremo de `servido` (~580× menos que `reposo`) sigue siendo la limitación principal, pero la nueva data ayuda a mitigarlo.

### Dataset ML (splits Experimento 06 — activo)

> **Taxonomía de datos completa en [GLOSARIO.md — Taxonomía de Datos](GLOSARIO.md#taxonomía-de-datos).**

| Split | Etiquetado manual | Visto por el modelo | Filas | Rango temporal | Propósito |
|---|:---:|:---:|---|---|---|
| **Train** | ✅ Sí | ✅ Sí — entrenamiento | 44,016 | `2026-04-08` → `2026-04-25` | Entrenamiento (70%) |
| **Val** | ✅ Sí | ✅ Sí — validación | 9,432 | `2026-04-25` → `2026-04-28` | Validación durante entrenamiento (15%) |
| **Test** ⚠️ RESERVADO | ✅ Sí | ❌ NO — jamás visto | 9,432 | `2026-04-28` → `2026-05-01` | Evaluación formal Fase 4 — **NO TOCAR** |
| **Inferencia** (Exp 07) | ❌ No — pendiente retroactivo | ❌ NO — dato nuevo | 57,101 | `2026-05-25` → `2026-06-14` | Predicción en producción — sesiones detectadas son salida del modelo, no ground truth |

Distribución train+val+test: reposo 61,259 (97.2%) · alimentacion 1,530 (2.4%) · servido 91 (0.1%)

> **Distinción crítica — inferencia vs. evaluación:**
> Los datos de Mayo–Junio 2026 no tienen etiquetas manuales. Las 134 sesiones detectadas en el Exp 07 son **predicciones del modelo**, no verdades verificadas. Para calcular F1/AUC sobre ese período, se necesita el etiquetado retroactivo con `app_anotacion.py`.

> **Histórico (Experimento 05, ahora reemplazado):** Train 30,377 · Val 6,510 · Test 6,510 — split hasta Apr 25.

---

## Pipeline de Data Science — Descripción completa

### Visión general

```
Supabase ──→ Fase 1 (Extracción) ──→ Fase 2 (Dataset) ──→ Fase 3 (Modelos)
              │                         │                    │
              ├── readings_raw          ├── X_train          ├── modelo_a.lgb
              ├── events_labeled        ├── X_val            ├── modelo_b.lgb
              └── sessions_labeled      ├── X_test (★reservado)
                                        └── dataset_meta
```

> **Nota:** La carpeta `Ciclo Alpha/` fue renombrada a `Ciclo Alpha/` en Junio 2026. Los scripts y artefactos son los mismos; las rutas a continuación reflejan el nombre actual.

### Fase 1 — Extracción ([`Ciclo Alpha/fase_1_extraccion/`](Ciclo%20Alpha/fase_1_extraccion/))

Descarga datos desde Supabase y genera tres artefactos parquet.

**Scripts (en orden de ejecución):**

| Script | Acción |
|---|---|
| `01_setup_env.py` | Verifica credenciales y conectividad con Supabase |
| `02_get_device_uuid.py` | Obtiene el UUID de KPCL0034 desde `public.devices` → `device_uuid.txt` |
| `03_extract_readings.py` | Descarga todas las lecturas → `readings_raw.parquet` |
| `04_extract_events.py` | Descarga eventos `manual_bowl_category` de `audit_events` → `events_labeled.parquet` |
| `05_build_sessions.py` | Reconstruye sesiones desde pares `inicio_*/termino_*` → `sessions_labeled.parquet` |
| `06_quality_report.py` | Valida calidad del dataset y genera `quality_report.txt` |
| `_supabase_helpers.py` | Módulo compartido: autenticación, paginación, retry |

**Salidas (Experimento 06):**

| Artefacto | Contenido |
|---|---|
| `data/raw/readings_raw.parquet` | Serie temporal de peso — **124,682 filas** · Apr 8 – May 1 |
| `data/raw/events_labeled.parquet` | Eventos manuales alineados — **254 eventos** (206 alim + 36 servido + 12 otros) |
| `data/raw/sessions_labeled.parquet` | Sesiones cerradas — **103 alim** (dur. media 445s) + **18 servido** (dur. media 159s) |
| `outputs/quality_report/quality_report.txt` | Reporte de calidad: totales, NaN, cadencia, gaps |

**Nota crítica:** El 50% de lecturas tiene `clock_invalid = true` (62,333 filas). El script usa `ingested_at` automáticamente cuando este flag está activo.

---

### Fase 2 — Dataset ([`Ciclo Alpha/fase_2_dataset/`](Data%20Science/fase_2_dataset/))

Construye el dataset supervisado con features de ingeniería temporal y split cronológico.

**Scripts (en orden de ejecución):**

| Script | Acción |
|---|---|
| `01_build_labels.py` | Asigna etiqueta a cada reading según las sesiones de Fase 1 |
| `02_build_features.py` | Calcula features derivadas (deltas, rolling stats, encoding cíclico) |
| `03_build_train_dataset.py` | Aplica split temporal 70/15/15; calcula pesos por clase |
| `04_dataset_report.py` | Genera reporte de distribución de clases y validación del split |
| `_phase2_utils.py` | Utilidades compartidas de feature engineering |

**Features activas (12, tras Experimento 3):**

| Feature | Descripción | Por qué importa |
|---|---|---|
| `weight_grams` | Peso bruto del bowl | Variable principal |
| `delta_w` | `weight[t] - weight[t-1]` | Detección de cambio inmediato |
| `delta_w_10` | Delta sobre ventana de 10 lecturas | Tendencia de mediano plazo |
| `rolling_std_5` | Desviación estándar últimas 5 lecturas | Variabilidad local de la señal |
| `rolling_std_10` | Desviación estándar últimas 10 lecturas | **Feature #1 en importancia** |
| `rolling_mean_5` | Media de últimas 5 lecturas | Suavizado del peso |
| `net_weight` | `weight_grams - plate_weight_grams` | Peso real del contenido |
| `is_plateau` | Booleano: señal estable | Detección de reposo |
| `plateau_duration` | Tiempo consecutivo en plateau | **Feature #2 en importancia** |
| `hour_sin` | `sin(hora_local * 2π/24)` | Patrón horario cíclico |
| `hour_cos` | `cos(hora_local * 2π/24)` | Patrón horario cíclico |
| `clock_invalid` | Flag de reloj inválido | Calidad del timestamp |

**Features eliminadas en Experimento 3 (no aportaban):**
- `delta_w_3` — redundante con `delta_w`
- `rate_gs` — redundante con `delta_w` + cadencia

**Salidas:**

| Artefacto | Contenido |
|---|---|
| `data/interim/readings_labeled.parquet` | Lecturas con etiqueta asignada |
| `data/interim/readings_features.parquet` | Lecturas con todas las features calculadas |
| `data/train/X_train.parquet` | Features de entrenamiento (30,377 filas) |
| `data/train/X_val.parquet` | Features de validación (6,510 filas) |
| `data/train/X_test.parquet` | Features de test (6,510 filas) — **NO TOCAR hasta Fase 4** |
| `data/train/y_train.parquet` | Etiquetas de entrenamiento |
| `data/train/y_val.parquet` | Etiquetas de validación |
| `data/train/y_test.parquet` | Etiquetas de test — **NO TOCAR hasta Fase 4** |
| `data/train/label_encoder.json` | Mapeo `alimentacion→0, servido→1, reposo→2` |
| `data/train/dataset_meta.json` | Métricas del dataset: conteos, fechas, pesos de clase |

---

### Fase 3 — Modelos ([`Ciclo Alpha/fase_3_modelos/`](Data%20Science/fase_3_modelos/))

Entrena y evalúa dos variantes del modelo de detección.

**Dos variantes (Experimento 06 — activo):**

| Modelo | Tipo | Clases | Resultado Exp 06 |
|---|---|---|---|
| **Modelo A** | Binario | `activo` vs `reposo` | F1=**0.7619** · AUC=**0.9205** · thr=0.20 |
| **Modelo B** | Multiclase | `alimentacion` / `servido` / `reposo` | F1-alim=**0.7606** · F1-servido=0.1395 ⚠️ |

**Scripts (en orden de ejecución):**

| Script | Acción |
|---|---|
| `01_prepare_datasets.py` | Lee parquets de Fase 2; colapsa `alimentacion+servido→activo` para Modelo A |
| `02_train_modelo_a.py` | Entrena LightGBM binario con `scale_pos_weight`; hace threshold sweep |
| `03_train_modelo_b.py` | Entrena LightGBM multiclase con pesos por clase; SMOTE en `servido` (71 reales → 213) |
| `04_training_report.py` | Compara ambos modelos en validación; genera reporte (no toca test set) |
| `_phase3_utils.py` | Utilidades compartidas de entrenamiento y evaluación |

**Entorno de ejecución:**
```
Python: 3.11
LightGBM: 4.3.0
Sistema: Windows / PowerShell
```

---

### Fase 4 — Visualización y evaluación ([`Ciclo Alpha/fase_4_visualizacion/`](Data%20Science/fase_4_visualizacion/))

Herramientas de anotación y evaluación final sobre el test set reservado.

**Componentes:**

| Archivo | Propósito |
|---|---|
| [`app_anotacion.py`](Data%20Science/fase_4_visualizacion/app_anotacion.py) | App Streamlit para visualizar la serie temporal y agregar anotaciones manuales nuevas |
| [`COMO_EJECUTAR.md`](Data%20Science/fase_4_visualizacion/COMO_EJECUTAR.md) | Instrucciones para lanzar la app en localhost |
| `data/new_annotations.csv` | Nuevas anotaciones locales del usuario (se fusionan en Fase 1 via `04_extract_events.py`) |

**Inferencia en producción:**

| Archivo | Propósito |
|---|---|
| [`inferencia_kpcl0034.py`](Data%20Science/inferencia_kpcl0034.py) | Script de inferencia completo: carga modelos Exp 06, preprocesa, predice y genera dashboard HTML |
| `sesiones_detectadas.csv` | Sesiones detectadas en la última corrida (output generado) |
| `inferencia_kpcl0034.html` | Dashboard interactivo: curva de peso + bandas GT (▼) vs ML (▲) + probabilidad Modelo A |

**Ejecutar inferencia:**
```powershell
& C:\Users\Usuario\AppData\Local\Programs\Python\Python311\python.exe "d:/Escritorio/Proyectos/AIoT_Kittypau/kittypau_2026_hivemq/Docs/investigacion/Ciclo Alpha/inferencia_kpcl0034.py"
```

**Lanzar app de anotación:**
```powershell
cd "Docs/investigacion/Data Science"
.\venv\Scripts\Activate.ps1
streamlit run fase_4_visualizacion/app_anotacion.py
```

**Comandos de ejecución:**
```powershell
cd "Docs/investigacion/Data Science"
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Luego, para cada fase:
python fase_3_modelos/scripts/01_prepare_datasets.py
python fase_3_modelos/scripts/02_train_modelo_a.py
python fase_3_modelos/scripts/03_train_modelo_b.py
python fase_3_modelos/scripts/04_training_report.py
```

---

## Resultados de experimentos (Fase 3)

### Tabla comparativa — evolución completa

| Métrica | Exp 01 | Exp 02 | Exp 03 | Exp 04 | Exp 05 | **Exp 06 ★** |
|---|---:|---:|---:|---:|---:|---:|
| **Modelo A** F1 activo | `0.0000` | `0.5550` | `0.5600` | `0.5693` | `0.5693` | **`0.7619`** |
| **Modelo A** AUC-ROC | `0.8098` | `0.9024` | `0.8798` | `0.8802` | `0.8802` | **`0.9205`** |
| **Modelo A** threshold | `0.50` | `0.42` | `0.37` | `0.22` | `0.22` | **`0.20`** |
| **Modelo B** Macro F1 | `0.5688` | `0.6367` | `0.6712` | `0.6456` | `0.6456` | `0.6312` |
| **Modelo B** F1 alimentacion | `0.3984` | `0.5223` | `0.5256` | `0.5488` | `0.5488` | **`0.7606`** |
| **Modelo B** F1 servido | `0.3333` | `0.4000` | `0.5000` | `0.4000` | `0.4000` | `0.1395` ⚠️ |
| **Modelo B** F1 reposo | `0.9745` | `—` | `0.9879` | `0.9879` | `0.9879` | `0.9934` |

★ = **Experimento 06** (2026-06-13) — fuente: CSV dump 07-05-2026. Mejor histórico en Modelo A (+19 pts F1) y F1 alimentacion (+21 pts). F1 servido baja porque val set solo tiene 12 ejemplos de servido (inestable).

### Detalle por experimento

#### Experimento 01 — Línea base (2026-04-26 20:29)
- **Qué se hizo:** Primera corrida completa sin ajuste de threshold ni rebalanceo.
- **Hallazgo clave:** Modelo A colapsa hacia `reposo` (`F1 = 0.0`). La capacidad discriminativa existe (AUC = 0.81) pero el threshold por defecto (0.5) es inútil con este desbalance extremo.
- **Matriz de confusión Modelo A:** TN=6284, FP=0, FN=226, TP=0
- **14 features activas** (incluye `delta_w_3` y `rate_gs`)

#### Experimento 02 — Threshold tuning (2026-04-26 20:45)
- **Qué se hizo:** Threshold del Modelo A ajustado a `0.42`; rebalanceo del Modelo B con `weight_power = 0.25`.
- **Hallazgo clave:** El ajuste de threshold tiene un impacto enorme (+55 puntos F1 en Modelo A). Modelo B mejora consistentemente.
- **Salto principal:** F1 activo `0.0 → 0.555`; Macro F1 `0.569 → 0.637`

#### Experimento 03 — Mejor base ★ (2026-04-26 21:04)
- **Qué se hizo:** Eliminación de `delta_w_3` y `rate_gs`; hiperparámetros más agresivos; threshold sweep fino (0.25–0.50 en pasos de 0.02); duplicación de `servido` ×3 en train.
- **Threshold óptimo Modelo A:** `0.37`
- **Mejor resultado Modelo B:** Macro F1 = `0.6712` con F1 servido = `0.5000` (primer experimento en llegar a 0.5)
- **Conclusión:** La limpieza de features no rompe rendimiento; la duplicación controlada de `servido` es la técnica más efectiva hasta ahora.
- **Matriz de confusión Modelo A:** TN=6240, FP=44, FN=121, TP=105

#### Experimento 04 — SMOTE + calibración (2026-04-26 21:29)
- **Qué se hizo:** Reemplaza duplicación exacta de `servido` por SMOTE local. Agrega calibración isotónica al Modelo A.
- **Resultado:** Modelo A mejora marginalmente (F1 = `0.5693`); Modelo B baja a Macro F1 = `0.6456`. SMOTE funciona peor que la duplicación exacta para este dataset tan pequeño.
- **Threshold óptimo Modelo A:** `0.22`

#### Experimento 05 — Nueva ingesta (2026-04-26 23:33)
- **Qué se hizo:** Nueva categorización manual de sesiones; nueva extracción de Fase 1. Fase 2 y Fase 3 no cambiaron.
- **Fase 1 actualizada:** 96,807 readings, 202 etiquetas, 95 sesiones
- **Razón por la que Fase 2 no cambió:** Los nuevos eventos caen fuera del corte temporal del split actual de Fase 2.
- **Conclusión clave:** Una nueva ingesta puede mejorar la visibilidad operativa sin mover el modelo hasta que entre al dataset supervisado.

### Umbrales de Fase 4 — estado al Experimento 06

| Métrica | Exp 05 | **Exp 06** | Umbral Fase 4 | Estado |
|---|---:|---:|---:|---|
| Modelo A: F1 activo | `0.5693` | **`0.7619`** | `0.70` | ✅ Superado |
| Modelo A: AUC-ROC | `0.8802` | **`0.9205`** | `0.85` | ✅ Superado |
| Modelo B: F1 alimentacion | `0.5488` | **`0.7606`** | `0.65` | ✅ Superado |
| Modelo B: Macro F1 | `0.6456` | `0.6312` | `0.60` | ✅ Superado |
| Modelo B: F1 servido | `0.4000` | `0.1395` ⚠️ | sin umbral | ⚠️ Baja — val set pequeño (12 ej.) |

**Fase 4 habilitada desde el 2026-06-13.** Ambas condiciones cumplidas en Experimento 06. La evaluación final pendiente se ejecuta sobre `X_test` (Apr 28 – May 1).

### Importancia de features (Experimento 03, Modelo B)

| Rango | Feature | Por qué importa |
|---|---|---|
| 1 | `rolling_std_5` | Variabilidad inmediata → detecta actividad vs. reposo |
| 2 | `rolling_std_10` | Variabilidad extendida → confirma tendencias |
| 3 | `plateau_duration` | Tiempo estable → key para identificar reposo prolongado |
| 4 | `hour_sin` | Patrón horario → Bandida come a horas regulares |
| 5 | `hour_cos` | Complemento cíclico del patrón horario |
| 6 | `weight_grams` | Magnitud absoluta → `servido` cambia a valores altos |
| 7 | `net_weight` | Peso neto del contenido → más interpretable que el bruto |
| 8 | `rolling_mean_5` | Tendencia suave → reduce ruido del sensor |
| 9 | `delta_w_10` | Cambio acumulado en 10 lecturas → detecta descensos sostenidos |
| 10 | `delta_w` | Cambio inmediato → onset de sesión |

---

## Abrir el dashboard — flujo paso a paso

### Método recomendado (lanzador automático)

```powershell
# Desde la raíz del repo:
.\Investigacion\Dashboard_KPCL\abrir_kpcl_dashboard.ps1
```

El script hace todo: mata proceso previo, levanta servidor, espera health check, refresca data, abre navegador.

### Método manual (para debugging)

```powershell
# Terminal 1: servidor
python Investigacion/Dashboard_KPCL/serve_kpcl_dashboard.py

# Terminal 2: verificar que está listo
Invoke-WebRequest http://127.0.0.1:8765/health

# Terminal 3: abrir dashboard
Start-Process "http://127.0.0.1:8765/?autoload=1"
```

### Modo sin credenciales (solo CSV local)

```powershell
$env:FORCE_LOCAL_CSV='1'; python Investigacion/Dashboard_KPCL/plot_kpcl_experimento.py
# Genera kpcl_pruebas_eventos.html sin conectarse a Supabase
```

---

## Flujo de categorización manual

1. Abrir el dashboard (ver sección anterior).
2. En el gráfico de KPCL0034, identificar un descenso de peso correspondiente a una sesión de alimentación.
3. Hacer click en el punto donde el gato **empieza** a comer → Modal se abre.
4. Seleccionar `inicio_alimentacion` → Guardar.
5. Hacer click en el punto donde el peso **se estabiliza** → Modal se abre.
6. Seleccionar `termino_alimentacion` → Guardar.
7. La vista se refresca automáticamente. La banda de color aparece sobre el gráfico.

**Regla crítica:** Los eventos de tipo intervalo van siempre en par. Un `inicio_*` sin `termino_*` correspondiente genera una anomalía en `public.device_bowl_session_anomalies`.

**Para sesiones de servido:** Mismo flujo, pero seleccionar `inicio_servido` y `termino_servido`. El servido aparece como banda naranja y **no se cuenta como consumo de la mascota**.

---

## Variables de entorno requeridas

Archivo: `kittypau_2026_hivemq/.env.local`

```env
# Requeridas para el dashboard y los scripts de Fase 1
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Opcionales: para acceso SQL directo (mejor rendimiento en descarga masiva)
SUPABASE_DB_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres
SUPABASE_DB_POOLER_URL=postgresql://postgres:password@aws-0-xx.pooler.supabase.com:6543/postgres
```

> Los scripts intentan primero SQL directo (`psycopg2`). Si falla, caen a REST de Supabase. Si falla también, usan el CSV local como último recurso.

---

## Fuente de verdad y flujo de datos

```
public.audit_events (Supabase)
│   event_type = 'manual_bowl_category'
│   Categorías: inicio_alimentacion, termino_alimentacion,
│               inicio_hidratacion, termino_hidratacion,
│               inicio_servido, termino_servido,
│               tare_con_plato, kpcl_sin_plato, kpcl_con_plato
│
├─► Dashboard operativo
│     plot_kpcl_experimento.py → HTML interactivo
│     serve_kpcl_dashboard.py → servidor con refresh
│     Categorización: modal en HTML → API → audit_events
│
├─► Pipeline ML (Ciclo Alpha/)
│     Fase 1: extrae readings + events + sessions
│     Fase 2: construye dataset supervisado 3 clases
│     Fase 3: entrena Modelo A (binario) + Modelo B (multiclase)
│
└─► App web (kittypau_app)
      /today → gráfico hero + categorización manual
      /story → pet_sessions desde analytics DB (bridge)
      API sessions → device_bowl_sessions (Supabase)
```

---

## Regla de uso de la carpeta

- Esta carpeta consolida artefactos de prueba, auditoría y ML de los KPCLs.
- Nuevas corridas de datos: guardar con formato `kpclXXXX_<experimento>_<fecha>.csv`.
- Nuevos CSVs o corridas compartidas: documentar aquí antes de referenciarlos desde `Docs/` raíz.
- Los gráficos y exportaciones se generan en UTC.
- CSVs de vista por device: se conserva un solo archivo con sufijo `_actual.csv` por device; al regenerar se elimina automáticamente cualquier versión anterior.
- Los eventos históricos deben vivir en `public.audit_events`; no se mantiene una lista local operativa paralela.
- La operación normal no requiere una lista local de eventos.

---

## Taxonomía canónica de categorías

Todas las categorías se registran en `public.audit_events.payload->>'category'` con `event_type = 'manual_bowl_category'`.

### Setup de dispositivo

| Key canónica | Label UI | Comportamiento |
|---|---|---|
| `kpcl_sin_plato` | KPCL SIN PLATO | Snapshot de peso vacío del bowl |
| `kpcl_con_plato` | KPCL CON PLATO | Calcula `plate_weight_grams = con_plato - sin_plato` y actualiza `devices` |
| `tare_con_plato` | TARE CON PLATO | Tara el contenido a 0 (no altera `plate_weight_grams`) |

### Servido (ambos types de bowl)

| Key canónica | Label UI | Tipo |
|---|---|---|
| `inicio_servido` | INICIO SERVIDO | Apertura de intervalo |
| `termino_servido` | TERMINO SERVIDO | Cierre de intervalo |

### Consumo — alimentación (KPCL0034, food_bowl)

| Key canónica | Label UI | Tipo |
|---|---|---|
| `inicio_alimentacion` | INICIO ALIMENTACION | Apertura de intervalo |
| `termino_alimentacion` | TERMINO ALIMENTACION | Cierre de intervalo |

### Consumo — hidratación (KPCL0036, water_bowl)

| Key canónica | Label UI | Tipo |
|---|---|---|
| `inicio_hidratacion` | INICIO HIDRATACION | Apertura de intervalo |
| `termino_hidratacion` | TERMINO HIDRATACION | Cierre de intervalo |

### Encendido/apagado de dispositivo (bridge-generated, pendiente)

| Key canónica | Origen | Estado de implementación |
|---|---|---|
| `kpcl_prendido` | Bridge: primer STATUS tras ausencia | Pendiente en `bridge/src/index.js` |
| `kpcl_apagado` | Bridge: heartbeat detecta offline | Pendiente en `bridge/src/index.js` |

### Aliases legacy (solo trazabilidad histórica — antes del 2026-04-07)

| Alias legacy | Key canónica actual |
|---|---|
| `tare_record` | `tare_con_plato` |
| `food_fill_start` | `inicio_servido` |
| `food_fill_end` | `termino_servido` |
| `plate_weight` | campo `devices.plate_weight_grams` (no es categoría) |

---

## Inconsistencias técnicas pendientes

| # | Problema | Ubicación | Prioridad |
|---|---|---|---|
| 1 | `minDrop` del heurístico (2g) ≠ `SESSION_THRESHOLD_G` del processor (5g) | `today/page.tsx` vs `processor.js` | Media |
| 2 | Hero chart no consume etiquetas `audit_events`, solo usa heurístico | `today/page.tsx` | Alta |
| 3 | `pet_sessions` (processor bridge) no se valida contra `audit_events` | `processor.js` | Alta |
| 4 | Health-check puede escribir eventos duplicados por race condition | `health-check/route.ts` | Media |
| 5 | `plot_kpcl_experimento.py` usa aliases legacy en algunas ramas | `plot_kpcl_experimento.py` | Baja |
| 6 | `battery_level` tiene 100% NaN — hardware no envía el dato aún | KPCL0034 firmware | Baja |

---

## Estado de Data Science

| Fase | Estado | Resultado |
|---|---|---|
| Fase 1 — Extracción | ✅ Completada (Exp 06) | 124,682 filas · 254 eventos · 103+18 sesiones · Apr 8–May 1 |
| Fase 2 — Dataset | ✅ Completada (Exp 06) | 62,880 filas · split extendido hasta May 1 · 12 features |
| Fase 3 — Modelos | ✅ 6 experimentos | Exp 06: Modelo A F1=**0.7619** · Modelo B F1-alim=**0.7606** |
| Fase 4 — Evaluación final | ✅ **Habilitada** (2026-06-13) | Pendiente: eval `X_test` (Apr 28–May 1) |
| Fase 4 — Inferencia | 🔄 En curso | `inferencia_kpcl0034.py` · visual GT vs ML en HTML |
| Fase 4 — Anotación | 🔄 En curso | `app_anotacion.py` Streamlit · agregando etiquetas de servido |

**Siguiente acción:** Ciclo Alpha v2 — rediseño completo con detección de eventos por segmentos (change-point detection). Ver [`ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md`](ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md) para la nueva dirección y [`Ciclo Alpha/Exploracion_Gamma_Delta_2026/APRENDIZAJES_GAMMA_DELTA.md`](Ciclo%20Alpha/Exploracion_Gamma_Delta_2026/APRENDIZAJES_GAMMA_DELTA.md) para los aprendizajes de los ciclos anteriores.

---

## Orden de lectura recomendado

### Para agentes IA (lectura mínima para operar)
1. Este `README.md` — contexto operativo completo del ecosistema
2. [`GLOSARIO.md`](GLOSARIO.md) — devices, features, clases, parámetros, convenciones
3. [`EXPERIMENT_TRACKER.md`](EXPERIMENT_TRACKER.md) — estado de todos los experimentos y métricas
4. [`02_REGLAS_EVENTOS_ALIMENTACION.md`](02_REGLAS_EVENTOS_ALIMENTACION.md) — reglas canónicas de etiquetado

### Para ejecutar o extender el pipeline ML
5. [`Ciclo Alpha/README.md`](Data%20Science/README.md) — guía de ejecución Fase 1→4
6. [`Ciclo Alpha/experiments/README.md`](Data%20Science/experiments/README.md) — índice de experimentos con hitos
7. [`Ciclo Alpha/experiments/exp_07_inferencia_mayo_junio.md`](Data%20Science/experiments/exp_07_inferencia_mayo_junio.md) — experimento activo ★
8. [`Ciclo Alpha/02_PREPARACION_NUEVA_INGESTA.md`](Data%20Science/02_PREPARACION_NUEVA_INGESTA.md) — roadmap Exp 08

### Para categorizar sesiones manualmente
9. [`01_GUIA_DASHBOARD_KPCL.md`](01_GUIA_DASHBOARD_KPCL.md) — cómo usar el dashboard visual
10. [`Ciclo Alpha/fase_4_visualizacion/COMO_EJECUTAR.md`](Data%20Science/fase_4_visualizacion/COMO_EJECUTAR.md) — app Streamlit de anotación

### Para entender los datos
11. [`Data_2026/README.md`](Data_2026/README.md) — índice de dumps disponibles y alertas de calidad
12. [`03_ML_PREDICCION_ALIMENTACION.md`](03_ML_PREDICCION_ALIMENTACION.md) — especificación técnica ML original
