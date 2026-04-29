# Estado de avance — Postulación startuplab.01
**Última actualización:** 2026-04-28

---

## Resumen ejecutivo

| Área | Estado | Notas |
|---|---|---|
| Deck narrativo (12 slides) | ✅ Completo | v1.0 en `02_DECK_STARTUPLAB01.md` |
| Checklist operativo | 🟡 Parcial | Ítems base heredados 2025, pendientes 2026 |
| Anexos legales | ❌ Pendiente | Documentos sin consolidar |
| Anexos equipo | ❌ Pendiente | CVs sin actualizar |
| Anexos producto/tracción | ❌ Pendiente | Fotos/demo/métricas sin preparar |
| Video pitch | ❌ Pendiente | Sin grabar |
| Formulario 2026 vivo | ❌ Pendiente | Ver `05_STARTUPLAB01_FORMULARIO_VIVO.md` |
| PDF de postulación | 🟡 Base | `90_POSTULACION_2026.pdf` — revisar si es template o entregable |

---

## Lo que está listo al 2026-04-28

### Narrativa y posicionamiento
- Deck completo de 12 slides con estructura alineada a criterios startuplab.01 (Madurez Técnica 30%, Equipo 25%, Viabilidad Comercial 20%, Impacto Climático 15%, Ajuste 10%).
- Posicionamiento definido: **PetTech AIoT** — "Fitbit de mascotas" con datos longitudinales como barrera competitiva.
- Modelo de negocio de 3 capas: Hardware + Suscripción + Data insights.

### Tecnología (TRL 5 — evidencia real)
- Firmware ESP8266/ESP32 operativo: sensores peso (HX711), temperatura/humedad (AHT10/DHT11), luz (BH1750), batería (divisor tensión).
- Bridge MQTT (Raspberry Pi Zero 2W) → Supabase funcionando 24/7.
- App web Next.js desplegada en Vercel con dashboard en tiempo real, gráficos de sensores y gestión de dispositivos.
- Migraciones de DB documentadas. Arquitectura documentada en `Docs/`.
- Primer cliente externo real activo (KPCL0051, Chile).

### Equipo
- Roles definidos: Mauricio Cárcamo (CEO, data/producto) + Javier Dayne (CTO, hardware/firmware/sistemas).
- Complementariedad validada operativamente — ambos trabajando en el stack.

---

## Pendientes críticos para cerrar postulación

### Alta prioridad
1. **Confirmar programa 2026** — Build / Ignite / Growth y sus requisitos específicos (ventas, antigüedad, dedicación).
2. **Revalidar criterios de elegibilidad 2026** — pueden variar respecto a 2025.
3. **Consolidar anexos legales** — constitución SpA, certificado vigencia, CI representante.
4. **Grabar video pitch** — estructura ya definida en checklist.

### Media prioridad
5. **Actualizar campos legales en formulario** — RUT, dirección, IDs vigentes 2026.
6. **Ajustar límites de caracteres** según formulario real 2026.
7. **CVs actualizados** de Mauricio y Javier.
8. **Evidencia de prototipo** — fotos/screenshots del sistema funcionando.
9. **Proyección financiera 12-24 meses** — plan de uso de fondos.

### Baja prioridad (enriquecer)
10. **Métricas de tracción** — lecturas acumuladas, uptime, usuarios activos.
11. **Cartas de interés** de early adopters o veterinarias.
12. **Licencia B2B** — modelo por definir en piloto (según deck Slide 7).

---

## Decisiones pendientes

| Decisión | Descripción |
|---|---|
| Programa | ¿Build, Ignite o Growth? Determina requisitos y monto. |
| Precio hardware | Deck dice ~$35–45 USD. ¿Confirmado o estimado? |
| Primer cliente | KPCL0051 existe — ¿se puede mencionar como tracción real? |
| Video pitch | ¿Quién graba, formato, duración requerida por 2026? |
| Cofinanciamiento | ¿Qué porcentaje se puede comprometer? |

---

## Archivos en esta carpeta

| Archivo | Propósito |
|---|---|
| `01_CHECKLIST_ENVIO.md` | Checklist operativo de preparación y cierre |
| `02_DECK_STARTUPLAB01.md` | Narrativa completa del deck (12 slides) |
| `03_ANEXOS_REQUERIDOS.md` | Lista de anexos a consolidar |
| `04_ESTADO_AVANCE.md` | Este archivo — registro del avance |
| `90_POSTULACION_2026.pdf` | PDF base — verificar si es template o borrador entregable |
