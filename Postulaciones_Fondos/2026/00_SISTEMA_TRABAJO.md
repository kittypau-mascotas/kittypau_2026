# Sistema de Trabajo Fondos 2026 - Kittypau

Objetivo: ordenar la carpeta de fondos para trabajar en conjunto sin duplicar esfuerzos y con una sola fuente de verdad por tipo de tarea.

Fecha de referencia: 2026-04-19.

---

## 1) Estructura operativa (que archivo cumple cada rol)

| Rol | Archivo canonico | Para que se usa |
|---|---|---|
| Radar semanal de oportunidades | `../../FONDOS_RASTREADOS_ACTUALES.md` | Decidir que fondo esta en "aplicar ahora", "preparar", "vigilar". |
| Mapa estrategico Chile + LATAM/Global | `01_GUIA_FONDOS_CHILE_LATAM_GLOBAL.md` | Entender instrumentos, montos, fechas y encaje por etapa. |
| Checklist de elegibilidad y brechas | `02_CHECKLIST_ELEGIBILIDAD_2026.md` | Marcar cumplimiento real por fondo y cerrar brechas. |
| Fuentes oficiales | `03_FUENTES_OFICIALES_2026.md` | Verificar aperturas/cierres/requisitos en sitios oficiales. |
| Narrativa madre 2026 | `documento_2026/00_DOCUMENTO_MAESTRO_2026.md` | Base comun que alimenta todos los formularios. |
| Paquete por fondo (ejecucion) | `STARTUPLAB01_2026/`, `CORFO_SEMILLA_INICIA_2026/` | Version final operativa de cada postulacion. |

Regla: si hay contradiccion entre archivos, se corrige primero en el canonico de su rol y luego se propaga.

---

## 2) Flujo unico de trabajo (todos los fondos)

1. Revisar radar: `../../FONDOS_RASTREADOS_ACTUALES.md`.
2. Confirmar datos en `03_FUENTES_OFICIALES_2026.md`.
3. Validar elegibilidad en `02_CHECKLIST_ELEGIBILIDAD_2026.md`.
4. Si es elegible: derivar narrativa desde `documento_2026/`.
5. Ejecutar en paquete especifico (`STARTUPLAB01_2026/` o `CORFO_SEMILLA_INICIA_2026/`).
6. Antes de enviar: QA final con checklist del fondo + checklist maestro.
7. Luego de enviar: registrar resultado y aprendizajes en este sistema.

---

## 3) Cadencia colaborativa recomendada

### Diario (15-20 min)
- Revisar urgencias de plazo (deadline <= 14 das).
- Actualizar checks criticos en `02_CHECKLIST_ELEGIBILIDAD_2026.md`.
- Registrar bloqueantes.

### Semanal (45-60 min)
- Revlidar estado de convocatorias en fuentes oficiales.
- Mover fondos entre estados (Aplicar / Preparar / Vigilar) en el radar.
- Alnear responsables y entregables de la semana.

### Mensual
- Auditoria de coherencia entre radar, gua, checklist y paquetes por fondo.
- Cerrar duplicados y dejar punteros historicos.

---

## 4) Tablero maestro (estado de trabajo conjunto)

Escala de estado:
- `APLICAR_AHORA`
- `PREPARAR`
- `VIGILAR`
- `NO_APLICA_HOY`

| Fondo | Estado recomendado | Proxima accin concreta | Responsable | Fecha objetivo |
|---|---|---|---|---|
| Y Combinator Summer 2026 | APLICAR_AHORA | Enviar aplicacion online y video demo | Por asignar | 2026-05-04 |
| BRAIN Chile (UC) | APLICAR_AHORA | Validar cierre y enviar carpeta minima | Por asignar | Por confirmar |
| Wayra LATAM | APLICAR_AHORA | Enviar postulacion rolling con fit B2B | Por asignar | Esta semana |
| ANID Startup Ciencia | PREPARAR | Cerrar brecha de 3ra persona + plan TRL | Por asignar | Antes de apertura jul 2026 |
| Start-Up Chile Build | PREPARAR | Dejar materiales bilingues listos | Por asignar | Q3 2026 |
| CORFO Semilla Inicia | PREPARAR | Monitorear region RM/nacional y alistar cofinanciamiento | Por asignar | Q4 2026 |
| CORFO Expande | PREPARAR | Lograr primeras ventas pagadas y patrocinador | Por asignar | Q3 2026 |
| 500 Global LATAM | PREPARAR | Preparar cap table + deck en ingles | Por asignar | Q3 2026 |
| Platanus Ventures | PREPARAR | Definir CTO tecnico y video pitch | Por asignar | Proximo batch |
| EIC Accelerator | VIGILAR | Buscar socio EU y preparar short proposal | Por asignar | Q3-Q4 2026 |
| Parallel18 | VIGILAR | Esperar apertura y preparar expansin a US | Por asignar | Por confirmar |
| CORFO Escalamiento | NO_APLICA_HOY | Consolidar ventas para tramo requerido | Por asignar | 2027+ |

---

## 5) Entregables comunes (reusar en todos los fondos)

Estos activos se preparan una vez y se adaptan:
- Pitch deck ES/EN.
- One-pager ES/EN.
- Video demo 2-3 min.
- Video founder pitch 2-3 min.
- CVs de fundadores (formato base + adaptaciones por fondo).
- Modelo financiero (CLP y USD).
- Cap table y pacto de accinistas.
- Ficha TRL y roadmap tecnico.
- Evidencia de traccin (pruebas, pilotos, metricas).

Ubicacion sugerida:
- Base narrativa: `documento_2026/`
- Adaptaciones por fondo: carpeta del fondo (`STARTUPLAB01_2026/`, `CORFO_SEMILLA_INICIA_2026/`, futuras carpetas).

---

## 6) Reglas de higiene documental

- No duplicar contenido largo entre archivos vivos.
- Si un archivo deja de ser principal, convertirlo en puntero.
- Mantener fechas absolutas (YYYY-MM-DD) para evitar ambiguedad.
- Toda fecha/monto debe tener fuente oficial verificable.
- Si cambia un requisito, actualizar en este orden:
1) `03_FUENTES_OFICIALES_2026.md`
2) `../../FONDOS_RASTREADOS_ACTUALES.md`
3) `02_CHECKLIST_ELEGIBILIDAD_2026.md`
4) paquete del fondo afectado

---

## 7) Ruta de entrada recomendada para el equipo

1. `README.md` (de esta carpeta)
2. Este archivo: `00_SISTEMA_TRABAJO.md`
3. `../../FONDOS_RASTREADOS_ACTUALES.md`
4. `02_CHECKLIST_ELEGIBILIDAD_2026.md`
5. `01_GUIA_FONDOS_CHILE_LATAM_GLOBAL.md`
6. Carpeta del fondo que se esta ejecutando

---

## 8) Decision operativa por defecto

Si hay conflicto de foco, priorizar en este orden:
1. Fondos con deadline cercano y elegibilidad viable.
2. Fondos rolling con alto encaje estrategico.
3. Fondos que requieren brechas estructurales (ventas/equipo/socio EU).

Esto evita dispersarse y mantiene avance real semana a semana.

