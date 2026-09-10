# Contract: `GET /api/demo/today`

Endpoint público (sin sesión) que sirve, en un solo request, los datos reales y en vivo de la
mascota de demo para que `<TodayScreen mode="demo">` renderice el espejo de `/today`.

**Ruta**: `kittypau_app/src/app/api/demo/today/route.ts`
**Método**: `GET` · **Auth**: ninguna · **Escrituras**: ninguna (solo lectura)

---

## Request

Sin parámetros. El dispositivo de demo lo resuelve el servidor de env
(`DEMO_FOOD_DEVICE_CODE` / `DEMO_WATER_DEVICE_CODE`, ver `src/lib/demo/demo-config.ts`).
Query params ignorados (no hay `?menu=`, no hay `?pet=`).

**Headers relevantes**: `x-forwarded-for` (rate limit por IP).

---

## Rate limiting

`checkRateLimit(\`${getRateKeyFromRequest(req)}:demo-today\`, LIMIT, WINDOW_MS)` con la infra de
`src/app/api/_rate-limit.ts`. Valores a fijar en implementación (referencia: `demo-ingreso` = 5 /
10 min). Sugerido: **30 / 5 min por IP** (el front pollea hunger-bar cada 5 min + carga inicial).
Exceso → `429` con `Retry-After` (mismo patrón que `/api/demo/ingreso`).

---

## Response `200`

`Content-Type: application/json`
`Cache-Control: public, s-maxage=30, stale-while-revalidate=120`

```jsonc
{
  "generatedAt": "2026-09-10T18:53:00.000Z",

  "devices": [
    {
      "device_id": "KPCL0034",
      "device_type": "comedero",
      "battery_level": 87,
      "battery_state": "discharging",
      "last_seen": "2026-09-10T18:52:11.000Z",
      "status": "active"
    },
    {
      "device_id": "KPCL0035",
      "device_type": "bebedero",
      "battery_level": 91,
      "battery_state": "discharging",
      "last_seen": "2026-09-10T18:50:03.000Z",
      "status": "active"
    }
  ],

  "readings": [
    {
      "id": "…", "device_id": "KPCL0034", "recorded_at": "2026-09-10T18:52:11.000Z",
      "weight_grams": 1240, "water_ml": null, "flow_rate": null,
      "temperature": 21.4, "humidity": 55, "light_percent": 40, "battery_level": 87
    }
    // ventana fija suficiente para el gráfico día/noche (mismo shape que GET /api/readings)
    // ordenadas por recorded_at asc; sin cursor de paginación (ver "Limitaciones")
  ],

  "auditEvents": {
    "KPCL0034": [
      { "category": "inicio_alimentacion", "start_at": "…", "end_at": "…", "delta_g": -12, "…": "…" }
    ],
    "KPCL0035": []
    // keyed por device_id KPCL; categorías = TODAY_AUDIT_CATEGORIES de today/page.tsx
  },

  "hungerBar": {
    // ==== shape EXACTO de GET /api/pets/:id/hunger-bar (misma función productora) ====
    "status": "ok",
    "percentage": 62,
    "lastMealDetectedAt": "2026-09-10T18:53:00.000Z",
    "lastMealConfidence": "alta",
    "lastMealIsProvisional": false,
    "lastMealGramos": 11,
    "estimatedNextMealAt": "2026-09-11T00:37:00.000Z",
    "intervalUsedMinutes": 347,
    "usingFallback": false,
    "sampleSize": 214,
    "alertActive": false,
    "hoursOverdue": null,
    "events": [ /* … */ ],
    "kpis": { /* computeConsumoKpis(...) */ }
  },

  "consumoPeriodo": {
    // ==== shape EXACTO de GET /api/pets/:id/consumo-periodo ====
    "status": "ok",
    "semana": { "gramos": 812, "comidas": 19, "diasConDatos": 7, "diasTotales": 7 },
    "mes":    { "gramos": 3480, "comidas": 82, "diasConDatos": 29, "diasTotales": 30 },
    "ventanaDias": 32,
    "truncated": false
  }
}
```

### Invariantes de seguridad (FR-012 / SC-005) — verificables sobre la respuesta

- `devices` tiene **exactamente** los 2 devices de demo. Ningún otro `device_id`.
- Ningún campo expone: `devices.id` (uuid interno), `pet_id`, `pet_name`, `user_id`, datos de
  `profiles`, ni nada de la cuenta `kittypau.mascotas@gmail.com`.
- No hay endpoint para pedir "otro" device: no acepta params. Un test del contrato hace `GET` y
  asserta que `JSON.stringify(body)` no contiene el uuid real de los devices ni "Bandida".

---

## Response degradada `200` (FR-008 / SC-004)

Si el device de comida no resuelve o el cómputo falla, **igual 200** con estado neutro:

```jsonc
{
  "generatedAt": "…",
  "devices": [ /* los que haya, puede ser [] */ ],
  "readings": [],
  "auditEvents": {},
  "hungerBar": {
    "status": "sin_dispositivo", "percentage": null, "lastMealDetectedAt": null,
    "lastMealConfidence": null, "lastMealIsProvisional": false, "estimatedNextMealAt": null,
    "intervalUsedMinutes": null, "usingFallback": false, "sampleSize": 0,
    "alertActive": false, "hoursOverdue": null, "events": [], "kpis": null
  },
  "consumoPeriodo": { "status": "sin_dispositivo" }
}
```

`<TodayScreen>` ya sabe pintar estos estados (mismos que `/today` autenticado).

---

## Response `429`

```json
{ "error": { "code": "RATE_LIMITED", "message": "Too many requests" } }
```
Header `Retry-After: <segundos>`.

---

## Errores 5xx

No se propagan como cuerpo "crudo" hacia la demo. Un fallo real de Supabase se loguea server-side
(`logRequestEnd(req, startedAt, 500)`) y, hacia el cliente, se prefiere la respuesta degradada
`200` de arriba. El front trata cualquier no-200 o red-fail como "datos no disponibles" → estados
vacíos + CTA visible.

---

## Limitaciones conocidas (deuda explícita — FR-016)

1. **Shape del bundle**: este sobre (`devices`/`readings`/`auditEvents`/`hungerBar`/`consumoPeriodo`
   juntos) es específico de la demo. Los **sub-shapes** no lo son (salen de
   `buildHungerBarPayload` / `buildConsumoPeriodoPayload` en `lib/hunger-bar-server.ts`, compartidas
   con las rutas autenticadas). Marcar con `ponytail:` en el route handler.
2. **`readings` sin paginación**: se sirve una ventana fija. En la demo no hay "cargar más"
   histórico (`demoDataSource.loadReadings(cursor)` = no-op). Aceptable para una vista de vistazo.
3. **Si `/today` agrega un fetch nuevo** a un endpoint autenticado distinto, hay que sumar ese dato
   al bundle y a `demoDataSource`. Ese es el único punto de mantenimiento manual; SC-008 se verifica
   con un cambio de prueba en `/today` (quickstart §5).
