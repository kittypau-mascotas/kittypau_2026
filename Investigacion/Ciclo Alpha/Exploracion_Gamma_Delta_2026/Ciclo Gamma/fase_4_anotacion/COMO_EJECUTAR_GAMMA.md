# Cómo ejecutar la anotación del Ciclo Gamma

## Abrir la app (inicio rápido)

El venv documentado en `Data Science/venv` ya no existe. Usar el venv de Ciclo Alpha,
que tiene `streamlit` y `plotly` instalados.

**Desde cualquier terminal PowerShell:**

```powershell
& "D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Investigacion\Dashboard_KPCL\Ciclo Alpha\venv\Scripts\Activate.ps1"

streamlit run "D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Investigacion\Dashboard_KPCL\Ciclo Gamma\fase_4_anotacion\app_anotacion.py"
```

Abre `http://localhost:8501` en el navegador.

---


**Fase:** Pre-G (prerequisito de todos los experimentos)
**Herramienta principal:** `app_anotacion_gamma.py` (Streamlit)
**Meta:** ≥80 sesiones de `servido` + ≥200 sesiones de `alimentacion` en `new_annotations_gamma.csv`

Referencia: [instructivo.md](../instructivo.md) §6 | [EXPERIMENT_TRACKER_GAMMA.md](../EXPERIMENT_TRACKER_GAMMA.md)

---

## Por qué la anotación va primero

El error más costoso del Ciclo Alpha fue intentar entrenar con solo 14–27 sesiones de `servido`.
SMOTE fue un parche que generó F1 inestable (0.14–0.50). La anotación no es opcional —
**bloquea todos los experimentos Gamma** hasta cumplir el mínimo.

No se ejecuta ningún script de Fase 1 ni de Fase 3 hasta que `g06_quality_report.py`
pase el assertion de ≥80 sesiones de servido sin errores.

---

## Prerequisitos antes de ejecutar

1. Dump nuevo de Supabase descargado en `Data_2026/`
2. Entorno Python con `streamlit` instalado
3. Dashboard KPCL disponible para revisar candidatos visualmente

---

## Paso 1 — Generar candidatos de servido

Antes de abrir la app de anotación, ejecutar el detector de candidatos:

```powershell
cd "Docs/investigacion/Data Science"
.\venv\Scripts\Activate.ps1

python gamma/fase_4_anotacion/generar_candidatos_servido.py
# Salida: gamma/fase_4_anotacion/data/servido_candidates.csv
```

Este script recorre los dumps disponibles y detecta tramos con subida de peso ≥5g
que no están anotados todavía. Exporta `servido_candidates.csv` con los candidatos
a revisar en la app.

---

## Paso 2 — Ejecutar la app de anotación

```powershell
cd "Docs/investigacion/Data Science"
.\venv\Scripts\Activate.ps1

streamlit run gamma/fase_4_anotacion/app_anotacion_gamma.py
# → Abre http://localhost:8501
```

---

## Uso de la app

### Vista principal

La app muestra:
- **Barra de progreso**: sesiones de `servido` anotadas vs. meta de 80
- **Curva de peso** en hora Santiago (no UTC) con eventos superpuestos
- **Formulario de anotación**: tipo de sesión, inicio, término
- **Panel de candidatos**: tramos sin anotar detectados por `generar_candidatos_servido.py`

### Flujo de anotación por sesión

1. Revisar la curva en hora Santiago — verificar que el eje x muestra hora local.
2. Identificar el tipo de sesión:
   - **Alimentacion**: descenso sostenido del peso (≥3g en ≤60s)
   - **Servido**: subida sostenida del peso (≥5g) — el operador pone comida
   - **Sin_clasificar**: si no queda claro — dejar para revisar después
3. Marcar inicio y término con la herramienta de selección.
4. Confirmar que hay ≥2 lecturas dentro de la ventana.
5. Verificar que `consumido_g > 0` (si es negativo, es error de etiquetado — eliminar).
6. Guardar la anotación → se escribe en `new_annotations_gamma.csv`.

### Criterios de inicio/término (mejorados vs Alpha)

| Sesión | Inicio | Término | Exclusión |
|---|---|---|---|
| `alimentacion` | Primer punto de descenso sostenido (≥3g en ≤60s) | Último punto antes de estabilización (`rolling_std_5 < 1.5g` en ≥3 lecturas) | Si hay subida de peso entre inicio y término → excluir |
| `servido` | Primer punto de subida sostenida ≥5g | Cuando el peso se estabiliza tras llenar (`rolling_std_5 < 1.5g`) | No confundir con recuperación de baseline |

### Prioridad de anotación

1. **Primero servido** — es el cuello de botella. Anotar todos los candidatos de `servido_candidates.csv` antes de pasar a alimentacion adicional.
2. **Luego alimentacion** — hasta llegar a ≥200 sesiones.
3. **`sin_clasificar`** — resolver después de cumplir las metas anteriores.

---

## Paso 3 — Verificar con el dashboard KPCL

Para confirmar visualmente sesiones antes de anotarlas:

```powershell
# Desde la raíz del proyecto
.\Investigacion\Dashboard_KPCL\abrir_kpcl_dashboard.ps1
# → Abre kpcl_pruebas_eventos.html en el navegador
```

El dashboard muestra la curva operativa del bowl con eventos superpuestos.
Útil para distinguir servido de alimentacion en casos ambiguos.

---

## Paso 4 — Verificar progreso

Después de cada sesión de anotación:

```powershell
python -c "
import pandas as pd
df = pd.read_csv('gamma/fase_4_anotacion/data/new_annotations_gamma.csv')
print(df['session_type'].value_counts())
print(f\"\nMeta servido: {len(df[df.session_type=='servido'])}/80\")
print(f\"Meta alim: {len(df[df.session_type=='alimentacion'])}/200\")
"
```

---

## Paso 5 — Ejecutar Fase 1 cuando se alcance la meta

Una vez que la app muestre ≥80 sesiones de servido:

```powershell
cd "Docs/investigacion/Data Science/gamma/fase_1_extraccion/scripts"
python g01_setup_env.py
python g02_get_device_uuid.py
python g03_extract_readings.py
python g04_extract_events.py
python g05_build_sessions.py
python g06_quality_report.py      # ← pasará el assertion de ≥80 serv
```

Revisar OBLIGATORIAMENTE:
- `gamma/fase_1_extraccion/outputs/anomalias_peso.csv`
- `gamma/fase_1_extraccion/outputs/anomalias_sesiones.csv`
- `gamma/fase_1_extraccion/outputs/distribucion_por_periodo.json`

---

## Reglas de anotación (resumen)

1. Siempre mirar la curva en hora **Santiago** — nunca en UTC.
2. Si no queda claro si es `alimentacion` o `servido`: dejar como `sin_clasificar`.
3. Cada sesión de `servido` tiene prioridad máxima.
4. Confirmar que hay ≥2 lecturas dentro de cada ventana antes de cerrar el par.
5. Una sesión con `consumido_g < 0` es un error de etiquetado — eliminar.
6. **No importar `new_annotations.csv` de Alpha automáticamente** — es referencia opcional, no fuente de verdad.

---

## Troubleshooting

| Problema | Solución |
|---|---|
| App no inicia (`ModuleNotFoundError: streamlit`) | `pip install streamlit` dentro del venv |
| Curva muestra UTC en lugar de Santiago | Verificar que `app_anotacion_gamma.py` usa `TZ_LOCAL = "America/Santiago"` |
| `new_annotations_gamma.csv` no existe | La app lo crea al guardar la primera anotación |
| `g06_quality_report.py` falla en assertion | Anotar más sesiones de servido antes de ejecutar Fase 1 |
| Candidatos en `servido_candidates.csv` ya están anotados | Ejecutar `generar_candidatos_servido.py` de nuevo para actualizar la lista |

---

## Referencias

| Documento | Enlace |
|---|---|
| Guía maestra | [../instructivo.md](../instructivo.md) |
| Tracker de experimentos | [../EXPERIMENT_TRACKER_GAMMA.md](../EXPERIMENT_TRACKER_GAMMA.md) |
| Primer experimento | [../experiments/g01_baseline_limpio.md](../experiments/g01_baseline_limpio.md) |
| Taxonomía de eventos | [../../02_REGLAS_EVENTOS_ALIMENTACION.md](../../02_REGLAS_EVENTOS_ALIMENTACION.md) |
