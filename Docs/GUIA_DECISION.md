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

## Marco AIoT / PetTech (Alineacion 2026)

KittyPau se posiciona oficialmente como una plataforma **AIoT** (Artificial Intelligence of Things) para salud preventiva de mascotas.

Definicion oficial:
**KittyPau is an AIoT platform that monitors pet feeding and hydration cycles to generate health insights and preventive alerts.**

Categoria estrategica:
- **PetTech AIoT** = PetTech + IoT + IA.
- Hardware como puerta de entrada; datos + analitica como motor de valor.

Implicancia de negocio:
- El producto no se presenta como "solo comedero inteligente".
- Se presenta como **plataforma de datos longitudinales de salud animal**.
- Modelo esperado: hardware + suscripcion + analitica/alertas preventivas.

Mensajes recomendados para pitch:
- AIoT pet care platform.
- AIoT platform for preventive pet health monitoring.
- The Fitbit for pets (como analogia de mercado).
