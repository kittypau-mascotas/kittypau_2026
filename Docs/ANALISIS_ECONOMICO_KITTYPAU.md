# Analisis Economico Operativo Kittypau

## 1. Objetivo
Definir un modelo unico, auditable y accionable para calcular:
- costo unitario del kit (KPCL),
- costo operativo mensual total (OPEX),
- impacto economico por dispositivo,
- lectura ejecutiva en dashboard admin.

Este documento es la referencia oficial para formulas, fuentes y supuestos.

## 2. Alcance y no alcance
### Incluye
- BOM (Bill of Materials) por perfil de hardware.
- Manufactura (impresion 3D, ensamblaje, postproceso, QA).
- Costos cloud (Supabase, Vercel, HiveMQ).
- Costos comerciales/operativos (envio, soporte, garantias).
- Shadow-pricing para planes free.

### No incluye (v1)
- contabilidad tributaria formal,
- depreciacion contable de activos,
- valuacion financiera legal de empresa.

## 3. Costo unitario del kit
Formula base:
`costo_unitario_kit = BOM + manufactura + overhead_unitario`

Donde:
- `BOM`: suma de componentes fisicos por unidad.
- `manufactura`: impresion 3D + ensamblaje + postproceso + QA.
- `overhead_unitario`: prorrateo de costos mensuales.

Overhead:
`overhead_unitario = costos_mensuales_totales / unidades_mes`

## 4. BOM (desglose operativo)
Categorias BOM:
- microcontrolador (NodeMCU v3 CP2102, ESP32-CAM, u otro perfil),
- sensores (celda de carga, HX711, temp/humedad),
- energia/electronica (PCB, reguladores, PMIC/cargador, conectores),
- ensamblaje mecanico (cables, tornillos, gomas),
- cuerpo 3D,
- packaging primario.

Referencia filamento:
- PLA+ eSUN 1kg,
- costo compra: CLP 16.000 (incluye envio),
- costo referencia: CLP 16/g,
- conversion referencia: `0.0168 USD/g` usando `1 USD = 950 CLP`.

## 5. Manufactura
`manufactura = costo_impresion_3d + ensamblaje + postproceso + qa_funcional`

Impresion 3D:
- variable por gramos de filamento,
- variable por tiempo de maquina,
- puede incluir factor de merma si aplica.

## 6. Costos operativos mensuales
### 6.1 Cloud
`cloud_mensual = supabase + vercel + hivemq + otros`

### 6.2 Comercial/soporte
`operacion_comercial = logistica + soporte + garantias + comisiones_pago`

### 6.3 Total mensual
`total_mensual = cloud_mensual + operacion_comercial`

## 7. Shadow-pricing para planes free
Cuando proveedor esta en plan free (costo facturado 0), se calcula costo simulado por uso real para evitar subestimar OPEX.

Ventana operativa estandar:
- 28 dias para KPCL (horas y MB por dispositivo),
- corte mensual para reportes ejecutivos.

### 7.1 Presupuesto simulado global
- `hivemq_budget_usd = mb_total * 0.06`
- `vercel_budget_usd = (mb_total * 0.04) + (h_total * 0.01)`

### 7.2 Asignacion por dispositivo (KPCL)
- `hivemq_kpcl_usd = hivemq_budget_usd * (mb_kpcl / mb_total)`
- `vercel_kpcl_usd = vercel_budget_usd * (0.7 * mb_kpcl/mb_total + 0.3 * h_kpcl/h_total)`

### 7.3 OPEX mensual por dispositivo
`opex_kpcl_usd = mantenimiento_mensual + costo_electrico + hivemq_kpcl_usd + vercel_kpcl_usd`

## 8. Fuentes de datos oficiales (DB)
- `public.finance_kit_components`: BOM y manufactura por componente/perfil.
- `public.finance_provider_plans`: planes, estado, costo base y limites.
- `public.finance_monthly_snapshots`: historico mensual consolidado.
- `public.finance_admin_summary`: vista consolidada para dashboard.

Tablas operativas relacionadas:
- `public.devices`, `public.readings`, `public.sensor_readings`.

## 9. Reglas de normalizacion y calidad
- Moneda base: USD (2 decimales).
- CLP solo como visualizacion derivada.
- Tipo de cambio operativo versionado (ejemplo: 950 CLP/USD).
- Todo KPI financiero debe incluir `last_calculated_at`.
- Si faltan datos, dashboard debe mostrar `N/D` sin romper la vista.

## 10. FAQ operativo
### Como funciona el shadow-pricing de HiveMQ?
Se calcula sobre MB totales de la ventana: `mb_total * 0.06`, luego se prorratea por participacion de MB de cada KPCL.

### Como influye el tipo de cambio?
Solo afecta conversion USD<->CLP. El costo base se guarda en USD para consistencia historica.

### Que pasa si un dispositivo esta offline?
Aporta menos (o cero) horas/MB en la ventana, por lo tanto su prorrateo cloud baja. Mantiene costos fijos locales (mantenimiento/energia) segun politica.

### Como se asigna Vercel por dispositivo?
Con ponderacion 70% por MB y 30% por horas online sobre el presupuesto Vercel simulado.

## 11. Criterios de visualizacion en Admin
Bloque financiero minimo:
- costo unitario kit,
- costo mensual cloud,
- costo mensual total,
- costo por proveedor,
- costo por KPCL,
- porcentaje de uso y capacidad (cuando el proveedor lo entregue).

## 12. Gobernanza del modelo
Cualquier cambio de factores (0.06, 0.04, 0.01), tipo de cambio o componentes BOM:
1. se documenta en este archivo,
2. se versiona en SQL/seed,
3. se refleja en `finance_monthly_snapshots`.

## 13. Gestion de inventario financiero (BOM en DB)
La gestion de inventario de componentes se centraliza en catalogo financiero y no en tablas operativas IoT.

Tablas/vistas clave:
- `public.finance_kit_components`: componente, categoria, costo, moneda, proveedor, vigencia.
- `public.finance_kpcl_profiles`: perfiles de hardware (NodeMCU, ESP32-CAM, generico).
- `public.finance_kpcl_profile_components`: relacion perfil->componentes con cantidades.
- `public.finance_admin_summary`: consolidado de KPIs financieros para admin.

Categorizacion:
- Hardware/BOM (MCU, HX711, celdas, sensores, energia, PCB, packaging).
- Manufactura e insumos (impresion 3D, ensamblaje, postproceso, QA).

Reglas de mapeo de perfil desde `public.devices`:
- contiene `ESP32-CAM` -> perfil `esp32-cam`.
- contiene `NodeMCU` o `CP2102` -> perfil `nodemcu-v3`.
- sin modelo -> `generic-kpcl`.

## 14. Garantias y reemplazos en el modelo
Los reemplazos y garantias se tratan como costo de operacion comercial:
- `total_mensual = cloud_mensual + logistica + soporte + garantias`

Impacto en margen:
- sube `costos_mensuales_totales`.
- sube `overhead_unitario = costos_mensuales_totales / unidades_mes`.
- sube `costo_unitario_kit = BOM + manufactura + overhead_unitario`.
- baja margen bruto unitario y se desplaza el break-even.

Indicadores recomendados en admin:
- tasa de reembolso/reemplazo.
- costo mensual de garantias.
- impacto de garantias en margen unitario.
- tendencia de break-even (mes a mes).

## 15. Punto de equilibrio (break-even)
El break-even en Kittypau se calcula con un simulador escalable que integra costos de produccion y OPEX.

Variables de entrada:
- precio del plato,
- costo unitario de construccion,
- precio de suscripcion,
- churn,
- CAC.

Base de costos:
- costos unitarios (BOM + manufactura + overhead),
- costos operativos mensuales (`cloud + logistica + soporte + garantias`).

Rol del overhead:
- `overhead_unitario = costos_mensuales_totales / unidades_mes`.
- si baja produccion, sube overhead por kit, sube costo unitario y se aleja el break-even.

Formulas operativas recomendadas:
- `margen_unitario = precio_plato - costo_unitario_kit`
- `break_even_unidades = costos_fijos_mensuales / margen_unitario`
- `break_even_meses = inversion_inicial / utilidad_neta_mensual`

Ajuste por modelos:
- Camino A (SaaS): validar `LTV/CAC > 3` y sumar margen recurrente al flujo.
- Camino B (Premium): sin recurrencia, depender de `margen > 45%` y volumen.

El dashboard admin debe recalcular estas metricas ante cambios de costos cloud, componentes y suscripciones.

