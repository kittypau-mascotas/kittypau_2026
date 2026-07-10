---
id: moc_arquitectura
title: MOC — Arquitectura del Sistema
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - moc
  - arquitectura
  - sistema
related:
  - [[00_HOME]]
  - [[02_Arquitectura/README_Arquitectura]]
---

# MOC — Arquitectura del Sistema

---

## Componentes principales

| Documento | Estado | Descripción |
|-----------|--------|-------------|
| [[README_Arquitectura]] | ✅ Activo | Stack completo, flujo de datos, capas de la app |
| [[03_Backend/README_Backend]] | ✅ Activo | Supabase, API Routes, Bridge, módulos lib/ |
| [[04_Frontend/README_Frontend]] | ✅ Activo | Next.js App Router + Capacitor Android |
| [[05_API/README_API]] | ✅ Activo | Contratos de endpoints (verificados contra código) |
| [[06_BaseDatos/README_BaseDatos]] | ✅ Activo | Schema PostgreSQL, migraciones, RLS |
| [[07_MQTT/README_MQTT]] | ✅ Activo | HiveMQ, topics, bridge v3.2 Raspberry |
| [[08_ESP32/README_ESP32]] | ✅ Activo | Firmware KPCL v2.0.0, OTA, hardware |
| [[09_Sensores/README_Sensores]] | ✅ Activo | KPCL0034 "Bandida", calibración de peso |

## Decisiones de arquitectura

| ADR | Decisión |
|-----|----------|
| [[23_Decisiones/ADR_001_MQTT_vs_HTTP]] | HiveMQ + bridge Raspberry |
| [[23_Decisiones/ADR_002_Supabase]] | Supabase como backend principal |

---

## Flujo simplificado

```
KPCL → HiveMQ → Raspberry Bridge → Vercel API → Supabase → App
```

---

## Estado de documentación

- [x] README_Arquitectura (stack + flujo)
- [x] MOC_Arquitectura
- [x] README_Backend (Supabase + API Routes + Bridge)
- [x] README_Frontend (Next.js + Capacitor)
- [x] README_API (contratos de endpoints)
- [x] README_BaseDatos (inventario de tablas)
- [x] README_MQTT (HiveMQ + Bridge Raspberry)
- [x] README_ESP32 (firmware ESP8266/ESP32)
- [x] README_Sensores (KPCL0034 "Bandida")
