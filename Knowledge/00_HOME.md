---
id: home
title: Kittypau — Alpha Knowledge System
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-14
tags:
  - home
  - navegacion
---

# Kittypau — Alpha Knowledge System

> Fuente única de verdad del proyecto. Si un documento entra en conflicto con este, este gana.
> Este archivo es solo navegación — toda la información técnica vive en los documentos enlazados.

---

## 💻 Entorno de trabajo — 2 PCs (Mauro + Javier)

Este proyecto se trabaja desde dos máquinas distintas, cada una con su propia sesión de
Claude Code sobre el mismo repo remoto (`github.com/kittypau-mascotas/kittypau_2026`) —
protocolo completo de sincronización en [[19_DevOps/README_DevOps]] § "Trabajo en 2 PCs".

| PC | Identidad git | Ruta raíz del repo |
|---|---|---|
| **Mauro** (esta sesión la identificó, 2026-08-14) | `Mauro Curcuma` | `D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq` |
| **Javier** | — | `C:\Kittypau\GitHub_KP\kittypau_2026` (inferido del valor original de `MEMORY_FILE_PATH` en `.mcp.json`, antes de reemplazarlo por un placeholder el 2026-08-14 — **sin confirmar desde su propia sesión todavía**, ver instrucción abajo) |

> El nombre de carpeta local difiere entre PCs (`kittypau_2026_hivemq` vs `kittypau_2026`) —
> normal, cada clone puede tener su propio nombre de carpeta local. Lo que importa es que
> ambas apunten al mismo remoto — confirmar con `git remote -v` si hay dudas.

### Instrucción para la próxima sesión de Claude Code en la PC de Javier

Pegar esto al arrancar sesión ahí, para dejar la vinculación entre las 2 PCs completa y
verificada de los dos lados:

```
Confirmá la ruta raíz real de este repo en esta máquina (pwd) y actualizá la fila "Javier"
de la tabla en Knowledge/00_HOME.md § "Entorno de trabajo — 2 PCs" con el valor real y la
identidad de git de esta máquina (hoy la ruta está inferida, no confirmada desde acá).

Después, aplicá el patrón de la regla 9 de Knowledge/19_DevOps/README_DevOps.md §
"Trabajo en 2 PCs" sobre .mcp.json (el placeholder de MEMORY_FILE_PATH que dejó la PC de
Mauro el 2026-08-14 te va a romper el MCP de memory hasta que hagas esto):
1. git update-index --skip-worktree .mcp.json
2. Editá tu .mcp.json local con tu ruta real de MEMORY_FILE_PATH (la que tenías antes de
   que se reemplazara por el placeholder)
3. Confirmá con git status que el archivo ya no aparece como modificado

Avisale a Mauro cuando esté listo.
```

---

## ⚡ Referencia rápida (lo que se busca seguido)

- **Cuentas de prueba, project ID Supabase:** [[20_Testing/README_Testing]] § Cuentas de prueba
- **Estructura de `src/app`, qué hace cada carpeta:** [[04_Frontend/ESTRUCTURA_src_app]]
- **"Barras Sims" (`/today`) es sensible — no agregar nada sin proponerlo antes** (revertido 3 veces en el historial). Ver [[29_Specs/SPEC_04_Metricas_Today_Investigacion]]
- **El JS se despliega solo con cada push a `main` (Vercel), los recursos nativos del APK NO** (plugins, íconos, permisos) — necesitan un APK nuevo compilado e instalado. Ver [[29_Specs/SPEC_06_Mobile_APK_2026]]
- **Los 3 `page.tsx` más grandes** tienen un comentario-mapa al principio del archivo (grepear el nombre de sección, no releer todo): `admin/page.tsx` (~4000 líneas, extracción evaluada y **dejada de lado a propósito**), `today/page.tsx` (~2500), `login/page.tsx` (~1900, sin priorizar)
- **Fórmula del Hunger Bar:** [[05_API/SPEC_HungerBar_Alimentacion]] — alertas/push: [[05_API/SPEC_HungerBar_Alertas]]
- **Qué queda pendiente ahora mismo:** [[29_Specs/README_Specs]] (backlog vivo, se poda solo con lo ya implementado)
- **⚠️ La DB de analytics (`pet_sessions`/`pet_daily_summary`) parece haber sido eliminada** (DNS no resuelve, verificado 2026-08-14) — bloquea `/story` y [[29_Specs/SPEC_11_Resumen_Consumo_Today]]. Ver [[02_Arquitectura/ARQ_Pipeline_End_to_End]] §3.2

---

## Proyecto

- [[01_Proyecto/README_Proyecto]] — Qué está activo, qué es legacy, vocabulario canónico
- [[01_Proyecto/ESTADO_ACTUAL]] — Estado real del producto (2026-06-29)
- [[01_Proyecto/DOC_MAESTRO_DOMINIO]] — Reglas de negocio, estados, contratos API, economía
- [[01_Proyecto/ENUMS_OFICIALES]] — Valores permitidos: fuente única de verdad

---

## Sistema

- [[02_Arquitectura/README_Arquitectura]] — Stack completo y flujo de datos
- [[02_Arquitectura/ARQ_Pipeline_End_to_End]] — Firmware → Bridge → 2 DBs Supabase → Backend → Frontend → App móvil, las 6 capas trazadas como una sola cadena, con hallazgo crítico: DB de analytics no resuelve DNS
- [[02_Arquitectura/MOC_Arquitectura]] — Mapa de todos los componentes
- [[03_Backend/README_Backend]] — Supabase, Edge Functions, API Routes
- [[04_Frontend/README_Frontend]] — App Next.js + Capacitor Android
- [[04_Frontend/ESTRUCTURA_src_app]] — función de cada carpeta de `src/app`, carpeta por carpeta
- [[05_API/README_API]] — Contratos de endpoints
- [[06_BaseDatos/README_BaseDatos]] — Schema, migraciones, pgvector
- [[07_MQTT/README_MQTT]] — HiveMQ, topics, bridge Raspberry
- [[08_ESP32/README_ESP32]] — Firmware, OTA, hardware KPCL
- [[09_Sensores/README_Sensores]] — KPCL0034 "Bandida", calibración

---

## Datos e Investigación

- [[10_Datasets/README_Datasets]] — readings.csv + readings_rows.csv
- [[11_ModelosIA/MOC_ModelosIA]] — Motor v2, Evidence Engine, modelos futuros
- [[12_Matematica/README_Matematica]] — Fórmulas, familias de features F00–F14
- [[13_Features/README_ShapeFeatures]] — shape_features_v2.py, 102 features
- [[14_Experimentos/MOC_Experimentos]] — Alpha v1, Alpha v2, ciclos
- [[15_Resultados/RESULT_AlphaV2_Snapshots]] — Snapshots históricos v2.0–v2.2
- [[15_Resultados/MOC_Resultados]] — Índice de métricas y comparativas
- [[16_Papers/README_Papers]] — Referencias académicas

---

## Producto

- [[17_Mocks/README_Mocks]] — UI mockups y wireframes
- [[18_UI/README_UI]] — Componentes, pantallas, flujos
- [[18_UI/Componentes/README_Componentes]] — Doc por componente (objetivo, props, métricas) a medida que se extraen de las páginas
- [[18_UI/UX_DIAGNOSTICO_2026_06_30]] — Diagnóstico UX/UI completo: 5 críticos, 10 importantes, 8 calidad
- [[19_DevOps/README_DevOps]] — CI/CD, Vercel, deploy
- [[20_Testing/README_Testing]] — Tests, benchmarks, auditorías

---

## Gestión

- [[21_Roadmap/README_Estrategia_Mercado]] — ICP, competencia, modelo de negocio, KPIs
- [[21_Roadmap/README_CORFO_Semilla2026]] — Postulación CORFO Semilla Inicia RM 2026
- [[22_Reuniones/README_Reuniones]] — Actas y decisiones
- [[23_Decisiones/MOC_ADR]] — Architecture Decision Records
- [[24_Glosario/README_Glosario]] — Vocabulario canónico del dominio

---

## IA y Knowledge

- [[25_Prompts/README_Prompts]] — Prompts reutilizables para Claude / Cursor
- [[26_MCP/README_MCP]] — Configuración MCP Server
- [[27_RAG/README_RAG]] — Pipeline RAG + embeddings + pgvector
- [[28_KnowledgeGraph/README_KnowledgeGraph]] — Ontología y relaciones

---

## Auditorías

- [[AUDITORIA_2026_08_11]] — Auditoría vigente: Knowledge vs código + recorrido en vivo con Playwright (2026-08-11)
- [[AUDITORIA_2026_06_29]] — Auditoría anterior, histórica (2026-06-29)
- [[18_UI/UX_DIAGNOSTICO_2026_06_30]] — Diagnóstico UX/UI completo (2026-06-30)

---

## Specs — Roadmap (desde 2026-08-11)

- [[29_Specs/README_Specs]] — índice y cómo se relacionan los specs
- [[29_Specs/SPEC_01_Errores_Prioritarios]] — bugs confirmados en vivo, priorizados
- [[29_Specs/SPEC_02_UIUX_Mejoras]] — mejoras de UI/UX y patrones a generalizar
- [[29_Specs/SPEC_03_Objetivos_Monitoreo]] — gap real por pilar: alimentación / hidratación / alertas / confianza en datos
- [[29_Specs/SPEC_04_Metricas_Today_Investigacion]] — qué métricas de `fase_0_ruido` están respaldadas para llevar a `/today`
- [[29_Specs/SPEC_05_Optimizacion_Tecnica]] — seguridad (CVEs de Next.js), rate limiting, testing, duplicación de código, bridge
- [[29_Specs/SPEC_06_Mobile_APK_2026]] — Android 16 (deadline 31/08/2026), plugins Capacitor recomendados, UX móvil 2026
- [[29_Specs/SPEC_07_Investigacion_Hidratacion]] — reorganización de `Docs/09_Investigacion` + roadmap para replicar el pipeline de comida del lado de agua
- [[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]] — bug crítico: KPCL0035 (bebedero) reportaba `device_type='comedero'`, rompía Hunger Bar/`/bowl`/`/today` — causa raíz en firmware/bridge, fix aplicado como override en `kittypau_app`
- [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] — handoff para cerrar SPEC_08 en la fuente (bridge + firmware, requiere acceso a Raspberry/OTA) + hallazgo nuevo en `processor.js` + mejoras de seguridad
- [[29_Specs/SPEC_10_Vinculacion_Dispositivo_Lista_Real]] — vincular dispositivo en el registro debe mostrar la lista real de `devices` (Supabase), no pedir tipear un código — pre-lanzamiento la lista es acotada y conocida
- [[29_Specs/SPEC_11_Resumen_Consumo_Today]] — totales de comida/agua día/semana/mes en `/today` — ⚠️ premisa en duda: la DB de origen (`pet_sessions`/`pet_daily_summary`) parece eliminada, ver [[02_Arquitectura/ARQ_Pipeline_End_to_End]] §3.2
- [[29_Specs/SPEC_12_Recrear_Analytics_DB]] — confirmado por Mauro: la DB de analytics se eliminó a propósito (consumía mucho storage) — schema exacto + checklist de reconexión + plan de retención, listo para ejecutar cuando se decida

---

## Orden de lectura recomendado para nuevos colaboradores

1. [[01_Proyecto/README_Proyecto]]
2. [[01_Proyecto/ESTADO_ACTUAL]]
3. [[01_Proyecto/DOC_MAESTRO_DOMINIO]]
4. [[02_Arquitectura/README_Arquitectura]]
5. [[06_BaseDatos/README_BaseDatos]]
6. [[13_Features/README_ShapeFeatures]]
7. [[14_Experimentos/EXP_AlphaV2_Pipeline]]
