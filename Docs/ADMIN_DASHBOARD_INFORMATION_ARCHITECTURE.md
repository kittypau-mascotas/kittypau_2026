# Admin Dashboard IA y KPI (Profesional)

Fecha: 2026-02-19

## Objetivo
- Reducir el tiempo de decisiÃ³n operativa del admin.
- Priorizar riesgo y continuidad antes de anÃ¡lisis financiero.
- Mejorar legibilidad en desktop/tablet/mobile.

## JerarquÃ­a recomendada (top-down)
1. Header operativo fijo.
2. Alertas crÃ­ticas activas.
3. KPI ejecutivos (una fila).
4. Continuidad KPCL (grÃ¡fico + tabla lateral).
5. Incidentes 24h.
6. Estado tÃ©cnico (Bridges + KPCL).
7. Registro/onboarding pendiente.
8. Capacidad de plataforma (tablas/vistas + uso de servicios).
9. Finanzas KPCL y BOM.

## KPI oficiales (definiciÃ³n)
- `KPCL Online % = kpcl_online_devices / kpcl_total_devices * 100`.
- `Bridge Salud % = bridge_active / bridge_total * 100`.
- `Outages 24h`.
- `Eventos offline 24h`.
- `Registros completos % = completed / total_profiles * 100`.
- `Supabase usado % = used_mb / plan_mb * 100`.
- `Frescura dashboard = now - effective_ts`: si no hay `summary.generated_at`, usar la última lectura por dispositivo (ver `Docs/FUENTE_DE_VERDAD.md` y `Docs/archive/analitica/KittyPau_Arquitectura_Datos_v3.md`).
- Usar el vocabulario canónico de `Docs/FUENTE_DE_VERDAD.md` para estados, sesiones y ciclos de batería.

## Reglas de UI
- No duplicar KPI en mÃ¡s de un bloque.
- Alertas siempre visibles arriba.
- Tablas pesadas abajo del dashboard.
- Acciones operativas (`Ejecutar chequeo`, `Actualizar`) en la franja superior.

## Responsive
- Desktop (`>=1280`): grilla completa de bloques.
- Tablet (`768-1279`): continuidad arriba, tablas en 1 columna por bloque.
- Mobile (`<768`):
  - Alertas + KPI primero.
  - Continuidad compacta.
  - Tablas con `overflow-x-auto`.
  - Bloques de diagnÃ³stico antes de finanzas.

## MÃ©tricas de calidad del dashboard
- TTFB de `/api/admin/overview`.
- Tiempo a primer render de KPI.
- `x-admin-cache` hit ratio.
- Error rate de endpoints admin.
- Latencia promedio de health-check manual.

## Estado aplicado en esta iteraciÃ³n
- Header sticky con frescura de datos.
- Strip de KPI ejecutivos agregado.
- Reordenamiento visual por prioridad (operaciÃ³n antes de anÃ¡lisis profundo).
- Ajuste de padding/espaciado para mobile-first.
- Modo compacto mobile en Continuidad y Finanzas (cards resumidas, tablas completas en `md+`).


