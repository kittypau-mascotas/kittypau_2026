# Cronograma de Hitos — Kittypau IoT
**Proceso PMBOK**: 6.5 Desarrollar el Cronograma | PMBOK 7: Dominio de Planificacion
**Version**: 1.0 | Fecha: 2026-03-05
**Herramienta**: Hitos clave + Carta Gantt simplificada

> Fecha de corte actual: 2026-04-01.
> El deadline de CORFO Semilla Inicia O'Higgins ya paso; este cronograma se usa ahora como referencia y replanificacion.

---

## Resumen de fases

| Fase | Descripcion | Periodo | Estado |
|------|-------------|---------|--------|
| F0 | Inception y prototipo | Nov 2025 - Mar 2026 | COMPLETO |
| F1 | Documentacion PMO + Postulacion CORFO | Mar 2026 | VENCIDA / REPLANIFICAR |
| F2 | MVP piloto + validacion | Abr - Jun 2026 | PLANIFICADO |
| F3 | Iteracion + postulacion ANID/StartUp Chile | Jul - Oct 2026 | PLANIFICADO |
| F4 | Escala + break-even | Nov 2026 - Jun 2027 | FUTURO |

---

## Hitos detallados

### FASE 0 — Inception y Prototipo (COMPLETADO)

| Hito | Fecha | Estado |
|------|-------|--------|
| Definicion de arquitectura IoT | Nov 2025 | Completado |
| Primer dispositivo KPCL funcional | Dic 2025 | Completado |
| Bridge MQTT-Supabase operativo | Ene 2026 | Completado |
| App web con dashboard en tiempo real | Feb 2026 | Completado |
| 8 dispositivos activos (KPCL0034-0041) | Mar 2026 | Completado |
| CI/CD GitHub Actions + Vercel | Feb 2026 | Completado |
| Panel admin con telemetria y finanzas | Feb 2026 | Completado |

**Evidencia**: Repositorio GitHub activo con 50+ commits, 8 dispositivos enviando datos 24/7, app deployada en Vercel.

---

### FASE 1 — Documentacion PMO + Postulacion CORFO (VENCIDA / REPLANIFICAR)

| Hito | Fecha objetivo | Responsable | Estado |
|------|---------------|-------------|--------|
| PMO Index y Project Charter | 2026-03-07 | Javier | En curso |
| Business Case completo | 2026-03-08 | Ambos | En curso |
| Cronograma y WBS | 2026-03-09 | Javier | En curso |
| Presupuesto detallado | 2026-03-10 | Mauro | Pendiente |
| Registro de riesgos | 2026-03-10 | Javier | Pendiente |
| Dossier postulacion CORFO armado | 2026-03-13 | Ambos | Pendiente |
| **Postulacion CORFO Semilla Inicia** | **2026-03-16** | **Ambos** | **DEADLINE VENCIDO** |

---

### FASE 2 — MVP Piloto y Validacion (PLANIFICADO)

| Hito | Fecha objetivo | Responsable |
|------|---------------|-------------|
| Constitucion empresa formal (SII) | 2026-04-15 | Mauro |
| Sistema de alertas v1 (app web) | 2026-04-30 | Mauro |
| Produccion de 10 unidades piloto | 2026-04-30 | Javier |
| Onboarding de 10 usuarios piloto | 2026-05-15 | Ambos |
| Primera iteracion post-feedback | 2026-05-31 | Ambos |
| Medicion de conversion free->paid | 2026-06-15 | Mauro |
| Informe de validacion piloto | 2026-06-30 | Ambos |
| **Cierre MVP y reporte de resultados** | **2026-06-30** | **Ambos** |

---

### FASE 3 — Iteracion y Postulacion Fondos Mayores (PLANIFICADO)

| Hito | Fecha objetivo | Responsable |
|------|---------------|-------------|
| Mejoras v2 segun piloto | 2026-07-31 | Ambos |
| App movil v1 (React Native) | 2026-08-31 | Mauro |
| Reduccion COGS a < $20 USD | 2026-08-31 | Javier |
| Postulacion ANID Startup Ciencia | 2026-09-01 | Ambos |
| 50 usuarios activos | 2026-09-30 | Ambos |
| Postulacion StartUp Chile BIG 12 | 2026-10-01 | Ambos |

---

### FASE 4 — Escala y Break-even (FUTURO)

| Hito | Fecha objetivo | Condicion |
|------|---------------|-----------|
| 200 usuarios activos | 2026-12-31 | Post-fondo adjudicado |
| MRR > $500 USD | 2026-12-31 | 38+ suscriptores pagos |
| Break-even operativo | 2026-12-31 | Cubre costos cloud + operacion |
| Integracion con veterinarias (piloto B2B) | 2027-03-31 | Fase 3 completada |
| 1.000 usuarios activos | 2027-06-30 | -- |

---

## Carta Gantt (trimestral)

```
                   Q1 2026    Q2 2026    Q3 2026    Q4 2026    Q1 2027
                   Ene Feb Mar Abr May Jun Jul Ago Sep Oct Nov Dic Ene Feb Mar

Prototipo          =========
Documentacion PMO          ===
Postulacion CORFO          =
Piloto 10 usuarios             =========
Constitucion legal             ===
Mejoras v2                                =========
App movil                                    =========
Postulacion ANID                                    =
Postulacion SUCh                                       =
50 usuarios                                         ===
200 usuarios                                                  =========
Break-even                                                       ===
```

---

## Dependencias criticas

```
Prototipo funcional
    --> Documentacion PMO
        --> Postulacion CORFO (16 Mar)
            --> Adjudicacion (estimado ~3 meses)
                --> Produccion escala (50+ unidades)
                    --> Piloto ampliado
                        --> Break-even

Piloto 10 usuarios
    --> Datos de validacion
        --> Postulacion ANID / StartUp Chile
```

---

## Ruta critica

Los siguientes hitos son **bloqueantes** (un retraso impacta todo lo que sigue):

1. **Postulacion CORFO Semilla Inicia (16/03/2026)** — deadline vencido; replanificar por otra region o nueva convocatoria
2. **Piloto con 10 usuarios** — sin datos de validacion no se puede postular a fondos mayores
3. **Constitucion empresa** — ANID requiere empresa formalmente constituida

---

_Referencias: PMBOK 6ta Ed. Cap. 6 (Gestion del Cronograma) | PMBOK 7ma Ed. Dominio de Planificacion_
_Documento anterior: [02_SCOPE_WBS.md](02_SCOPE_WBS.md) | Siguiente: [04_BUSINESS_CASE.md](04_BUSINESS_CASE.md)_


