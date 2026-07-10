---
id: readme_glosario
title: Glosario — Vocabulario Canónico Kittypau
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - glosario
  - vocabulario
  - dominio
related:
  - [[00_HOME]]
  - [[01_Proyecto/README_Proyecto]]
---

# Glosario — Vocabulario Canónico Kittypau

> Términos del dominio del proyecto. Cuando un término aparece en código o documentos,
> usa exactamente el nombre definido aquí.

---

## Dispositivos

| Término | Definición |
|---------|-----------|
| `KPCL` | Kittypau Controller — nombre de familia de los dispositivos IoT |
| `KPCL0034` | Dispositivo food bowl "Bandida" — el dispositivo principal de investigación |
| `KPCL0036` | Segundo dispositivo food bowl usado en pruebas comparativas |
| `food_bowl` | Tipo de dispositivo: plato con sensor de peso integrado |
| `Bandida` | Nombre del gato dueño del KPCL0034 |

---

## Datos y pipeline

| Término | Definición |
|---------|-----------|
| `readings` | Lecturas crudas del sensor de peso (timestamp + weight_g) |
| `readings.csv` | Lecturas de Abril 2026. NUNCA modificar — datos estáticos |
| `readings_rows.csv` | Lecturas Mayo-Jun 2026. Append-only desde Supabase |
| `candidato` | Segmento de señal detectado automáticamente como posible evento |
| `anotación` | Etiqueta manual asignada a un candidato por el operador |
| `resampleo 30s` | Proceso de normalizar lecturas a intervalos de 30 segundos (ffill limit=2) |

---

## Categorías de anotación

| Término | Emoji | Definición |
|---------|-------|-----------|
| `alimentacion` | 🍽️ | Bandida comiendo: el peso baja porque el gato consume alimento |
| `servido` | 🫙 | Llenado del plato: el peso sube porque el operador agrega alimento |
| `ruido` | ⚡ | Falsa actividad: variación sin causa real (vibración, interferencia) |
| `ciclo_servido_alimento` | 🟡 | Ciclo completo: un servido seguido de una o más alimentaciones |

---

## Motor Matemático v2

| Término | Definición |
|---------|-----------|
| `feature` | Característica numérica extraída de un segmento de señal |
| `familia de features` | Grupo de features relacionadas (F00–F14) |
| `sep A/S` | Separación pooled-σ entre alimentacion y servido para una feature |
| `sep A/R` | Separación pooled-σ entre alimentacion y ruido para una feature |
| `tpl_*` | Template canónico — correlación con forma prototipo |
| `sim_*` | Similitud global con curva prototipo de categoría |
| `Evidence Engine` | Combinación de 23 features con pesos calibrados + softmax |
| `COMP_STATS` | Diccionario µ/σ/n por feature y categoría, generado por `revisar_anotaciones_v2.py` |

---

## Sistema / Infraestructura

| Término | Definición |
|---------|-----------|
| `activo` | Componente, doc o flujo en uso dentro del producto vigente |
| `legacy` | Componente o referencia antigua que puede seguir existiendo por compatibilidad |
| `archive` | Documento o artefacto histórico que se conserva solo como referencia |
| `ON/OFF` | Estado operativo del dispositivo inferido por actividad de lecturas |
| `power session` | Período continuo de actividad detectada por lecturas |
| `battery cycle` | Período de carga o uso con batería, cuando exista telemetría de energía |
| `bridge` | Raspberry Pi Zero 2W que recibe MQTT y hace POST a la API |
| `heartbeat` | Señal periódica del bridge para indicar que está vivo |
| `snapshot` | Captura de estado de los artefactos en un momento dado (v2.0, v2.1, etc.) |

---

## Ver también

- [[01_Proyecto/README_Proyecto]] — vocabulario canónico oficial del proyecto
- [[13_Features/README_ShapeFeatures]] — terminología del Motor Matemático
