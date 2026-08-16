---
id: plan_knowledge_system
title: Plan de Implementación — Alpha Knowledge System
type: roadmap
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-28
tags:
  - obsidian
  - knowledge-management
  - mcp
  - rag
  - documentacion
related:
  - [[00_HOME]]
  - [[INDEX]]
  - [[FUENTE_DE_VERDAD]]
---

# Plan de Implementación — Alpha Knowledge System

> **Objetivo:** Migrar y organizar toda la documentación del proyecto Kittypau en un vault Obsidian
> estructurado, que sirva como fuente única de verdad y como base para MCP, Knowledge Graph y RAG.

---

## Estado de partida

| Ítem | Estado |
|------|--------|
| Docs existentes en `Docs/` | ~50+ archivos sin frontmatter, sin enlaces consistentes |
| Estructura de carpetas | Parcialmente numerada (00–11), pero sin convención de nombres |
| Vault Obsidian | No creado |
| Frontmatter | Ausente en la mayoría de documentos |
| Wikilinks | No usados (solo rutas relativas markdown) |
| MCP / RAG | No implementado |

---

## Fases de implementación

### Fase 1 — Infraestructura del vault (Semana 1)

**Objetivo:** Crear la estructura de carpetas y los documentos de navegación base.

#### 1.1 Crear el vault Obsidian

```
Ruta: D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Knowledge\
```

Configuración mínima en `.obsidian/`:
- `app.json`: activar wikilinks, desactivar uso de rutas relativas
- `community-plugins`: Dataview, Templater, MetaEdit

#### 1.2 Crear estructura de carpetas

```
Knowledge/
├── 00_HOME.md                    ← Cerebro del vault (solo navegación)
├── 01_Proyecto/                  ← Contexto, objetivos, equipo
├── 02_Arquitectura/              ← Sistema completo MQTT + Supabase + App
├── 03_Backend/                   ← Supabase, Edge Functions, SQL
├── 04_Frontend/                  ← App React Native / Expo
├── 05_API/                       ← Endpoints, contratos
├── 06_BaseDatos/                 ← Schema, migraciones, pgvector
├── 07_MQTT/                      ← HiveMQ, topics, bridge
├── 08_ESP32/                     ← Firmware, sensores, OTA
├── 09_Sensores/                  ← KPCL0034 "Bandida", calibración
├── 10_Datasets/                  ← readings.csv, readings_rows.csv
├── 11_ModelosIA/                 ← Motor v2, Evidence Engine, modelos futuros
├── 12_Matematica/                ← Features F00–F14, fórmulas, pruebas
├── 13_Features/                  ← shape_features_v2, feature atlas
├── 14_Experimentos/              ← Alpha v1, Alpha v2, ciclos
├── 15_Resultados/                ← Snapshots históricos, métricas
├── 16_Papers/                    ← Referencias académicas
├── 17_Mocks/                     ← UI mockups y wireframes
├── 18_UI/                        ← Componentes, pantallas, flujos
├── 19_DevOps/                    ← CI/CD, deploy, Vercel
├── 20_Testing/                   ← Tests, benchmarks, auditorías
├── 21_Roadmap/                   ← Hitos, sprints, Semilla Inicia
├── 22_Reuniones/                 ← Actas y decisiones
├── 23_Decisiones/                ← ADRs
├── 24_Glosario/                  ← Términos del dominio
├── 25_Prompts/                   ← Prompts de IA reutilizables
├── 26_MCP/                       ← Configuración servidor MCP
├── 27_RAG/                       ← Pipeline RAG + embeddings
├── 28_KnowledgeGraph/            ← Ontología y relaciones
└── 99_Archivado/                 ← Docs obsoletos o legacy
```

#### 1.3 Crear 00_HOME.md

Solo navegación. Ningún contenido técnico. Un enlace por área.

#### 1.4 Crear plantillas en `_Templates/`

| Template | Para |
|----------|------|
| `TPL_README.md` | Índices de carpeta |
| `TPL_MOC.md` | Maps of Content |
| `TPL_ADR.md` | Architecture Decision Records |
| `TPL_EXP.md` | Experimentos |
| `TPL_MODEL.md` | Modelos de IA |
| `TPL_DATASET.md` | Datasets |
| `TPL_PAPER.md` | Papers de referencia |
| `TPL_MOCK.md` | Mocks de UI |
| `TPL_MEETING.md` | Actas de reunión |

**Cada template incluye el frontmatter obligatorio prerellenado.**

---

### Fase 2 — Migración de documentos críticos (Semana 2)

**Prioridad:** Mover primero los documentos que más se consultan o que más bloquean trabajo.

#### Orden de migración

| Prioridad | Doc origen | Destino vault | Nombre final |
|-----------|-----------|---------------|--------------|
| 🔴 Alta | `Docs/00_Inicio/FUENTE_DE_VERDAD.md` | `01_Proyecto/` | `README_Proyecto.md` |
| 🔴 Alta | `Docs/01_Arquitectura/ARQUITECTURA_PROYECTO.md` | `02_Arquitectura/` | `README_Arquitectura.md` |
| 🔴 Alta | `09_Investigacion/.../ACTUALIZACION_DATA.md` | `14_Experimentos/` | `EXP_AlphaV2_Pipeline.md` |
| 🔴 Alta | `09_Investigacion/.../HISTORIAL_RESULTADOS.md` | `15_Resultados/` | `RESULT_AlphaV2_Snapshots.md` |
| 🔴 Alta | `shape_features_v2.py` (doc) | `13_Features/` | `README_ShapeFeatures.md` |
| 🟡 Media | `Docs/07_MQTT/` | `07_MQTT/` | `README_MQTT.md` |
| 🟡 Media | `Docs/04_Base_de_Datos/` | `06_BaseDatos/` | `README_BaseDatos.md` |
| 🟡 Media | `Docs/02_App/` | `04_Frontend/` | `README_Frontend.md` |
| 🟢 Baja | `Docs/10_Postulaciones_Fondos/` | `21_Roadmap/` | migrar tal cual |
| 🟢 Baja | Legacy docs en `Kittypau_Legacy/` | `99_Archivado/` | sin renombrar |

#### Proceso por documento

1. Copiar contenido al vault
2. Agregar frontmatter (usar template)
3. Reemplazar rutas relativas por `[[wikilink]]`
4. Verificar que no quede como "huérfano" (al menos un doc lo referencia)
5. Marcar como migrado en el registro de migración (ver sección final)

---

### Fase 3 — Enriquecer con wikilinks y MOCs (Semana 3)

**Objetivo:** Hacer que el grafo Obsidian tenga sentido — documentos conectados, no islas.

#### 3.1 Crear MOCs por área

| MOC | Contenido |
|-----|-----------|
| `MOC_ModelosIA.md` | Motor v2, Evidence Engine, futuros modelos |
| `MOC_Experimentos.md` | Alpha v1, Alpha v2, ciclos, benchmarks |
| `MOC_Datasets.md` | readings, candidatos, anotaciones, features |
| `MOC_Arquitectura.md` | MQTT, Supabase, App, ESP32, Firmware |
| `MOC_Roadmap.md` | Hitos, CORFO, sprints |

#### 3.2 Verificar grafo de Obsidian

- Abrir Graph View en Obsidian
- Identificar nodos sin conexiones (documentos huérfanos)
- Para cada huérfano: agregar referencia en el MOC correspondiente o en `00_HOME.md`

#### 3.3 Crear ADRs para decisiones clave

| ADR | Decisión documentada |
|-----|---------------------|
| `ADR_001_MQTT_vs_HTTP.md` | Por qué HiveMQ en lugar de REST polling |
| `ADR_002_Supabase.md` | Por qué Supabase como backend |
| `ADR_003_MotorMatematico.md` | Por qué numpy/scipy en lugar de sklearn |
| `ADR_004_StreamlitAnnotation.md` | Por qué Streamlit para la app de anotación |
| `ADR_005_AlphaV2_categorias.md` | Las 4 categorías (alim/serv/ruido/ciclo) |

---

### Fase 4 — MCP Server (Semana 4)

**Objetivo:** Exponer el vault como contexto consultable por Claude, Cursor y otros agentes.

#### 4.1 Configurar MCP Filesystem

```json
// ~/.claude/mcp_servers.json
{
  "knowledge": {
    "command": "npx",
    "args": [
      "@modelcontextprotocol/server-filesystem",
      "D:\\Escritorio\\Proyectos\\AIoT_Kittypau\\kittypau_2026_hivemq\\Knowledge"
    ]
  }
}
```

Esto permite a Claude leer/escribir el vault directamente desde conversaciones.

#### 4.2 Configurar MCP Memory (Knowledge Graph)

El servidor `mcp__memory` ya está disponible. Poblar con entidades clave:

```
Entidades principales:
  - KPCL0034 "Bandida" (sensor)
  - Motor Matemático v2 (componente)
  - Evidence Engine (componente)
  - Alpha v2 (experimento)
  - HiveMQ (infraestructura)
  - Supabase (infraestructura)

Relaciones:
  - KPCL0034 → genera → readings.csv
  - Motor v2 → extrae → 102 features
  - Evidence Engine → usa → Motor v2
  - Alpha v2 → usa → Motor v2
```

#### 4.3 Validar acceso desde Claude

Abrir nueva sesión Claude Code y verificar:
```
¿Puedes leer Knowledge/00_HOME.md?
¿Qué ADRs existen?
¿Qué dice MOC_ModelosIA?
```

---

### Fase 5 — RAG con pgvector (Semana 5–6)

**Objetivo:** Búsqueda semántica sobre toda la documentación desde la app y desde agentes.

#### 5.1 Schema en Supabase

```sql
CREATE TABLE knowledge_embeddings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id      text NOT NULL,          -- nombre del archivo
  doc_type    text NOT NULL,          -- type del frontmatter
  chunk_text  text NOT NULL,
  chunk_idx   int  NOT NULL,
  embedding   vector(1536),           -- text-embedding-3-small
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops);
```

#### 5.2 Pipeline de indexación

```python
# scripts/index_knowledge.py
# 1. Lee todos los .md del vault con frontmatter
# 2. Divide en chunks de ~500 tokens con overlap 50
# 3. Genera embeddings (OpenAI text-embedding-3-small)
# 4. Upsert en Supabase por doc_id + chunk_idx
# 5. Log: N docs indexados, N chunks totales
```

#### 5.3 Función de búsqueda

```python
def buscar_knowledge(query: str, n: int = 5) -> list[dict]:
    """Búsqueda semántica sobre el vault. Retorna chunks más relevantes."""
    ...
```

Exponer como herramienta en el MCP server del proyecto.

---

## Registro de migración

Mantener este checklist actualizado a medida que se migran documentos.

### Documentos migrados

| Archivo origen | Destino vault | Frontmatter | Wikilinks | Verificado |
|----------------|---------------|-------------|-----------|------------|
| `FUENTE_DE_VERDAD.md` | `01_Proyecto/README_Proyecto.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `ARQUITECTURA_PROYECTO.md` | `02_Arquitectura/README_Arquitectura.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `ACTUALIZACION_DATA.md` | `14_Experimentos/EXP_AlphaV2_Pipeline.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `HISTORIAL_RESULTADOS.md` | `15_Resultados/RESULT_AlphaV2_Snapshots.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `shape_features_v2.py` (doc) | `13_Features/README_ShapeFeatures.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `ARQUITECTURA_APP.md` | `14_Experimentos/EXP_AlphaV2_AppArq.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `RECOPILACION_DATOS_APP.md` | `13_Features/ATLAS_Features_v2.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `TOPICOS_MQTT.md` + `RASPBERRY_BRIDGE.md` | `07_MQTT/README_MQTT.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `AUDITORIA_DB_TABLAS.md` | `06_BaseDatos/README_BaseDatos.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `ESTRUCTURA_APP.md` | `04_Frontend/README_Frontend.md` | ✅ | ✅ | ✅ 2026-06-28 |
| API Routes (multi-fuente) | `05_API/README_API.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `FIRMWARE_ESP8266.md` | `08_ESP32/README_ESP32.md` | ✅ | ✅ | ✅ 2026-06-28 |
| KPCL0034 (multi-fuente) | `09_Sensores/README_Sensores.md` | ✅ | ✅ | ✅ 2026-06-28 |
| readings / candidatos / anotaciones | `10_Datasets/README_Datasets.md` | ✅ | ✅ | ✅ 2026-06-28 |
| Bridge + API Routes | `03_Backend/README_Backend.md` | ✅ | ✅ | ✅ 2026-06-28 |

| `Contexto_Mercado/` (01–06) | `21_Roadmap/README_Estrategia_Mercado.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `CORFO_SEMILLA_INICIA_2026/` | `21_Roadmap/README_CORFO_Semilla2026.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `DOC_MAESTRO_DOMINIO.md` | `01_Proyecto/DOC_MAESTRO_DOMINIO.md` | ✅ | ✅ | ✅ 2026-06-28 |
| `ENUMS_OFICIALES.md` | `01_Proyecto/ENUMS_OFICIALES.md` | ✅ | ✅ | ✅ 2026-06-28 |

### Documentos creados (Fase 3 — carpetas vacías pobladas)

| Carpeta | Archivo creado | Tipo | Fecha |
|---------|---------------|------|-------|
| `12_Matematica/` | `README_Matematica.md` | math | 2026-06-28 |
| `16_Papers/` | `README_Papers.md` | knowledge | 2026-06-28 |
| `17_Mocks/` | `README_Mocks.md` | knowledge | 2026-06-28 |
| `18_UI/` | `README_UI.md` | frontend | 2026-06-28 |
| `19_DevOps/` | `README_DevOps.md` | knowledge | 2026-06-28 |
| `20_Testing/` | `README_Testing.md` | knowledge | 2026-06-28 |
| `22_Reuniones/` | `README_Reuniones.md` | knowledge | 2026-06-28 |
| `25_Prompts/` | `README_Prompts.md` | knowledge | 2026-06-28 |
| `26_MCP/` | `README_MCP.md` | knowledge | 2026-06-28 |
| `27_RAG/` | `README_RAG.md` | knowledge | 2026-06-28 |
| `28_KnowledgeGraph/` | `README_KnowledgeGraph.md` | knowledge | 2026-06-28 |
| `99_Archivado/` | `README_Archivado.md` | knowledge | 2026-06-28 |

### Documentos pendientes

Vault completo — todas las carpetas pobladas.

| Archivo | Notas |
|---------|-------|
| Alpha v1 (histórico) | Mover desde `Docs/` a `99_Archivado/` — sin urgencia |
| Snapshot v2.2 | Ejecutar `revisar_anotaciones_v2.py` tras anotar — actualizar `ATLAS_Features_v2.md` |
| `MODEL_MotorMatematico.md` | Crear en `11_ModelosIA/` — detalle completo del Motor v2 |
| `MODEL_EvidenceEngine.md` | Crear en `11_ModelosIA/` — pesos calibrados + softmax |

---

## Criterios de éxito

| Criterio | Medición |
|----------|----------|
| Todo doc tiene frontmatter | `grep -rL "^---" Knowledge/` devuelve vacío |
| Ningún doc huérfano | Graph View sin nodos aislados |
| HOME enlaza a todo | `00_HOME.md` tiene link a cada carpeta |
| MCP funciona | Claude puede responder preguntas leyendo el vault |
| RAG indexado | `knowledge_embeddings` tiene >200 chunks |
| Búsqueda semántica | Query "¿qué feature discrimina mejor alimentación?" devuelve `tpl_doble_rampa` |

---

## Principios a respetar durante la migración

1. **No mezclar** — un doc, un propósito
2. **No huérfanos** — todo referenciado desde al menos un MOC o desde HOME
3. **No información técnica en HOME** — solo navegación
4. **Wikilinks, nunca rutas relativas**
5. **Frontmatter siempre** — mínimo: `id`, `title`, `type`, `status`, `updated`
6. **Si no puede responder "¿por qué existe?"** → eliminar o fusionar

---

## Ver también

- [[FUENTE_DE_VERDAD]] — fuente única de verdad actual del proyecto
- [[INDEX]] — índice de documentos existentes en Docs/
- [[PLAN_MAESTRO]] — roadmap de producto Kittypau
