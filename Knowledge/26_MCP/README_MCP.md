---
id: readme_mcp
title: MCP Server — Configuración y Uso
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - mcp
  - claude
  - filesystem
  - knowledge-graph
related:
  - [[00_HOME]]
  - [[27_RAG/README_RAG]]
  - [[28_KnowledgeGraph/README_KnowledgeGraph]]
  - [[25_Prompts/README_Prompts]]
---

# MCP Server — Configuración y Uso

> Estado: **ACTIVO** desde 2026-06-28.
> El MCP Filesystem ya lee el vault completo — directorio raíz del proyecto incluye `Knowledge/`.
> Directorio configurado: `D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq`

---

## ¿Qué es MCP en este contexto?

MCP (Model Context Protocol) permite a Claude leer y escribir archivos del vault directamente, sin necesidad de copiar-pegar contenido en cada conversación. Una vez configurado:

```
Claude Code → MCP Filesystem → Knowledge/*.md → respuestas con contexto real
```

---

## 4.1 — MCP Filesystem

Permite a Claude leer (y opcionalmente escribir) cualquier `.md` del vault.

### Instalación

```bash
npm install -g @modelcontextprotocol/server-filesystem
```

### Configuración

Agregar a `~/.claude/mcp_servers.json` (Windows: `%USERPROFILE%\.claude\mcp_servers.json`):

```json
{
  "mcpServers": {
    "knowledge": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-filesystem",
        "D:\\Escritorio\\Proyectos\\AIoT_Kittypau\\kittypau_2026_hivemq\\Knowledge"
      ]
    }
  }
}
```

> **Solo lectura recomendado en principio.** Para habilitar escritura, agregar flag `--allow-write`.

### Validar acceso

Abrir nueva sesión Claude Code y verificar:

```
¿Puedes leer Knowledge/00_HOME.md?
¿Qué ADRs existen en 23_Decisiones/?
¿Cuál es la feature más discriminativa según ATLAS_Features_v2?
```

---

## 4.2 — MCP Memory (Knowledge Graph)

El servidor `mcp__memory` ya está disponible en el entorno. Poblar con las entidades clave del proyecto.

### Entidades a crear

```
Tipo: sensor
  - KPCL0034 "Bandida"
    - uuid_abril: 9510a455-...
    - uuid_mayo_jun: 3a460074-...
    - sampling: 30s
    - sensores: HX711 + AHT10 + BH1750

Tipo: componente
  - Motor Matemático v2
    - features: 102
    - familias: F00-F14
    - archivo: shape_features_v2.py

  - Evidence Engine
    - features: 23
    - mejor_discriminador: tpl_doble_rampa (7.63σ)
    - prior: ruido=0.5, alim=0.0, serv=0.0

Tipo: experimento
  - Alpha v2
    - estado: activo
    - anotaciones: 421 (alim=209, serv=45, ruido=167)
    - snapshot_actual: v2.1

Tipo: infraestructura
  - HiveMQ Cloud
    - host: cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud
    - port: 8883 (TLS)
  - Supabase
    - url: ver .env
    - proyecto: Kittypau
```

### Relaciones a crear

```
KPCL0034         → genera_datos      → readings.csv
KPCL0034         → genera_datos      → readings_rows.csv
Motor v2         → extrae_features   → 102 features F00-F14
Evidence Engine  → usa               → Motor v2 (subset 23 features)
Alpha v2         → usa               → Motor v2
Alpha v2         → usa               → anotaciones_av2.csv
HiveMQ           → recibe_de         → KPCL0034
Bridge Pi        → escribe_en        → Supabase
Bridge Pi        → suscribe_a        → HiveMQ
```

### Comando para poblar (usando mcp__memory)

```python
# Ver herramientas: mcp__memory__create_entities, mcp__memory__create_relations
# Ejecutar en sesión Claude Code con MCP Memory disponible
```

---

## 4.3 — Uso desde Claude Code

Una vez configurado el MCP Filesystem, en cualquier sesión:

```
# Claude puede leer directamente:
"Revisa Knowledge/13_Features/ATLAS_Features_v2.md y dime cuál feature tiene mayor sep_AS"

# Sin necesidad de copiar el archivo en el chat
```

---

## Chequeo previo

| Requisito | Estado |
|---|---|
| Node.js instalado | Verificar con `node --version` |
| `@modelcontextprotocol/server-filesystem` instalado | `npm list -g` |
| `mcp_servers.json` creado | Ver ruta arriba |
| Vault en ruta correcta | `Knowledge/` existe con 40+ archivos |
| Claude Code reiniciado tras config | Necesario para leer nueva config MCP |

---

## Ver también

- [[27_RAG/README_RAG]] — búsqueda semántica como complemento al MCP
- [[28_KnowledgeGraph/README_KnowledgeGraph]] — ontología completa de entidades
- [[25_Prompts/README_Prompts]] — prompts diseñados para usar con MCP activo
