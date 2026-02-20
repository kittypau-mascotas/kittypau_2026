# Admin - Container Resumen de Finanzas (Spec Oficial)

## Objetivo
Mostrar una lectura ejecutiva, clara y estable del costo de Kittypau en 4 niveles:
1. costo unitario de fabricacion,
2. costo operativo mensual,
3. impacto por proveedor cloud,
4. impacto por dispositivo KPCL.

## Ubicacion en dashboard
- Seccion Finanzas (bloque 4 del dashboard admin).
- Debe estar visible en modo compacto y expandible en modo detalle.

## Fuentes de datos
- `public.finance_admin_summary`
- `public.finance_provider_plans`
- `public.finance_kit_components`
- `public.finance_monthly_snapshots`
- apoyo operativo: `public.devices`, `public.readings`, `public.sensor_readings`

## KPIs minimos requeridos
- Costo unitario kit (USD y CLP)
- Costo mensual cloud (USD)
- Costo mensual total (USD)
- Overhead unitario (USD)
- Unidades producidas del mes
- MB totales 28d
- Horas online totales 28d
- Ultimo calculo (`last_calculated_at`)

## Proveedores cloud (tabla)
Columnas:
- Proveedor
- Plan
- Estado
- Costo mensual real (USD)
- Costo mensual simulado (USD, si free)
- Uso/Limite

Reglas:
- Si plan = free: mostrar `Free activo` + shadow-pricing.
- Si no hay limites disponibles por API: mostrar `N/D`.

## KPCL (tabla costo por dispositivo)
Columnas:
- KPCL
- Horas totales (28d)
- MB totales (28d)
- Ultima conexion
- Impacto HiveMQ (USD)
- Impacto Vercel (USD)
- OPEX KPCL (USD)

## Formulas oficiales
- `costo_unitario_kit = BOM + manufactura + overhead_unitario`
- `overhead_unitario = costos_mensuales_totales / unidades_mes`
- `hivemq_budget_usd = mb_total * 0.06`
- `vercel_budget_usd = (mb_total * 0.04) + (h_total * 0.01)`
- `hivemq_kpcl_usd = hivemq_budget_usd * (mb_kpcl/mb_total)`
- `vercel_kpcl_usd = vercel_budget_usd * (0.7*mb_kpcl/mb_total + 0.3*h_kpcl/h_total)`
- `opex_kpcl_usd = mantenimiento_mensual + costo_electrico + hivemq_kpcl_usd + vercel_kpcl_usd`

## Formato y calidad
- Moneda base: USD con 2 decimales.
- CLP como conversion secundaria (tipo de cambio operativo vigente).
- Si faltan datos: mostrar `N/D`, nunca romper el dashboard.
- Cache admin recomendado: 30-60s con invalidacion por refresh manual.

## API recomendada
`GET /api/admin/finance/summary`

Respuesta minima:
- `summary`
- `providers[]`
- `kpcl_costs[]`
- `last_calculated_at`
- `fx_reference`

## Criterios de aceptacion
- Renderiza sin error con data parcial.
- Muestra sombra economica para planes free.
- Expone diferencia entre costo real facturado y costo simulado.
- Responde < 500ms con cache habilitado.

## Garantias, reemplazos y break-even
Agregar sub-bloque financiero con:
- costo de garantias del mes (USD),
- tasa de reemplazo (%),
- impacto en overhead unitario (USD),
- variacion del break-even por reemplazos.

Formula operativa:
- `total_mensual = cloud_mensual + logistica + soporte + garantias`
- `overhead_unitario = costos_mensuales_totales / unidades_mes`

Si suben garantias/reemplazos:
- sube overhead,
- baja margen unitario,
- aumenta volumen requerido para break-even.

## KPI de break-even en dashboard
Agregar tarjeta compacta con:
- `Break-even (unidades)`
- `Break-even (meses)`
- `Margen unitario`
- `LTV/CAC` (si modelo SaaS activo)

Condiciones:
- si faltan entradas clave (precio, CAC, churn): mostrar `N/D`.
- recalculo automatico cuando cambien costos de componentes o proveedores.

## KPI de valorizacion SaaS en dashboard
Agregar bloque compacto en Finanzas con:
- `MRR`
- `ARR`
- `ARPU Freemium`
- `LTV/CAC`
- `Valorizacion 6m`
- `Valorizacion 12m`

Formulas:
- `MRR = usuarios_premium * precio_mensual`
- `ARR = MRR * 12`
- `LTV = ARPU * (1/churn)`
- `LTV/CAC = LTV / CAC`
- `valor_saas = ARR * multiplo_saas`

Reglas:
- si no hay datos de suscripcion/CAC/churn, mostrar `N/D`.
- declarar fuente de usuarios (`proxy` o `real`) en el bloque.

