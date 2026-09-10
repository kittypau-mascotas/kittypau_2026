# startuplab.01 — pasos para enviar la postulación

**Fecha:** 2026-09-10 · Revisión del paquete "Nueva Postulacion 2026" antes de cargar.

---

## 0) Dónde y cuándo se envía

- **Canal:** plataforma `vform.cl` (Cuestionarios startuplab.01) + formulario Airtable "Postulación
  Residencia startuplab.01". Kittypau **ya está registrado** en el pipeline (proceso ID 1579737,
  correos de julio 2026 → "ya te encuentras dentro de la fase de registro").
- **Deadline:** la Residencia tiene **admisión continua** (rolling), evaluación 15–20 días. No hay
  fecha de corte — se envía cuando el paquete esté cerrado.
- Los "Cuestionarios N°1 / N°2 trimestrales" que aparecen cerrados en la plataforma son de
  **seguimiento de ecosistema** para startups ya trackeadas, **no** la postulación a la residencia.
  No bloquean el envío.

---

## 1) Lo que YA está listo (solo copiar/adjuntar)

- ✅ Respuestas del formulario completas → `RESPUESTAS_FORMULARIO_FINAL.md` + `01_RESPUESTAS_POSTULACION_2026.md`
- ✅ Narrativa del deck (12 slides) → `../Antigua Pstulacion 2026/02_DECK_STARTUPLAB01.md`
- ✅ Vinculación T&C → `02_VINCULACION_TERMINOS_Y_CONDICIONES_KITTYPAU.md`
- ✅ Proyección financiera → `PROYECCION_FINANCIERA_BASE_2026.md`
- ✅ Modelo de negocio + BOM (en `../../documento_2026/` y `Docs/KPCL_CATALOGO_...`)
- ✅ CVs → `../../EQUIPO/01_PERFIL_JAVIER_DAYNE.md` / `02_PERFIL_MAURO_CARCAMO.md`
- ✅ Docs legales SpA → escritura + certificado (IoT Chile SpA, **RUT 78.203.374-3**, constituida 10/07/2025)

## 2) Lo que FALTA generar antes de enviar (bloqueante)

- [ ] **Deck en PDF** (10–12 slides, diseñado a partir de `02_DECK_STARTUPLAB01.md`)
- [ ] **Video pitch** (2–3 min, el formato que pida la plataforma)
- [ ] **Video/demo del producto funcionando** (sirve `/demo` en vivo: `https://kittypau-app.vercel.app/demo`)
- [ ] **Certificado de vigencia** de la SpA actualizado (< 60 días)
- [ ] **Cédula de identidad vigente** del Team Leader (Mauro) y del representante legal
- [ ] **LinkedIn vigente** de ambos fundadores (link)
- [ ] **Acuerdo de piloto FIRMADO** — hoy `ACUERDO_USO_PILOTO_KPCL0051.md` es una plantilla con
      campos en blanco (`[NOMBRE DEL USUARIO]`, fecha, firmas). Sin la firma real no es evidencia.
- [ ] Fotos del prototipo (carcasa + componentes; hay en `../Nueva Postulacion 2026/Imagenes prototipo 3a/`)

## 3) Inconsistencias a corregir en las respuestas ANTES de cargar

| Problema | Dónde | Corrección |
|---|---|---|
| **RUT equivocado**: `01_RESPUESTAS` §1 pone "Rut del contacto principal: 17402237-2" (es el RUT personal de Mauro). | `01_RESPUESTAS` §1 | El campo de contacto puede ir el RUT personal, pero **en todo lo societario/legal el RUT es 78.203.374-3 (IoT Chile SpA)**. Revisar que no se mezclen. |
| **Nº de dispositivos inconsistente**: el deck dice "8 dispositivos KPCL activos"; `version_mauro` dice "3 físicos (KPCL0034/0035/0036 + KPCL0051)"; `01_RESPUESTAS` dice "usuario activo KPCL0051" + "segunda unidad". | deck slide 4 · `version_mauro` §2 · `01_RESPUESTAS` §3 | Fijar **un número real y verificable hoy** y usarlo en los 3 documentos. Lo defendible: **KPCL0034 (comida, con motor de clasificación v2 validado) + KPCL0035 (agua) en el hogar de Bandida**, más el/los que estén realmente operando. No inflar. |
| **Fecha de inicio en el pasado**: "Fecha estimada de inicio: 01/07/2026". | `01_RESPUESTAS` §7 | Actualizar a una fecha futura realista (ej. inicio del mes siguiente al envío). |
| **Evidencia más fuerte que la de marzo** no está reflejada. | todo el paquete | Sumar: app desplegada con `/today` + `/demo` en vivo (espejo de datos reales), motor de clasificación de eventos validado sobre 300+ comidas reales de KPCL0034, notificaciones push. Es TRL 5 sólido, casi 6 — decirlo con esos datos, no con "8 devices". |
| **Encaje de sector / "Impacto Climático (15%)"**: startuplab.01 es deep tech para energía / manufactura / **agro** / transporte. Un comedero de mascota encaja forzado. | criterio de evaluación | Reforzar el ángulo que sí pega: **bienestar animal + datos longitudinales de salud + Dry Lab para calibración de hardware**. El impacto climático dejarlo acotado y honesto (reducción de urgencias veterinarias + desperdicio de alimento), sin sobre-vender. Si hay forma de conectar con un caso pecuario/agro, sube el encaje. |

## 4) Orden de ejecución sugerido

1. Corregir las 5 inconsistencias del §3 en `01_RESPUESTAS` + `version_mauro` + deck (1–2 h).
2. Firmar el acuerdo de piloto con el/los usuario(s) reales (reemplazar los `[...]`).
3. Sacar el certificado de vigencia de la SpA + fotos de CIs + links de LinkedIn.
4. Diseñar el deck PDF desde `02_DECK_STARTUPLAB01.md` (10–12 slides).
5. Grabar el video pitch (2–3 min) + capturar el demo en vivo (`/demo`).
6. Entrar a `vform.cl` (proceso 1579737) / Airtable, pegar las respuestas de
   `RESPUESTAS_FORMULARIO_FINAL.md` ya corregidas y adjuntar todo.
7. Guardar comprobante de envío en esta carpeta.

## 5) Lectura de los Términos y Condiciones (PDF oficial, revisado 2026-09-10)

### Lo que está bien (bajo riesgo)
- **Propiedad intelectual (§20):** Fundación Chile **NO adquiere derechos** sobre la PI de la
  startup (patentes, know-how, secretos, marcas). La startup mantiene control total sobre
  tecnología, desarrollos y **equity**. **No toma participación accionaria.**
- **Confidencialidad (§19):** FCh trata como confidencial la info sensible; acceso limitado a
  personal autorizado + asesores con NDA; solo difunde en forma agregada y anonimizada.
- **Sin exclusividad:** no hay cláusula que impida postular a otros fondos/programas en paralelo
  (BIG 13, Platanus, etc.).
- **Constitución:** "pueden o no estar constituidas como persona jurídica" — la SpA ya está, OK.
- **Postular ≠ contratar:** con enviar la postulación solo se aceptan **las bases** (§21, aceptación
  irrevocable de las bases). El **contrato de residencia** (§14, con Fundación Chile) se firma
  **después**, solo si te seleccionan — ahí van duración, causales de término y resolución de
  conflictos: **ese contrato hay que leerlo aparte cuando llegue.**

### Lo que hay que tener claro ANTES de aceptar un cupo (riesgos reales)
1. **La Residencia es de PAGO, con compromiso anual (§12).** "Los costos asociados a cada plan
   estarán disponibles durante el proceso de postulación", con "opciones de pago mensual y anual,
   **con compromisos anuales**". El programa `relab.01` sí es gratis para residentes, pero el
   **acceso** (cowork + lab) se paga. Con el burn actual (~USD 1–5/mes, capital USD 304), un
   compromiso anual de arriendo de espacio + lab puede ser inviable sin financiamiento antes.
   → **Pedir el pricing exacto del plan Plus y del plan Flex antes de comprometerse**, y no
   aceptar cupo sin tener cómo pagarlo (o un cupo patrocinado).
2. **El foco climático es REQUISITO, no un "plus" (§6 + criterio 15%).** La tecnología debe
   encajar en un sector (energía / manufactura / **agricultura y sistemas alimentarios** /
   transporte / **entorno construido**) y en un área de acción (**monitoreo** / mitigación /
   etc.). Un comedero de mascota urbana encaja **forzado** en "Entorno Construido (7%)" — la
   matriz del Anexo 1 para "Monitoreo × Entorno Construido" es "sensores de eficiencia térmica /
   monitoreo urbano de emisiones", que **no** es Kittypau.
   → **Reencuadre recomendado:** apuntar a **"Agricultura y Sistemas Alimentarios (19% de
   emisiones) — ganadería"** + área **"Monitoreo"** (la matriz ahí dice "sensores... modelos
   predictivos"). Es decir, presentar Kittypau como **monitoreo predictivo de consumo y salud
   animal**, con la mascota de compañía como primer mercado y el bienestar/eficiencia en
   animales de producción como extensión. Sin ese giro, el criterio de impacto climático puntúa
   bajo.
3. **Piso obligatorio: Madurez Tecnológica ≥ 3, o descarte automático (§7).** El evaluador juzga
   si es **"genuinamente deep tech, con fundamento científico sólido y evidencia de trabajo
   experimental"**. El equipo pide "al menos un integrante con formación científica/técnica
   relevante, **preferiblemente con PhD o experiencia equivalente en investigación**" — Kittypau
   no tiene PhD. → Apoyarse fuerte en la **evidencia experimental real**: el motor de
   clasificación de eventos validado contra ground truth sobre `[CONFIRMAR: ~305]` comidas
   reales, la recalibración de constantes sobre ese histórico, el filtro EMA sobre el ADC, OTA
   en campo. Eso es lo que sube "Madurez Tecnológica" de 3 a 4.
4. **Seguimiento post-residencia de hasta 36 meses (§16):** informe **mensual** de empleo,
   capital levantado, ventas e impacto climático, hasta 3 años después de terminar. Carga
   administrativa larga.
5. **Compromisos del residente (§13, §18):** reportes periódicos dentro de plazo (si no, te
   excluyen de actividades), representar positivamente a startuplab.01, participar en difusión y
   dar testimonios cuando lo pidan.
6. **Probidad / Ley 20.393 (§22):** cumplir el Modelo de Prevención de Delitos de FCh + canal de
   denuncias. Estándar, bajo riesgo.

### Veredicto
- **Postular:** sin costo, sin ceder equity ni PI, sin exclusividad → **hacerlo**.
- **Aceptar el cupo si sale:** condicionado a (a) conocer y poder pagar el plan (compromiso
  anual), o conseguir cupo patrocinado; y (b) tener claro que el valor es Dry Lab + red +
  mentoría + vitrina, **no** financiamiento.
- **Antes de cargar:** ajustar el formulario y el deck con el reencuadre "monitoreo predictivo de
  salud/consumo animal" (§2 punto 2) y con la evidencia experimental del motor (§3), para no caer
  en Impacto Climático ni en el piso de Madurez Tecnológica.

## 6) Nota

startuplab.01 **no entrega financiamiento ni toma equity** — es residencia de pago (Dry Lab + red +
mentoría). Postular acá **no reemplaza** postular a los fondos con plata (Start-Up Chile BIG 13 ·
Platanus · Purina Prize) — ver `../../10_ACTUALIZACION_FECHAS_2026-09.md`.
