# Analisis Economico Kittypau

## Objetivo
Definir un modelo economico operativo para:
- cuantificar costo unitario del kit (BOM + produccion + servicios cloud),
- estimar costo mensual de operacion,
- mostrar en Admin un resumen financiero simple y accionable.

## Alcance (v1)
- Costos por hardware del kit.
- Costos de manufactura (impresion 3D y armado).
- Costos de plataforma (Supabase, Vercel, HiveMQ).
- Costos de logistica y soporte.
- Costo total por unidad y costo mensual total.

No incluye en v1:
- flujo contable formal,
- impuestos por pais,
- depreciacion de activos.

## Variables de produccion (inventario de costos)

### A. Hardware (BOM)
- PCB
- MCU (ej. ESP32)
- Sensor de peso (celda/circuito)
- Sensor ambiental (temp/humedad)
- Bateria
- Cargador/PMIC
- Reguladores, pasivos, conectores
- Cables, tornillos, gomas
- Packaging primario

### B. Manufactura
- Impresion 3D (gramos de filamento + tiempo de maquina)
- Postproceso (lijado, limpieza, ajuste)
- Ensamble electronico
- Calibracion y QA funcional

### C. Operacion cloud
- Supabase (DB + Storage + Auth + Egress)
- Vercel (build + funciones + ancho de banda)
- HiveMQ Cloud (conexion, mensajes, throughput)
- Redis/colas/cron (si aplica)

### D. Operacion comercial
- Envio
- Garantias/reemplazos
- Soporte tecnico
- Comisiones de pago (si aplica)

## Categorizacion de variables
- `direct_fixed_unit`: costo fijo por unidad (ej. PCB).
- `direct_variable_unit`: costo variable por unidad (ej. impresion segun gramos).
- `indirect_monthly_fixed`: costo mensual fijo (ej. plan cloud).
- `indirect_monthly_variable`: costo mensual variable por uso (ej. egress, mensajes extra).

## Modelo de calculo recomendado

### 1) Costo unitario de kit
`costo_unitario_kit = BOM + manufactura + overhead_unitario`

Donde:
- `BOM = suma(componentes por unidad)`
- `manufactura = impresion_3d + ensamblaje + QA`
- `overhead_unitario = (costos_mensuales_totales / unidades_mes)`

### 2) Costo mensual cloud
`cloud_mensual = supabase + vercel + hivemq + otros`

### 3) Costo total mensual
`total_mensual = cloud_mensual + logistica + soporte + garantias`

## Referencia inicial de planes (aprox)
Valores referenciales. Ajustar con factura real de cada proveedor.

- Supabase:
  - plan free: activo/0 USD
  - plan pago: segun proyecto y consumo (DB, storage, egress)
- Vercel:
  - hobby/free: activo/0 USD
  - pro/team: segun uso y equipo
- HiveMQ:
  - free tier: activo/0 USD (si aplica en cuenta actual)
  - pago: segun limite de conexiones/mensajes

## Que debe mostrar el dashboard admin (container final "Resumen de Finanzas")
- Costo unitario estimado (USD).
- Costo mensual cloud actual (USD).
- Costo mensual total estimado (USD).
- Desglose:
  - BOM
  - Manufactura
  - Cloud
  - Logistica/Soporte
- Estado de planes:
  - Supabase: Free/Paid + activo
  - Vercel: Free/Paid + activo
  - HiveMQ: Free/Paid + activo
- Fecha de ultimo calculo.

## Datos minimos requeridos para automatizar
- Tabla de componentes del kit con costo unitario.
- Tabla de costos de manufactura por unidad.
- Tabla de suscripciones cloud (plan, costo mensual, limite, usado).
- Tabla de snapshot mensual de costos.

## Reglas de calidad de dato
- Todo costo en USD base.
- Tipo de cambio separado en tabla de referencia si se muestra CLP.
- Cada snapshot debe guardar fecha de corte.
- No mezclar costos historicos con costos vigentes sin version.

## Roadmap corto
1. Crear tablas SQL de finanzas (BOM, manufactura, suscripciones, snapshots).
2. Cargar seed inicial con costos aproximados.
3. Exponer endpoint `GET /api/admin/finance/summary`.
4. Renderizar container "Resumen de Finanzas" al final del dashboard admin.
5. Ajustar costos con datos reales de proveedores y compras.
