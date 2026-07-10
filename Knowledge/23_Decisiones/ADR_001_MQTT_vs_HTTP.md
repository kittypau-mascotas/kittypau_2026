---
id: adr_001_mqtt_vs_http
title: "ADR-001: HiveMQ + bridge Raspberry vs. REST polling"
type: adr
status: accepted
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - adr
  - mqtt
  - iot
  - arquitectura
related:
  - [[23_Decisiones/MOC_ADR]]
  - [[07_MQTT/README_MQTT]]
  - [[02_Arquitectura/README_Arquitectura]]
---

# ADR-001: HiveMQ + bridge Raspberry vs. REST polling

**Estado:** Accepted  
**Fecha:** 2026 (pre Alpha v2)  
**Área:** IoT / Mensajería

---

## Contexto

El dispositivo KPCL publica lecturas de peso en tiempo real. Se necesita un mecanismo para
recibir esas lecturas en Supabase / la app. HiveMQ Free no ofrece webhooks nativos.

---

## Opciones consideradas

| Opción | Ventaja | Desventaja |
|--------|---------|------------|
| MQTT + bridge Raspberry Pi Zero 2W (elegida) | Baja latencia, push real, bajo consumo | Requiere hardware adicional (RPi) |
| REST polling desde app | Sin hardware extra | Alta latencia, quema batería del dispositivo |
| MQTT + webhook en broker de pago | Más simple operativamente | Costo mensual significativo |

---

## Decisión

Usar HiveMQ Cloud (capa gratuita) como broker MQTT y una Raspberry Pi Zero 2W como bridge.
El bridge suscribe el topic MQTT del dispositivo y hace HTTP POST a `/api/mqtt/webhook` en Vercel,
que inserta en `public.readings`.

---

## Consecuencias

**Positivas:**
- Latencia de ingesta ~1-2 s end-to-end
- Sin polling — bajo consumo en el firmware KPCL
- HiveMQ Free suficiente para el volumen actual

**Negativas / trade-offs:**
- El bridge Raspberry es un punto de fallo único
- Requiere monitoreo de heartbeat (`public.bridge_heartbeats`)
- Setup adicional al desplegar en otro entorno

---

## Ver también

- [[07_MQTT/README_MQTT]]
- [[02_Arquitectura/README_Arquitectura]]
