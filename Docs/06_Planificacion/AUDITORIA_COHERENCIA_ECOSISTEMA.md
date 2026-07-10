# Auditoria de Coherencia del Ecosistema Kittypau

> Documento de auditoria historica. Para el estado vivo resumido del proyecto leer [`ESTADO_PROYECTO_ACTUAL.md`](ESTADO_PROYECTO_ACTUAL.md).

## Objetivo
Evaluar la coherencia interna del proyecto entre sus dimensiones criticas para asegurar alneacion entre vision, producto, tecnologa y operacin.

## Alcance evaluado
- Documentacion: `Docs/`
- Front/app: `kittypau_app/`
- API/DB: rutas `/api/*`, contratos y migraciones SQL
- Operacion: flujo GitHub -> Vercel

## Escala de puntaje
- `0`: inexistente
- `1`: muy debil / contradictorio
- `2`: parcial
- `3`: funcional con deuda
- `4`: consistente
- `5`: robusto y verificable

## Criterios por dimension
1. Consistencia documental
2. Alneacion con vision PetTech AIoT
3. Trazabilidad doc -> codigo/API/SQL
4. Operabilidad (se puede ejecutar/probar)
5. Vigencia (actualizado, responsable, fecha)

---

## Resultado de la nueva auditoria (2026-03-09)

| Dimension | Consistencia | Alneacion | Trazabilidad | Operabilidad | Vigencia | Score |
|---|---:|---:|---:|---:|---:|---:|
| Estrategia | 4 | 5 | 4 | 4 | 4 | 4.2 |
| Producto y UX | 3 | 4 | 3 | 3 | 3 | 3.2 |
| Datos e IA | 3 | 4 | 3 | 3 | 3 | 3.2 |
| Arquitectura y Backend | 4 | 4 | 4 | 4 | 4 | 4.0 |
| Operacion y DevOps | 4 | 4 | 4 | 4 | 4 | 4.0 |
| Negocio y Finanzas | 4 | 4 | 3 | 3 | 3 | 3.4 |
| Marca y Narrativa | 4 | 5 | 4 | 4 | 4 | 4.2 |

`Indice de Coherencia Ecosistema = 3.74 / 5.00`

### Meta de mejora (proxima auditoria: 2026-03-31)
Objetivo: pasar de `3.74` a `>= 4.10`, priorizando cierre de brechas en Producto/UX y Datos/IA sin degradar operacin.

| Dimension | Score actual | Meta | Gap |
|---|---:|---:|---:|
| Estrategia | 4.2 | 4.4 | +0.2 |
| Producto y UX | 3.2 | 4.1 | +0.9 |
| Datos e IA | 3.2 | 4.0 | +0.8 |
| Arquitectura y Backend | 4.0 | 4.2 | +0.2 |
| Operacion y DevOps | 4.0 | 4.3 | +0.3 |
| Negocio y Finanzas | 3.4 | 4.0 | +0.6 |
| Marca y Narrativa | 4.2 | 4.4 | +0.2 |

### Palancas concretas para subir score
1. Producto y UX (`P0`):
- cerrar coherencia del selector tester/KPCL en `/today` + `navbar` con evidencia multi-cuenta,
- ejecutar checklist UX/UI APK completo (3 resoluciones objetivo + dispositivo real),
- registrar capturas antes/despues en documento de release.

2. Datos e IA (`P0/P1`):
- homologar migraciones de batera en todos los entornos,
- implementar pruebas de contrato para `/api/readings` (casos OK, vacio y error),
- definir protocolo mnimo de vlidacion de formulas (consumo e hidratacin) con dataset controlado.

3. Negocio y Finanzas (`P1`):
- consolidar trazabilidad KPI tecnico -> KPI negocio (retencion, activacion, costo operativo),
- documentar supuestos economicos vigentes por versin de producto.

4. Operacion y DevOps (`P1`):
- estandarizar evidencia por deploy (commit, URL, smoke test, riesgos abiertos),
- asegurar que cada cambio UX/API/SQL actualice su documento canonico asociado.

### Criterio de recalculo del indice
- Se recalcula solo con evidencia verificable (commit + prueba + doc actualizado).
- Cada dimension sube puntaje cuando cierra su gap con evidencia minima definida en este documento.

### Lectura del resultado
- Estado general: **coherencia aceptable con deuda**.
- Fortalezas: estrategia, narrativa, arquitectura y operacin.
- Brechas principales: producto/UX y datos/IA (ejecucion de backlog y evidencia de pruebas).

---

## Hallazgos diagnosticados
1. `contexto.md` contenia transcripcion cruda + instrucciones mezcladas con resumen canonico.
2. Faltaba decision explcita de gobernanza sobre propuesta de "multiples cuentas Vercel".
3. Auditoria previa existia como plantilla, pero no como auditoria ejecutada con evidencias.
4. Persisten deudas funcionales en `/today` (reglas tester/KPCL y consistencia UX de estado real).

---

## Mejoras aplicadas en esta iteracion
1. Se normalizo `Docs/contexto.md` como **contexto canonico** con:
- decisiones vigentes,
- decisiones no aprobadas,
- implicancias tecnicas y backlog derivado.

2. Se agrego gobernanza explcita en `Docs/GUIA_DECISION.md`:
- no aprobacion de multiples cuentas de Vercel por base de datos,
- prioridad de estabilidad core.

3. Se ejecuto esta nueva auditoria con score por dimension y plan correctivo.

---

## Matriz de conflictos actualizada

| ID | Tipo | Fuente A | Fuente B | Conflicto | Impacto | Prioridad | Responsable | Estado |
|---|---|---|---|---|---|---|---|---|
| C-001 | Documentacion | `Docs/contexto.md` (versin previa) | docs maestros | Mezcla de nota cruda vs definicion canonica | Alto | P1 | Producto/Docs | Cerrado |
| C-002 | Gobernanza | propuesta transcripcion | `Docs/GUIA_DECISION.md` | Multiples cuentas Vercel por DB sin control | Alto | P1 | Tech Lead | Cerrado |
| C-003 | Flujo UX | `Docs/VISTAS_APP.md` | estado real `/today` | Deuda de consistencia completa en selector tester/KPCL | Alto | P0 | Frontend | En curso |
| C-004 | Datos/API | contratos batera | entorno local parcial | Migraciones batera no homogeneas entre entornos | Alto | P0 | Backend/DB | En curso |
| C-005 | Evidencia IA | docs estrategicos | pruebas operativas | Falta protocolo formal de vlidacion de formulas IA | Medio | P1 | Data/Backend | Abierto |

---

## Evidencia minima por dimension

| Dimension | Documento canonico | Evidencia tecnica | Prueba/Checklist | OK |
|---|---|---|---|---|
| Estrategia | `Docs/PLAN_PROYECTO_KITTYPAU.md` | roadmap y prioridades | revision documental | Si |
| Producto y UX | `Docs/VISTAS_APP.md` | `/today`, `app-nav`, reglas tester | smoke manual parcial | Parcial |
| Datos e IA | `Docs/MODELO_DATOS_IA_FORMULAS_KITTYPAU.md` | formulas + `/api/readings` | falta suite formal | Parcial |
| Arquitectura y Backend | `Docs/ARQUITECTURA_PROYECTO.md` | `/api/*`, webhook, bridge | pruebas endpoint | Si |
| Operacion y DevOps | `Docs/CHECKLIST_DEPLOY.md` | Vercel prod + logs | deploy verificado | Si |
| Negocio y Finanzas | `Docs/ANALISIS_ECONOMICO_KITTYPAU.md` | KPCL costos/OPEX | revision de consistencia | Parcial |
| Marca y Narrativa | `Docs/contexto.md` | bloque PetTech AIoT transversal | revision en docs clave | Si |

---

## Plan correctivo actualizado

| Accion | Dimension | Prioridad | Fecha objetivo | Responsable | Dependencias | Estado |
|---|---|---|---|---|---|---|
| Cerrar coherencia selector tester/KPCL en `/today` + `navbar` | Producto y UX | P0 | 2026-03-13 | Frontend | pruebas multi-cuenta tester | En curso |
| Homologar migraciones batera en todos los entornos | Datos/API | P0 | 2026-03-13 | Backend/DB | acceso Supabase + migraciones | En curso |
| Implementar pruebas de contrato para `/api/readings` | Datos/API | P1 | 2026-03-16 | Backend | dataset controlado | Pendiente |
| Definir protocolo mnimo de vlidacion IA (consumo e hidratacin) | Datos e IA | P1 | 2026-03-20 | Data/Backend | historico de lecturas | Pendiente |

---

## Cadencia
- Auditoria completa: mensual.
- Mini auditoria: por release relevante.
- Regla de PR: cambios en UX/API/SQL requieren actualizacion de documento canonico + evidencia.

## Metadatos
- Fecha: 2026-03-09
- Version release: `main` (post contexto canonico)
- Auditado por: Codex
- Alcance (branch/commit): `main` workspace local
- Observacion general: se mejoro coherencia estrategica y documental; resta cierre tecnico en producto/datos.

## Actualizacion Operativa (post auditoria)
- Commits relevantes aplicados en `main`:
  - `b8ef5f5` (sincronizacin amplia docs/app/sql)
  - `4d55aae` (login APK: mantener titulo y ocultar copy pequena)
  - `6e74853` (rebalanceo dimensiones mobile APK)
  - `daff54f` (APK login: bloque marca centrado y agrandado, sin regresion web intencional)
- Produccion Vercel actualizada y verificada:
  - `https://kittypau-app.vercel.app`
  - deploy confirmado: `https://kittypau-88jx7gso2-kittypaus-projects.vercel.app`
- Estado de cierre UX APK:
  - login mobile nativo con jerarquia visual corregida (plato -> titulo -> marca -> card),
  - `/today` mobile nativo compactado para mejorar visibilidad en primera pantalla.

## Mini-auditoria incremental (2026-03-09, post `daff54f`)
- Alcance: login APK (centrado y escala de marca) + vlidacion de no-regresion web por alcance CSS.
- Resultado:
  - Coherencia de marca en APK: mejora perceptible (alneacion con narrativa PetTech AIoT).
  - Riesgo residual: revisar en dispositivo real 360x800 y 393x852 para confirmar proporciones finales.
- Estado:
  - C-003 (flujo UX `/today` + selector tester/KPCL): **sigue abierto**.
  - C-004 (migraciones batera multi-entorno): **sigue abierto**.

## Avance de ejecucion (2026-03-09, coherencia selector/nav)
- Se implemento sincronizacin transversal de seleccion mascota/dispositivo para reducir desalneacion entre vistas y navbar:
  - nuevo helper: `src/lib/runtime/selection-sync.ts`,
  - adopcion en `/today`, `/story`, `/pet`, `/bowl`.
- Resultado esperado:
  - cambios de mascota/dispositivo propagan a navbar en tiempo real (evento + localStorage),
  - mejora de consistencia para cuentas tester multi-mascota y flujos KPCL.
- Estado:
  - C-003 pasa de **Abierto** a **En curso** (pendiente cierre con pruebas multi-cuenta tester).

## Avance de ejecucion (2026-03-09, datos/API batera + contrato readings)
- Se reforzo robustez de contrato `/api/readings`:
  - acepta `device_id` (actual) y `device_uuid` (alias retrocompatible).
- Se normalizo documentacin de esquema para evitar drift:
  - `Docs/SQL_SCHEMA.sql` ahora usa canon `readings.device_id` (UUID FK),
  - `Docs/PRUEBAS_E2E.md` alneado a `device_id=<UUID interno>` como parmetro principal.
- Se agrego evidencia tecnica para C-004:
  - asserts SQL de batera en `Docs/SQL_ASSERTS.md` (columnas, constraints e indice),
  - script de contrato `Docs/TEST_READINGS_CONTRACT.ps1`,
  - referencia en `Docs/PRUEBAS_E2E.md` e `Docs/INDEX.md`.
- Estado:
  - C-004 pasa de **Abierto** a **En curso** (pendiente ejecucion formal en entorno Supabase objetivo).


