# KITTYPAU

## Modelo Estratégico y Métricas de Dashboard

Documento operativo para escalar KittyPau como empresa IoT con monetización híbrida.

## 1. Visión General
- KittyPau combina: hardware (KPCL), plataforma SaaS, analítica y suscripción.
- Objetivo: pasar de monitoreo técnico a control de negocio con métricas accionables.
- El dashboard admin ya integra estado operativo, auditoría, infraestructura, finanzas y tests.

## 2. Ranking de Caminos de Negocio
### #1 Camino A: Hardware + Suscripción (Recomendado)
- Venta de plato + ingreso mensual recurrente.
- KPI crítico: `LTV/CAC > 3`.
- Meta: predictibilidad de ingresos y valorización SaaS.

### #2 Camino C: Freemium Escalable
- Plato + app básica + upgrade premium.
- KPI crítico: `Conversión free->paid > 8%`.
- Meta: crecimiento de base activa con conversión controlada.

### #3 Camino B: Hardware Premium sin Suscripción
- Ticket unitario alto, sin recurrencia.
- KPI crítico: `Margen > 45%`.
- Meta: caja rápida táctica, no estructural.

## 3. KPIs por Camino
### Camino A (Hardware + SaaS)
- COGS unitario.
- Precio de venta.
- Margen bruto unitario.
- MRR.
- ARPU.
- CAC.
- Churn mensual.
- LTV.

Fórmulas:
- `MRR = usuarios_premium * precio_mensual`
- `LTV = ARPU * (1 / churn)`
- `LTV/CAC = LTV / CAC`

### Camino C (Freemium)
- Tasa de activación.
- Conversión free->paid.
- Retención 30/60/90.
- Costo servidor por usuario activo.
- Margen por premium.

### Camino B (Premium unitario)
- Margen bruto unitario.
- Punto de equilibrio.
- Volumen mensual.
- Rotación inventario.

## 4. Dashboard Estratégico (Estado actual integrado)
La vista admin debe mantener 5 bloques:
- Operación del Servicio.
- Auditoría e Integridad.
- Infraestructura y Telemetría.
- Finanzas Operativas.
- Calidad y Tests.

Y un bloque de negocio con:
- Ranking de caminos (#1, #2, #3).
- KPI crítico por camino.
- Sección 4 de escalamiento:
  - Infra mensual.
  - Costo por usuario activo.
  - Costo por 1.000 usuarios.
  - Carga incremental.

## 5. Actualización Automática (modelo recomendado)
Cada cambio en costos/ventas/suscripciones debe recalcular métricas.

Tablas recomendadas:
- `production_costs`
- `hardware_sales`
- `subscriptions`
- `infra_costs`

Recalcular automáticamente:
- Margen unitario.
- MRR.
- LTV.
- Proyección 12 meses.

## 6. Conexión con Stack actual
Fuente de datos principal hoy:
- Supabase/PostgreSQL (`devices`, `readings`, `sensor_readings`, `finance_*`, vistas admin).

Servicios de costo:
- Supabase, Vercel, HiveMQ (capturados en dashboard financiero).

## 7. Simulador Escalable (siguiente iteración)
Entradas:
- Precio plato.
- Costo unitario.
- Precio suscripción.
- Churn.
- CAC.

Salidas:
- Break-even.
- Recuperación de inversión.
- MRR 6 y 12 meses.
- Estimación de valor (múltiplo SaaS).

## 8. Plan por Fases
- Fase 1: Camino A (consolidar recurrencia).
- Fase 2: Camino C (escalar conversión).
- Fase 3: Camino B + B2B (veterinarias/seguros) como expansión.

## 9. Riesgos Estratégicos
- Baja continuidad de KPCL afecta adopción.
- Onboarding incompleto reduce conversión.
- Crecimiento de consumo sin pricing optimizado reduce margen.
- Falta de retención destruye LTV.

## 10. Decisión Ejecutiva
KittyPau debe operar como **SaaS IoT con hardware como canal de adquisición**.
El valor empresarial principal está en:
- recurrencia,
- retención,
- calidad de datos,
- capacidad predictiva.

