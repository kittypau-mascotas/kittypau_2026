# Diagrama de Arquitectura Actual (Kittypau)

> Nota: Este diagrama esta en Mermaid. Puedes exportarlo a PNG/SVG desde cualquier editor Mermaid.

```mermaid
flowchart LR
  ESP32[ESP32 / Platos IoT] -->|MQTT| HIVE[HiveMQ Cloud]
  HIVE -->|Subscribe| BRIDGE[Raspberry Pi Bridge]
  BRIDGE -->|HTTP POST| API[Vercel API /api/mqtt/webhook]
  API -->|Insert| DB[(Supabase PostgreSQL)]
  DB -->|Realtime| APP[App Web (Next.js)]
```
