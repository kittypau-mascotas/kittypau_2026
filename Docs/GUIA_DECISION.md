# Guia de Decision (Actual)

## Objetivo
Elegir el ambiente correcto de trabajo segun la tarea.

---

## Ambientes disponibles
1. **Local (Next.js)**: desarrollo rapido, sin depender de cloud.
2. **Produccion (Cloud)**: Vercel + Supabase + HiveMQ + Raspberry Bridge.

---

## Cuando usar cada uno

### Local (Next.js)
Usar cuando:
- Estas desarrollando UI o API routes.
- Necesitas cambios rapidos con hot reload.
- No quieres depender de servicios externos.

### Produccion (Cloud)
Usar cuando:
- Necesitas una demo accesible desde cualquier lugar.
- Vas a probar flujo IoT real (Bridge + HiveMQ).
- Quieres validar E2E con datos reales.

---

## Flujo de trabajo recomendado
1. Desarrolla en local (Next.js).
2. Commit + push.
3. Vercel despliega automaticamente.
4. Validas en produccion con `Docs/PRUEBAS_E2E.md`.

---

## Fuente de verdad
- Arquitectura: `Docs/ARQUITECTURA_PROYECTO.md`
- Ecosistema: `Docs/MAPA_ECOSISTEMA.md`
