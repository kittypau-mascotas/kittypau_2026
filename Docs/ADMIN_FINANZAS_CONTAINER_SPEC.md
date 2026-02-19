# Admin - Container "Resumen de Finanzas" (Especificacion)

## Ubicacion
- Seccion final del dashboard admin (`/admin`).
- Debe mostrarse despues del bloque de operacion KPCL y auditoria.

## Objetivo del container
Mostrar una vista rapida y estable del costo operativo de Kittypau:
- costo unitario estimado del kit,
- costo cloud mensual,
- desglose por proveedor y por categoria,
- estado de planes (free/pago).

## Datos de entrada
- `public.finance_admin_summary` (vista consolidada).
- `public.finance_provider_plans` (detalle por proveedor).
- `public.finance_kit_components` (detalle BOM y manufactura).
- `public.finance_monthly_snapshots` (historico mensual).

## KPI minimos en UI
1. `Costo unitario kit (USD)`  
2. `Costo cloud mensual (USD)`  
3. `Costo mensual total (USD)`  
4. `Unidades producidas (mes)`  
5. `Supabase / Vercel / HiveMQ`:
   - plan (free/pago),
   - estado (activo/inactivo),
   - costo mensual estimado.

## Presentacion recomendada
- Tarjetas compactas (3-6 cards).
- Tabla corta "Proveedores cloud" con:
  - Proveedor
  - Plan
  - Estado
  - Costo mensual (USD)
  - Limite/Uso (texto breve)
- Pie de bloque:
  - `Ultimo calculo` (timestamp),
  - fuente de datos (`manual_seed`, `api`, `snapshot`).

## Reglas de negocio v1
- Si `is_free_plan=true`, mostrar etiqueta "Free activo".
- Si no hay snapshot mensual, mostrar `N/D` en costo mensual total.
- No bloquear dashboard si no existen datos financieros (fallback vacio + mensaje).

## Endpoint sugerido
- `GET /api/admin/finance/summary`
  - auth: admin role
  - response:
    - summary global
    - lista de proveedores
    - ultima fecha de actualizacion

## Criterios de aceptacion
- No rompe el dashboard si tablas financieras estan vacias.
- Valores se ven en USD con 2 decimales.
- Proveedores free aparecen como activos con costo 0.
- Tiempo de respuesta objetivo: < 300 ms con cache corto.
