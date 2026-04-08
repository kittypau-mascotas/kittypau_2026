# Health Check del Bridge (Raspberry)

## Objetivo
Detectar caída del bridge y alertar si no hay tráfico en tiempo esperado.

## Señales mínimas
- Último `last_seen` de dispositivos.
- Último `reading_ingested` en `audit_events`.
- Heartbeat explícito del bridge (opcional).

## Estrategia MVP (sin new services)
1. **Heartbeat**: bridge envía cada 60s un `POST /api/bridge/heartbeat` (nuevo endpoint simple).
2. **Verificación**: cron en Vercel cada 5 min valida último heartbeat.
3. **Alerta**: si >5 min sin heartbeat, log + notificación (email/Slack).

## Datos esperados (heartbeat)
```json
{
  "bridge_id": "rasp-01",
  "ip": "192.168.1.10",
  "uptime_sec": 123456,
  "mqtt_connected": true,
  "last_mqtt_at": "2026-02-08T12:00:00Z"
}
```

## Regla de alerta
- Estado OK: último heartbeat <= 2 min.
- Warning: 2-5 min.
- Critical: >5 min (bridge down).

## Checklist de implementación
- Crear endpoint `POST /api/bridge/heartbeat` (server-only).
- Guardar `bridge_id`, `last_seen`, `mqtt_connected`, `last_mqtt_at`.
- Crear `cron` Vercel: `/api/bridge/health-check`.
- Documentar canal de alertas (Slack/email).

## Nota
Si no se implementa heartbeat, usar `audit_events` + `readings` como señal secundaria.
