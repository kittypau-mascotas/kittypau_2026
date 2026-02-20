# KITTYPAU - Modelo Estrategico y Metricas

Documento estrategico oficial para operar KittyPau como negocio IoT con control operativo, financiero y de escalamiento.

## 1. Vision general
KittyPau combina:
- hardware (KPCL),
- SaaS (app + backend + analytics),
- suscripcion,
- data operational intelligence.

Meta de negocio: usar hardware como canal de adquisicion y recurrencia SaaS como motor de valor.

## 2. Ranking de modelos de ingresos
### #1 Camino A - Hardware + Suscripcion (Recomendado)
- Ingreso: venta inicial + MRR.
- KPI critico: `LTV/CAC > 3`.
- Objetivo: predictibilidad y valorizacion SaaS.

### #2 Camino C - Freemium escalable
- Ingreso: plato + upgrade premium.
- KPI critico: `conversion free->paid > 8%`.
- Objetivo: crecer base y convertir de forma controlada.

### #3 Camino B - Hardware premium sin suscripcion
- Ingreso: ticket unico alto.
- KPI critico: `margen > 45%`.
- Objetivo: caja rapida tactica, no crecimiento compuesto.

## 3. KPIs por camino
### Camino A
- COGS unitario
- precio venta
- margen bruto unitario
- MRR
- ARPU
- CAC
- churn
- LTV

Formulas:
- `MRR = usuarios_premium * precio_mensual`
- `LTV = ARPU * (1 / churn)`
- `LTV/CAC = LTV / CAC`

### Camino C
- activacion
- conversion free->paid
- retencion 30/60/90
- costo por usuario activo
- margen por premium

### Camino B
- margen unitario
- punto de equilibrio
- volumen mensual
- rotacion de inventario

## 4. Dashboard estrategico (minimal y claro)
Mantener 5 bloques:
1. Operacion del servicio
2. Auditoria e integridad
3. Infraestructura y telemetria
4. Finanzas operativas
5. Calidad y tests

Dentro de Finanzas operativas incluir:
- ranking de caminos (#1 #2 #3),
- KPI critico de cada camino,
- costo de escalamiento (infra mensual, costo/usuario, costo por 1.000 usuarios).

## 5. Actualizacion automatica de metricas
Tablas recomendadas:
- `production_costs`
- `hardware_sales`
- `subscriptions`
- `infra_costs`

Al cambiar datos, recalcular:
- margen unitario,
- MRR,
- LTV,
- proyeccion 12 meses,
- break-even.

## 6. Integracion con stack actual
Fuente principal:
- Supabase/PostgreSQL (`devices`, `readings`, `sensor_readings`, `finance_*`, vistas admin).

Proveedores de costo:
- Supabase
- Vercel
- HiveMQ

## 7. Simulador (siguiente fase)
Entradas:
- precio plato,
- costo unitario,
- precio suscripcion,
- churn,
- CAC.

Salidas:
- break-even,
- recuperacion inversion,
- MRR 6/12 meses,
- estimacion de valor empresarial (referencia SaaS multiple).

## 8. Decision ejecutiva
Estrategia recomendada por fases:
- Fase 1: Camino A.
- Fase 2: Camino C.
- Fase 3: Camino B + B2B (veterinarias/seguros) como expansion.

Principio central:
el valor de KittyPau esta en recurrencia, retencion y calidad de datos; no solo en la venta del hardware.

## 9. Garantias y reemplazos (impacto estrategico)
Los reemplazos impactan directamente en rentabilidad por dos vias:
- costo mensual comercial (garantias),
- erosion de margen unitario via overhead.

Efecto en punto de equilibrio:
- mayor garantia -> mayor overhead -> menor margen -> mayor volumen para break-even.

KPIs minimos:
- tasa de reemplazo,
- costo de garantia por unidad vendida,
- margen bruto ajustado por garantia,
- break-even ajustado.

## 10. Simulador de break-even (operativo)
Entradas minimas:
- `precio_plato`
- `costo_unitario_kit`
- `precio_suscripcion`
- `churn`
- `CAC`

Salidas minimas:
- `break_even_unidades`
- `break_even_meses`
- `margen_unitario`
- `LTV/CAC` (cuando aplica)

Reglas por camino:
- Camino A: incluir flujo recurrente mensual y validacion `LTV/CAC > 3`.
- Camino B: solo margen directo unitario, objetivo `margen > 45%`.
- Camino C: incluir conversion free->paid y retencion en proyeccion.

## 11. Valorizacion SaaS (multiplo)
Modelo recomendado:
- `MRR = usuarios_premium * precio_mensual`
- `ARR = MRR * 12`
- `EV_saas = ARR * multiplo_saas`

Drivers de valor:
- recurrencia (MRR),
- retencion (churn bajo),
- eficiencia comercial (`LTV/CAC`),
- calidad y explotacion de datos.

Regla ejecutiva:
- `LTV/CAC > 3` para crecimiento sano.

Freemium (Camino C):
- `ARPU_freemium = ingresos_totales / usuarios_activos`.
- aproximacion operativa: `precio_premium * conversion_free_to_paid`.
- `LTV_freemium = ARPU_freemium * (1/churn)`.

Salida esperada en Admin:
- MRR, ARR,
- LTV, CAC, LTV/CAC,
- valorizacion proxy 6m y 12m.

