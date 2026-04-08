# Plan de Comunicaciones — Kittypau IoT
**Proceso PMBOK**: 10.1 Planificar la Gestion de las Comunicaciones
**Dominio PMBOK 7**: Equipo / Stakeholders
**Version**: 1.0 | Fecha: 2026-03-05

---

## 1. Objetivo

Garantizar que cada interesado reciba la informacion correcta, en el momento oportuno, por el canal adecuado.
El equipo es distribuido y trabaja de forma asincronica — la documentacion escrita es el medio principal de coordinacion.

---

## 2. Principios de comunicacion

1. **Documentacion como fuente de verdad**: toda decision tecnica o de producto se registra en el repositorio
2. **Asincronico por defecto**: no se requieren reuniones para decisiones operativas rutinarias
3. **Pull requests como punto de revision**: el codigo y la documentacion se revisan en GitHub
4. **Transparencia**: el estado del proyecto es visible para ambos fundadores en todo momento
5. **Eficiencia**: comunicar lo necesario, no todo lo pensado

---

## 3. Canales de comunicacion

| Canal | Uso | Audiencia | Sincrono/Asincronico |
|-------|-----|-----------|---------------------|
| GitHub (Issues + PRs) | Tareas tecnicas, bugs, revision de codigo, decisiones de arquitectura | Equipo tecnico | Asincronico |
| GitHub (Commits) | Registro de cambios, evidencia de avance | Equipo tecnico + evaluadores de fondo | Asincronico |
| Documentos `Docs/` | Especificaciones, guias, PMO, contexto del proyecto | Equipo + fondos | Asincronico |
| WhatsApp / Telegram | Coordinacion rapida, alertas urgentes, sincronizacion puntual | Solo equipo fundador | Sincrono |
| Email | Comunicacion formal con fondos, legal, proveedores | Externos | Asincronico |
| Vercel / GitHub Actions | Estado del deploy, CI, alertas automaticas | Equipo tecnico | Automatico |
| Panel admin Kittypau | Estado operativo del sistema (bridge, dispositivos, finanzas) | Equipo tecnico | Automatico |

---

## 4. Plan de comunicacion por interesado

### Comunicaciones internas (equipo)

| Tipo | Contenido | Frecuencia | Canal | Responsable |
|------|----------|-----------|-------|-------------|
| Actualizacion de avance | Commits pusheados, PRs abiertos, hitos completados | Continuo | GitHub | Cada uno |
| Sincronizacion de prioridades | Que sigue, que esta bloqueado, cambio de enfoque | Semanal (si es necesario) | WhatsApp / mensaje directo | Javier o Mauro |
| Decision tecnica mayor | Cambio de arquitectura, nuevo proveedor, cambio de alcance | Por evento | GitHub Issue + Docs | Quien propone |
| Revision de merge | Code review de PR | Por PR | GitHub | Quien revisa |
| Estado de postulacion a fondos | Avance en preparacion de dossier, deadlines, feedback | Por hito | Docs PMO + WhatsApp | Ambos |
| Alerta operativa | Bridge offline, dispositivo error, deploy fallido | Por evento | WhatsApp (urgente) | Automatico + manual |

---

### Comunicaciones con CORFO

| Tipo | Contenido | Frecuencia | Canal | Responsable |
|------|----------|-----------|-------|-------------|
| Postulacion formal | Formulario completo con dossier adjunto | 1 vez (antes del 16/03/2026) | Plataforma CORFO | Ambos |
| Seguimiento post-postulacion | Estado de evaluacion, preguntas del evaluador | Cuando lo requiera CORFO | Email / plataforma | Mauro |
| Informe de hitos (si adjudica) | Avance segun plan, uso de fondos, entregables | Mensual (si adjudica) | Plataforma CORFO | Mauro |
| Cierre del proyecto (si adjudica) | Informe final de resultados y aprendizajes | 1 vez al terminar | Plataforma CORFO | Ambos |

---

### Comunicaciones con usuarios piloto

| Tipo | Contenido | Frecuencia | Canal | Responsable |
|------|----------|-----------|-------|-------------|
| Onboarding asistido | Instalacion y primer uso del dispositivo | 1 vez por usuario | Presencial / videollamada | Javier |
| Seguimiento piloto | Como va el uso, problemas encontrados, feedback | Semanal (1er mes), quincenal (2do mes) | WhatsApp / email | Mauro |
| Actualizacion de features | Nuevas funcionalidades disponibles | Por release | Email o WhatsApp | Mauro |
| Resolucion de incidencias | Respuesta a problemas reportados | < 48h | WhatsApp / email | Javier (hw) / Mauro (sw) |
| Encuesta de satisfaccion | NPS, usabilidad, disposicion a pagar | Mes 1 y mes 3 del piloto | Google Forms / email | Mauro |

---

## 5. Plantillas de comunicacion

### Plantilla: Actualizacion de hito completado (equipo)

```
HITO COMPLETADO: [nombre del hito]
Fecha: [fecha]
Entregables: [lista]
Siguiente hito: [nombre]
Responsable siguiente: [Javier / Mauro / Ambos]
Link relevante: [PR / doc / deploy]
```

### Plantilla: Alerta operativa (bridge/dispositivo offline)

```
ALERTA [NIVEL]: [descripcion breve]
Sistema afectado: [bridge / KPCLXXXX / API / DB]
Detectado: [timestamp]
Impacto: [usuarios afectados / datos perdidos]
Accion tomada: [si aplica]
Requiere atencion: [SI/NO urgente]
```

### Plantilla: Reporte de avance para fondo (mensual si aplica)

```
PROYECTO: Kittypau IoT
PERIODO: [mes]
FONDO: [CORFO / ANID / otro]
AVANCE GENERAL: [% completado]

HITOS COMPLETADOS ESTE PERIODO:
- [hito 1]
- [hito 2]

HITOS PROXIMOS:
- [hito 1] — [fecha objetivo]
- [hito 2] — [fecha objetivo]

USO DE FONDOS (si aplica):
- Categoria 1: $X gastado de $Y presupuestado
- Categoria 2: $X gastado de $Y presupuestado

DESVIACIONES Y ACCIONES:
- [si existe alguna]

PROXIMA COMUNICACION: [fecha]
```

---

## 6. Gestion del conocimiento

### Repositorio de documentos

Todo el conocimiento del proyecto vive en el repositorio GitHub:

```
kittypau_2026/
├── Docs/
│   ├── PMO/                   ← Documentacion de gestion del proyecto
│   ├── ARQUITECTURA_*.md      ← Decisiones tecnicas de arquitectura
│   ├── PLAN_*.md              ← Planes de implementacion
│   ├── SQL_*.md / *.sql       ← Referencias de base de datos
│   ├── GITHUB_*.md            ← Flujo de colaboracion
│   └── TEST_*.ps1             ← Scripts de prueba
├── supabase/migrations/       ← Historial de cambios de DB
└── bridge/src/index.js        ← Fuente del bridge (siempre actualizado)
```

### Registro de decisiones

Las decisiones importantes se documentan con este formato en el archivo relevante de `Docs/`:

```
DECISION [FECHA]: [descripcion breve]
Alternativas consideradas: [A, B, C]
Razon de la eleccion: [justificacion]
Impacto: [que cambia]
Responsable: [Javier / Mauro / Ambos]
```

Ejemplo ya documentado:
- Bridge directo a Supabase (v2.4) vs bridge via webhook API — se eligio directo por latencia y simplicidad

---

## 7. Matriz RACI de comunicaciones

| Actividad | Javier | Mauro | CORFO | Usuarios | Veterinarias |
|-----------|--------|-------|-------|----------|--------------|
| Postulacion CORFO | C | A/R | I | -- | -- |
| Onboarding usuario | R | A | -- | C/I | -- |
| Release de software | C | A/R | -- | I | -- |
| Release de hardware | A/R | C | -- | I | -- |
| Informe de avance (fondo) | C | A/R | I | -- | -- |
| Incidencia critica | R | A | -- | I | -- |
| Cambio de alcance | C | A | -- | -- | -- |

R = Responsable | A = Aprobador | C = Consultado | I = Informado

---

## 8. Herramientas de comunicacion configuradas

| Herramienta | Estado | Proposito |
|------------|--------|-----------|
| GitHub Issues | Activo | Seguimiento de tareas y bugs |
| GitHub Actions | Activo | CI/CD y alertas automaticas |
| Vercel | Activo | Estado de deploy + preview |
| Panel admin Kittypau | Activo | Estado operativo IoT + finanzas |
| bridge_heartbeats (Supabase) | Activo | Uptime y telemetria del bridge |
| audit_events (Supabase) | Activo | Log de eventos criticos |
| GitHub monthly-fusion-review | Activo | Issue mensual automatico de revision |
| Email (Gmail) | Activo | Comunicacion formal externa |
| WhatsApp | Activo | Coordinacion urgente del equipo |

---

## 9. Frecuencia de actualizacion de la documentacion

| Documento | Cuando actualizar |
|-----------|------------------|
| PMO (todos) | Al completar una fase o ante cambio de alcance |
| AVANCE_PUSHES_GITHUB.md | Despues de cada merge a main |
| GITHUB_JAVO.md | Despues de cada push de Javier |
| ESTADO_AVANCE.md | Al completar hitos significativos |
| MEMORY.md (Claude) | Al inicio/fin de cada sesion de trabajo con IA |
| kittypau_fondos_2026.ics | Al confirmar nuevas fechas de fondos |

---

_Referencias: PMBOK 6ta Ed. Cap. 10 (Gestion de las Comunicaciones) | PMBOK 7ma Ed. Dominio de Equipo y Stakeholders_
_Documento anterior: [08_QUALITY_PLAN.md](08_QUALITY_PLAN.md) | Volver al indice: [00_PMO_INDEX.md](00_PMO_INDEX.md)_


