---
id: readme_estrategia_mercado
title: Estrategia y Contexto de Mercado — Kittypau
type: roadmap
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - estrategia
  - mercado
  - icp
  - modelo-negocio
  - go-to-market
  - pettech
related:
  - [[00_HOME]]
  - [[01_Proyecto/README_Proyecto]]
  - [[01_Proyecto/DOC_MAESTRO_DOMINIO]]
  - [[21_Roadmap/README_CORFO_Semilla2026]]
---

# Estrategia y Contexto de Mercado — Kittypau

> Consolidado de los 6 archivos `Contexto_Mercado/01–06`. Sirve como base para postulaciones, deck comercial y narrativa de validación.

---

## 1. Contexto de mercado

### Problema estructural
Los dueños de mascotas carecen de visibilidad continua sobre hidratación y alimentación, lo que retrasa detección de problemas de salud y empuja un cuidado reactivo.

### Oportunidad
- Crece la humanización de mascotas y el gasto en bienestar animal.
- Alta adopción digital del cliente objetivo (app-first).
- Madurez de stack IoT + cloud permite desplegar soluciones con menor costo inicial.

### Por qué ahora
1. Demanda por herramientas preventivas (no solo conveniencia).
2. Costos de infraestructura y analítica más accesibles.
3. Kittypau ya tiene base técnica operativa para pasar a validación comercial.

### Tesis de mercado
El valor no está solo en un dispositivo, sino en **transformar hábitos diarios en datos accionables para decisiones de cuidado temprano**.

---

## 2. ICP y Jobs-to-be-done

### ICP inicial (B2C)
Dueños de mascotas urbanos, digitalizados, con alta preocupación por bienestar y disposición a pagar por monitoreo preventivo.

### Segmento secundario (B2B2C)
Clínicas veterinarias y comercios pet que buscan diferenciar servicio y fidelizar clientes.

### Pains principales
- Incertidumbre sobre estado diario de la mascota cuando no están en casa.
- Falta de datos objetivos para detectar cambios tempranos.
- Dificultad para compartir historial útil con veterinarios.

### Jobs-to-be-done
- "Quiero saber si mi mascota está comiendo e hidratándose bien cuando no estoy."
- "Quiero detectar a tiempo cambios de hábito relevantes."
- "Quiero tener historial claro para tomar mejores decisiones de cuidado."

### Evidencia interna disponible
- Prototipo funcional con flujo IoT documentado y 421 anotaciones etiquetadas.
- Interés de usuarios para pilotos y validación temprana.

---

## 3. Competencia y posicionamiento

### Competencia directa
Soluciones pet-tech con hardware y app para monitoreo básico de consumo.

### Competencia indirecta
- Dispensadores automáticos sin analítica de salud.
- Apps de registro manual sin capa IoT integrada.
- Wearables generales no enfocados en hidratación/alimentación.

### Posicionamiento Kittypau
- Integración extremo a extremo: dispositivo + telemetría + backend + app.
- Enfoque preventivo/predictivo basado en datos históricos.
- Potencial de evolución hacia modelos de riesgo y alertas más precisas.

### Ventaja defendible
La barrera principal es la **capa de datos + interpretación + experiencia de uso**, no solo el hardware.

### Categoría estratégica
**PetTech AIoT** = PetTech + IoT + IA.

Esto posiciona a Kittypau como:
- infraestructura de datos longitudinales de salud animal,
- analítica preventiva,
- plataforma escalable con suscripción.

**Definición oficial de producto:**
> *Kittypau is an AIoT platform that monitors pet feeding and hydration cycles to generate health insights and preventive alerts.*

**Estrategia tipo "Fitbit de mascotas":** Hardware = punto de entrada · Datos longitudinales = ventaja competitiva · IA = diferencial de valor · Suscripción = recurrencia.

---

## 4. Modelo de negocio y Go-To-Market

### Modelo base
Hardware + suscripción (HaaS).

### Lógica de monetización
1. Venta inicial de dispositivo.
2. Activación y retención por app.
3. Upsell a plan premium con funciones avanzadas.

### Capas de monetización

| Camino | Modelo | KPI crítico | Objetivo |
|---|---|---|---|
| A | Hardware + Suscripción | `LTV/CAC > 3` | Predictibilidad y valor SaaS |
| B | Hardware premium sin suscripción | Margen bruto unitario | Caja táctica |
| C | Freemium escalable | Conversión free→paid y retención | Crecimiento de base |

### KPIs comerciales clave
- `MRR = usuarios_premium × precio_mensual`
- `LTV = ARPU × (1 / churn)`
- `LTV/CAC > 3` — objetivo operacional
- Activación de dispositivo
- Retención 30/90 días
- Conversión a premium
- Churn mensual

### Estrategia de entrada
- Inicio en segmento urbano digital (Chile, Santiago).
- Pilotos controlados para validar uso, retención y willingness-to-pay.
- Expansión por alianzas con clínicas veterinarias y canal pet especializado.

### Casos de uso preventivos
- Riesgo de deshidratación por baja de consumo de agua.
- Cambios de conducta alimentaria.
- Riesgo de sobrepeso por patrones de ingesta sostenidos.

### Expansiones en evaluación
- `Kitty Plant` — monitoreo plantas
- `Senior Kitty` — mascotas mayores con necesidades especiales

---

## 5. Riesgos, supuestos y métricas de validación

### Riesgos críticos

| Riesgo | Área |
|---|---|
| Precisión/durabilidad del hardware insuficiente en uso real | Hardware |
| Baja adopción o churn alto | Mercado |
| Costos cloud y soporte creciendo más rápido que ingresos | Operación |
| Debilidad en cumplimiento de privacidad y datos | Regulatorio |

### Supuestos a validar
- El usuario percibe valor temprano en alertas y trazabilidad.
- Existe disposición a pago por capa premium.
- El canal veterinario puede acelerar adquisición y confianza.

### Métricas de validación (12 meses)

| Métrica | Descripción |
|---|---|
| Tasa de activación post-compra | % que activa el dispositivo dentro de 7 días |
| Uso semanal activo por hogar | Sesiones activas/semana por usuario |
| Conversión free → premium | % usuarios que pagan |
| Retención 3 meses | % usuarios activos a 90 días |
| Costo unitario total por cliente activo | Incluye hardware, cloud, soporte |

### Criterio de decisión
Si no hay retención o conversión suficiente, **priorizar iteración de propuesta de valor antes de escalar adquisición**.

---

## 6. Referencias de mercado

| # | Título | Fuente | Año | Uso en Kittypau |
|---|---|---|---|---|
| 1 | La Transformación del Hogar Chileno: Pet Parenting 2024-2025 | DAEM Villarrica | 2026 | Humanización mascotas, gasto, cuidado preventivo |
| 2 | Primera Encuesta Nacional a tenedores de mascotas | SUBDERE / UC | 2021 | Tenencia responsable, magnitud del problema |
| 3 | Pet tech market — pronóstico hasta 2034 | Fortune Business Insights | 2026 | TAM global, crecimiento sector |
| 4 | Primer estudio de población animal en Chile (12M perros y gatos) | SUBDERE | 2022 | Población objetivo |
| 5 | Mismo estudio (cobertura académica) | UC Chile | 2022 | Respaldo institucional universitario |
| 6 | Explosión del mercado de mascotas en Chile: hasta $100K/mes | Emol | 2024 | Gasto, madurez de mercado, retail pet |

> Las fichas individuales con URLs completas están en `Docs/07_Estrategia/Contexto_Mercado/06_REFERENCIAS_MERCADO.md` y `Fuentes_Mercado/`.

---

## Ver también

- [[01_Proyecto/DOC_MAESTRO_DOMINIO]] — reglas de negocio, estados, KPIs económicos
- [[21_Roadmap/README_CORFO_Semilla2026]] — postulación CORFO activa
- [[01_Proyecto/README_Proyecto]] — qué está activo en el producto hoy
