<!--
Sync Impact Report
- Version change: 1.2.0 → 1.3.0
- Modified principles: I. Ponytail — se agrega la regla "Cambios quirúrgicos"
  (no reformatear/refactorizar código adyacente no relacionado con la tarea
  pedida; mantener el estilo existente; borrar solo el código muerto que los
  propios cambios generaron). No redefine nada existente de forma
  incompatible — expande guía ya vigente. Bump MINOR.
- Added sections: n/a
- Modified sections: n/a (fuera del Principio I)
- Removed sections: none
- Origen del cambio: comparación con las 4 reglas del `CLAUDE.md` viral de
  Karpathy (GitHub, mayo 2026) — 3 de 4 ya estaban cubiertas por este
  documento (Simplicity First = Principio I ya existente; Goal-Driven
  Execution = ya cubierto estructuralmente por el flujo spec-kit). Solo
  "Surgical Changes" era una regla genuinamente nueva.
- Deferred TODOs:
  - TODO(RATIFICATION_DATE): sin cambios respecto a v1.2.0 — se mantiene
    2026-08-16 como fecha de ratificación formal.
- Fuente: CLAUDE.md (raíz del repo) — este documento transcribe reglas ya
  vigentes, no introduce políticas nuevas. Cualquier cambio de fondo debe
  hacerse primero en CLAUDE.md y reflejarse acá después, no al revés.
-->

# Kittypau Constitution

## Core Principles

### I. Ponytail — Lazy Senior Dev (diff más corto que funciona)
El mejor código es el que nunca se escribió. Antes de escribir cualquier código, subir el
ladder en orden y detenerse en el primer peldaño que aguante: (1) ¿necesita existir? —
necesidad especulativa se omite (YAGNI); (2) ¿ya existe en este codebase? — reutilizar un
helper/util/tipo/patrón existente, nunca reimplementar lo que está a pocos archivos de
distancia; (3) ¿lo hace la stdlib?; (4) ¿lo cubre una feature nativa de la plataforma?
(`<input type="date">` antes que una lib de picker, CSS antes que JS, constraint de DB
antes que código de app); (5) ¿lo resuelve una dependencia ya instalada?; (6) ¿puede ser
una línea?; (7) recién ahí, el código mínimo que funciona. El ladder se aplica *después* de
entender el problema completo (leer la tarea y el código real de punta a punta), no en
lugar de eso. Sin abstracciones no solicitadas (sin interface para una sola implementación,
sin factory para un producto, sin config para un valor que nunca cambia). Eliminación sobre
adición. Simplificaciones deliberadas se marcan con un comentario `ponytail:` que nombra el
techo y el path de upgrade. **Cambios quirúrgicos**: al tocar código existente, tocar solo
lo esencial para la tarea pedida — no reformatear código adyacente, no refactorizar algo que
ya funciona solo porque se abrió el archivo, mantener el estilo existente aunque no sea el
que se elegiría de cero. Código muerto: borrar solo el que los propios cambios generaron, no
código muerto preexistente no relacionado con la tarea (eso se propone aparte, no se hace de
paso).

### II. Fix de Bug = Causa Raíz, No Síntoma
Antes de editar una función compartida, `grep` todos sus callers. El fix perezoso ES el fix
de causa raíz: un guard en la función compartida es un diff más pequeño que un guard
repetido en cada caller. No parchear el síntoma más cercano si la causa real está un nivel
más abajo (ej. en el firmware o el bridge en vez de en la capa de lectura de la app).

### III. No-Negociables (NON-NEGOTIABLE)
Nunca simplificar: validación de input en trust boundaries, error handling que previene
pérdida de datos, seguridad, accesibilidad, y lo que se pida explícitamente. Hardware nunca
es el ideal en papel — un reloj real deriva, un sensor real lee off; dejar el knob de
calibración, no solo menos código. Código lazy sin su check está incompleto — lógica no
trivial deja un check ejecutable detrás. Escrituras a producción (Supabase: INSERT, UPDATE,
DELETE, ALTER, o cualquier cambio de schema) requieren confirmación explícita antes de
ejecutarse — nunca se asume autorización implícita sobre datos o schema reales.

### IV. Arquitectura de Datos — Fuente de Verdad Histórica
`readings.csv` es un archivo **estático** de abril: nunca se modifica, nunca se
sobreescribe, nunca se trunca — es la fuente de verdad histórica. `readings_rows.csv` es
dinámico, **solo append**; las lecturas nuevas van ahí. Supabase es la capa online:
sincronización *desde* los CSVs hacia Supabase, nunca al revés. El indicador de estado
🟢🔴⚫ por sección respeta la lógica ya existente — no se reinterpreta sin motivo.

### V. Motor Matemático v2 — Complejidad Justificada
`shape_features_v2.py` (102 features en 15 familias + Evidence Engine) es complejidad
justificada por el dominio, no over-engineering. Antes de tocar este módulo: leer el módulo
completo y el contrato de la Evidence Engine. No simplificar el algoritmo sin entender el
dominio físico detrás (comida vs. agua, forma de la curva de peso, etc.).

### VI. IoT / Firmware — Verificar Dos Veces
`iot_firmware/javier_1a/` contiene el firmware real (ESP8266 principal en
`firmware-esp8266/`, ESP32-CAM en `firmware-esp32cam/`) — cualquier cambio afecta hardware
físico en producción, verificar dos veces antes de aplicar. `kittypau_iot_firmware/` (sin
`iot_`) está vacía y en `.gitignore` — no es la carpeta real pese al nombre parecido.

### VII. Knowledge Vault — Fuente de Verdad Narrativa
`Knowledge/` (vault de Obsidian) es la fuente de verdad narrativa del proyecto — se lee
directo con herramientas de filesystem al inicio de cualquier sesión, nunca se asume
conocimiento del proyecto sin consultarlo primero. El RAG en Supabase es para la app de
usuarios finales, no reemplaza esta lectura directa. Si un documento entra en conflicto con
este archivo (la constitución) o con `CLAUDE.md`, `CLAUDE.md` gana hasta que `Knowledge/`
se actualice explícitamente.

### VIII. Trabajo en 2 PCs — Sincronización Segura
Antes de cualquier `git pull`/`git push`, seguir el protocolo completo de
`Knowledge/19_DevOps/README_DevOps.md` § "Trabajo en 2 PCs", en el orden exacto ahí
descrito. Nunca `git reset --hard` ni force-push. Nunca commitear secretos
(`.env*`/`settings.local.json`). Revisar `Knowledge/19_DevOps/PENDIENTES_POR_PC.md` al
empezar sesión y actualizarlo antes de terminar (mover lo hecho a "Completado", sumar lo
nuevo descubierto).

## Convivencia con Knowledge/29_Specs/

`Knowledge/` es la **única fuente de verdad** del proyecto. `Knowledge/29_Specs/` es el
backlog vivo ya existente — specs narrativos que mezclan investigación, causa raíz,
decisiones y estado de implementación en un solo documento evolutivo, con
cross-referencias (`[[wiki-links]]`) y un tracker de trabajo por PC
(`PENDIENTES_POR_PC.md`). Spec-kit **convive** con este sistema, no lo reemplaza, y
**depende** de él — no es una fuente independiente:

- **MUST**: toda spec creada con `/speckit-specify` debe basarse en contenido real de
  `Knowledge/` — y de `Knowledge/29_Specs/` en particular cuando ya exista un spec
  relacionado con el tema. Nunca inventar requisitos, contexto de dominio, o decisiones que
  no estén ya documentadas ahí o confirmadas explícitamente por Mauro en la conversación.
- **MUST**: antes de correr `/speckit-specify` sobre cualquier tema, leer primero el/los
  documento(s) de `Knowledge/` relacionados — partiendo de `Knowledge/00_HOME.md` como
  índice, igual que cualquier otra sesión de trabajo sobre este repo.
- **MUST**: si `Knowledge/` no tiene información suficiente sobre el tema, eso se declara
  explícitamente en el spec generado como gap de conocimiento — no se rellena inventando
  para completar la plantilla.
- **MUST**: toda feature creada con `/speckit-specify` vive físicamente dentro de
  `Knowledge/29_Specs/<NNN>-<slug>/` — nunca en el directorio `specs/` de la raíz del repo
  (el default de la herramienta, no usado en este proyecto). Al crear una feature nueva se
  pasa `SPECIFY_FEATURE_DIRECTORY=Knowledge/29_Specs/<NNN>-<slug>` explícitamente en vez de
  dejar que el script use su default. `.specify/feature.json` (`feature_directory`) debe
  apuntar siempre a una ruta dentro de `Knowledge/29_Specs/`. Motivo: tener specs de
  spec-kit fuera de `Knowledge/` fragmentaría la fuente de verdad única (Principio VII).
- Los specs existentes en `Knowledge/29_Specs/` siguen siendo la fuente de verdad para el
  trabajo ya documentado ahí — no se migran automáticamente al formato de spec-kit.
- Spec-kit (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`)
  se usa para **features nuevas** que arrancan desde cero, donde separar QUÉ/CÓMO/TAREAS en
  artefactos distintos aporta valor real — siempre fundamentado en `Knowledge/`.
- `/speckit-analyze` y `/speckit-converge` pueden usarse sobre trabajo ya en curso como
  chequeo de consistencia puntual, sin que eso implique migrar el spec completo.
- Cualquier decisión de migrar specs existentes de `Knowledge/29_Specs/` al formato de
  spec-kit se toma explícitamente caso por caso, no por defecto.

## Governance

Esta constitución transcribe reglas ya vigentes en `CLAUDE.md` (raíz del repo) — no
introduce políticas nuevas. `CLAUDE.md` es la fuente editable; cualquier cambio de fondo a
estos principios se hace primero ahí y se sincroniza acá después, no al revés. En caso de
conflicto entre este archivo y `CLAUDE.md`, `CLAUDE.md` gana hasta que este archivo se
actualice explícitamente para reflejarlo.

**Versionado semántico:**
- MAJOR: eliminación o redefinición incompatible de un principio existente.
- MINOR: principio o sección nueva agregada, o guía existente ampliada de forma material.
- PATCH: aclaraciones, correcciones de redacción, refinamientos no semánticos.

**Cumplimiento:** cualquier sesión de trabajo (humana o de agente) sobre este repo debe
operar dentro de estos principios. Complejidad nueva debe justificarse contra el Principio I
(Ponytail) antes de agregarse. Amendments a este documento requieren actualizar primero
`CLAUDE.md` y luego este archivo en el mismo cambio.

**Version**: 1.3.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-08-16
