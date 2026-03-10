# Arquitectura del Proyecto — KViejos (Fase 2)

## Objetivo
Reusar la arquitectura ya probada en Kittypau para acelerar KViejos:
- Frontend: Next.js (web/app)
- Backend: Next.js API routes
- DB: Supabase Postgres
- IoT/Edge: Bridge (Raspberry Pi) + MQTT
- APK: Capacitor (modo nativo)

## Capas
1. Sensores (ESP32 / Zigbee / BLE / WiFi)
2. Hub/Bridge local (Raspberry Pi)
3. Cloud (Supabase + API)
4. Interfaces:
   - App (familia)
   - Admin (operacion y soporte)
   - TV overlay (dispositivo target)

## Reuso directo del repo Kittypau
Ver [RECURSOS_TECNICOS_REUTILIZABLES.md](RECURSOS_TECNICOS_REUTILIZABLES.md).

## Modelo operacional (alto nivel)
- Los sensores publican eventos al bridge.
- El bridge normaliza eventos y los manda a la nube (MQTT/HTTP).
- La nube persiste eventos, aplica reglas y crea alertas.
- La app muestra estado e historial; la TV recibe overlays.

