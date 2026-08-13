---
id: home
title: Kittypau — Alpha Knowledge System
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-12
tags:
  - home
  - navegacion
---

# Kittypau — Alpha Knowledge System

> Fuente única de verdad del proyecto. Si un documento entra en conflicto con este, este gana.
> Este archivo es solo navegación — toda la información técnica vive en los documentos enlazados.

---

## ⚡ Referencia rápida (lo que se busca seguido)

- **Cuentas de prueba, project ID Supabase:** [[20_Testing/README_Testing]] § Cuentas de prueba
- **Estructura de `src/app`, qué hace cada carpeta:** [[04_Frontend/ESTRUCTURA_src_app]]
- **"Barras Sims" (`/today`) es sensible — no agregar nada sin proponerlo antes** (revertido 3 veces en el historial). Ver [[29_Specs/SPEC_04_Metricas_Today_Investigacion]]
- **El JS se despliega solo con cada push a `main` (Vercel), los recursos nativos del APK NO** (plugins, íconos, permisos) — necesitan un APK nuevo compilado e instalado. Ver [[29_Specs/SPEC_06_Mobile_APK_2026]]
- **Los 3 `page.tsx` más grandes** tienen un comentario-mapa al principio del archivo (grepear el nombre de sección, no releer todo): `admin/page.tsx` (~4000 líneas, extracción evaluada y **dejada de lado a propósito**), `today/page.tsx` (~2500), `login/page.tsx` (~1900, sin priorizar)
- **Fórmula del Hunger Bar:** [[05_API/SPEC_HungerBar_Alimentacion]] — alertas/push: [[05_API/SPEC_HungerBar_Alertas]]
- **Qué queda pendiente ahora mismo:** [[29_Specs/README_Specs]] (backlog vivo, se poda solo con lo ya implementado)

---

## Proyecto

- [[01_Proyecto/README_Proyecto]] — Qué está activo, qué es legacy, vocabulario canónico
- [[01_Proyecto/ESTADO_ACTUAL]] — Estado real del producto (2026-06-29)
- [[01_Proyecto/DOC_MAESTRO_DOMINIO]] — Reglas de negocio, estados, contratos API, economía
- [[01_Proyecto/ENUMS_OFICIALES]] — Valores permitidos: fuente única de verdad

---

## Sistema

- [[02_Arquitectura/README_Arquitectura]] — Stack completo y flujo de datos
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

---

## Orden de lectura recomendado para nuevos colaboradores

1. [[01_Proyecto/README_Proyecto]]
2. [[01_Proyecto/ESTADO_ACTUAL]]
3. [[01_Proyecto/DOC_MAESTRO_DOMINIO]]
4. [[02_Arquitectura/README_Arquitectura]]
5. [[06_BaseDatos/README_BaseDatos]]
6. [[13_Features/README_ShapeFeatures]]
7. [[14_Experimentos/EXP_AlphaV2_Pipeline]]
