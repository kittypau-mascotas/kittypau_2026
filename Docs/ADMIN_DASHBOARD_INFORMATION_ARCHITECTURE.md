# Admin Dashboard IA y KPI (Profesional)

Fecha: 2026-02-19

## Objetivo
- Reducir el tiempo de decisión operativa del admin.
- Priorizar riesgo y continuidad antes de análisis financiero.
- Mejorar legibilidad en desktop/tablet/mobile.

## Jerarquía recomendada (top-down)
1. Header operativo fijo.
2. Alertas críticas activas.
3. KPI ejecutivos (una fila).
4. Continuidad KPCL (gráfico + tabla lateral).
5. Incidentes 24h.
6. Estado técnico (Bridges + KPCL).
7. Registro/onboarding pendiente.
8. Capacidad de plataforma (tablas/vistas + uso de servicios).
9. Finanzas KPCL y BOM.

## KPI oficiales (definición)
- `KPCL Online % = kpcl_online_devices / kpcl_total_devices * 100`.
- `Bridge Salud % = bridge_active / bridge_total * 100`.
- `Outages 24h`.
- `Eventos offline 24h`.
- `Registros completos % = completed / total_profiles * 100`.
- `Supabase usado % = used_mb / plan_mb * 100`.
- `Frescura dashboard = now - summary.generated_at`.

## Reglas de UI
- No duplicar KPI en más de un bloque.
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
  - Bloques de diagnóstico antes de finanzas.

## Métricas de calidad del dashboard
- TTFB de `/api/admin/overview`.
- Tiempo a primer render de KPI.
- `x-admin-cache` hit ratio.
- Error rate de endpoints admin.
- Latencia promedio de health-check manual.

## Estado aplicado en esta iteración
- Header sticky con frescura de datos.
- Strip de KPI ejecutivos agregado.
- Reordenamiento visual por prioridad (operación antes de análisis profundo).
- Ajuste de padding/espaciado para mobile-first.
- Modo compacto mobile en Continuidad y Finanzas (cards resumidas, tablas completas en `md+`).
