---
id: readme_knowledge_graph
title: Knowledge Graph — Ontología Kittypau
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - knowledge-graph
  - ontologia
  - entidades
  - relaciones
  - mcp-memory
related:
  - [[00_HOME]]
  - [[26_MCP/README_MCP]]
  - [[27_RAG/README_RAG]]
  - [[09_Sensores/README_Sensores]]
  - [[11_ModelosIA/MOC_ModelosIA]]
---

# Knowledge Graph — Ontología Kittypau

> Mapa de entidades y relaciones del ecosistema Kittypau.
> Fuente para poblar `mcp__memory` — ver [[26_MCP/README_MCP]] sección 4.2.

---

## Entidades

### Sensores / Dispositivos

| Entidad | Tipo | Atributos clave |
|---|---|---|
| `KPCL0034 "Bandida"` | sensor | uuid_abril=9510a455, uuid_mayo_jun=3a460074, sampling=30s |
| `ESP8266` | firmware | sensores: HX711+AHT10+BH1750, OTA, MQTT TLS |
| `Raspberry Pi Zero 2W` | bridge | Bridge v3.2, Node.js, systemd |

### Datos

| Entidad | Tipo | Atributos clave |
|---|---|---|
| `readings.csv` | dataset | estático, 8024 filas, abril 2026, NUNCA modificar |
| `readings_rows.csv` | dataset | dinámico, 94588+ filas, append-only |
| `anotaciones_av2.csv` | dataset | 421 filas (alim=209, serv=45, ruido=167), CRÍTICO |
| `candidatos_av2.csv` | dataset | 421 candidatos (bajada=248, mixto=95, subida=78) |

### Modelos / Algoritmos

| Entidad | Tipo | Atributos clave |
|---|---|---|
| `Motor Matemático v2` | componente | 102 features, F00–F14, numpy/scipy |
| `Evidence Engine` | componente | 23 features, softmax, prior ruido=0.5 |
| `shape_features_v2.py` | archivo | extrae features, evidence_score() |

### Experimentos

| Entidad | Tipo | Atributos clave |
|---|---|---|
| `Alpha v2` | experimento | activo, ciclo fase_0_ruido, 421 anotaciones |
| `Snapshot v2.1` | resultado | baseline actual, alim=209 |
| `Snapshot v2.2` | resultado | pendiente de ejecutar |

### Infraestructura

| Entidad | Tipo | Atributos clave |
|---|---|---|
| `HiveMQ Cloud` | infraestructura | host: cf8e2e...hivemq.cloud, port 8883 TLS |
| `Supabase` | infraestructura | PostgreSQL + Auth + Storage + RLS |
| `Vercel` | infraestructura | deploy Next.js, edge functions |

### Aplicación

| Entidad | Tipo | Atributos clave |
|---|---|---|
| `Next.js App` | frontend | v16.1.6 + React 19.2.3 + Capacitor 8.2.0 |
| `app_anotacion_av2.py` | herramienta | Streamlit, 9 tabs, 3-layer cache |
| `Bridge v3.2` | backend | Node.js, processor.js, direct Supabase write |

---

## Relaciones

```
KPCL0034          → publica_en       → HiveMQ
HiveMQ            → suscrito_por     → Bridge v3.2
Bridge v3.2       → escribe_en       → Supabase (readings)
Bridge v3.2       → escribe_en       → Supabase (audit_events)

readings.csv      → alimenta         → Motor Matemático v2
readings_rows.csv → alimenta         → Motor Matemático v2
Motor Matemático  → extrae           → 102 features (F00–F14)
Evidence Engine   → usa_subset_de    → Motor Matemático v2 (23 features)

Alpha v2          → usa              → readings_rows.csv
Alpha v2          → genera           → candidatos_av2.csv
Alpha v2          → anota            → anotaciones_av2.csv
Alpha v2          → evalúa           → Motor Matemático v2

Snapshot v2.1     → resultado_de     → Alpha v2
Snapshot v2.2     → sucede_a         → Snapshot v2.1

Next.js App       → lee_de           → Supabase (via API Routes)
Next.js App       → escucha          → HiveMQ (useMqttLive.ts)
Next.js App       → compila_como     → Android (Capacitor)

CORFO 2026        → evalua           → Kittypau como proyecto
Kittypau          → categoría        → AIoT PetTech (ciudades inteligentes)
```

---

## Diagrama conceptual

```
[KPCL0034]──publica──▶[HiveMQ]──suscribe──▶[Bridge Pi]──escribe──▶[Supabase]
                                                                        │
                                                                   [readings]
                                                                        │
                                                              [Motor v2]──▶[102 features]
                                                                    │
                                                         [Evidence Engine]──▶[scores]
                                                                    │
                                                              [Alpha v2]──▶[anotaciones]
                                                                    │
                                                             [Snapshots]
```

---

## Cómo poblar mcp__memory

Usar las herramientas disponibles:

```
mcp__memory__create_entities  → crear cada entidad con nombre, tipo, observaciones
mcp__memory__create_relations → crear relaciones entre entidades
mcp__memory__search_nodes     → buscar entidades por texto
mcp__memory__open_nodes       → leer entidades específicas
```

Ejecutar en sesión Claude Code con MCP Memory habilitado. Ver [[26_MCP/README_MCP]] sección 4.2 para el detalle completo.

---

## Ver también

- [[26_MCP/README_MCP]] — configuración del servidor MCP y Memory
- [[09_Sensores/README_Sensores]] — detalles de KPCL0034
- [[11_ModelosIA/MOC_ModelosIA]] — Motor v2 y Evidence Engine
- [[10_Datasets/README_Datasets]] — datasets y sus restricciones
