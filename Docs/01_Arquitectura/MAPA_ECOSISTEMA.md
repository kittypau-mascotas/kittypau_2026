---
tags: [ecosistema, arquitectura, servicios, infraestructura]
area: Arquitectura
estado: activo
actualizado: 2026-06-24
---

# Mapa del Ecosistema Kittypau

## Servicios activos

| Servicio | Rol | Proveedor |
|---|---|---|
| kittypau_app | App web + APK Android | Vercel |
| Supabase (principal) | DB + Auth + Storage | Supabase Cloud |
| Supabase (analytics) | DB analytics separada | Supabase Cloud |
| HiveMQ Cloud | Broker MQTT | HiveMQ |
| Bridge (Raspberry Pi Zero 2W) | MQTT → HTTP relay | Hardware propio |
| Hugging Face | Chatbot Llama 3.1 8B | HF Spaces |
| Upstash Redis | Caché + cron jobs | Upstash |
| Vercel | Hosting + CI/CD | Vercel |

## Repositorios / carpetas del monorepo

```
kittypau_2026_hivemq/
├── kittypau_app/          ← App Next.js (este doc)
├── bridge/                ← Node.js MQTT→Supabase bridge
├── iot_firmware/          ← Firmware hardware KPCL
├── kittypau_iot_firmware/ ← Firmware alternativo
├── supabase/              ← Migraciones DB principal
├── supabase-analytics/    ← Migraciones DB analytics
├── scripts/               ← Scripts mantenimiento DB
├── notebooks/             ← Análisis ML/IA
├── hf-spaces/             ← HuggingFace Spaces (admin + gato)
└── Docs/                  ← Documentación (este vault)
```

## Flujo de datos IoT

```
Sensor KPCL → HiveMQ (MQTT) → Raspberry Bridge → /api/mqtt/webhook → Supabase
```

## Flujo de datos usuario

```
Usuario → App (Next.js) → Supabase Auth → Datos personalizados → UI
```

## Flujo chatbot

```
Usuario → chatbot-gato/ → HF Spaces (Llama 3.1 8B) → Respuesta
```

## Entornos

| Entorno | URL | Branch |
|---|---|---|
| Producción | kittypau.vercel.app | main |
| Preview | vercel preview URLs | PRs |
| Local web | localhost:3000 | local |
| Local mobile | Capacitor + Android Studio | local |

## Links relacionados

- [[ARQUITECTURA_PROYECTO]]
- [[../03_IoT/RASPBERRY_BRIDGE]]
- [[../03_IoT/HIVEMQ_MQTT_CLI]]
- [[../02_App/ESTRUCTURA_APP]]
- [[../05_DevOps/PIPELINE_CICD]]
