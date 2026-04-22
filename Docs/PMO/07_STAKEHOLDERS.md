# Registro de Interesados — Kittypau IoT
**Proceso PMBOK**: 13.1 Identificar a los Interesados | 13.2 Planificar el Involucramiento
**Dominio PMBOK 7**: Stakeholders
**Version**: 1.0 | Fecha: 2026-03-05

---

## Escala de valoracion

| Nivel | Poder | Interes |
|-------|-------|---------|
| 1 — Muy bajo | Sin autoridad sobre el proyecto | Indiferente |
| 2 — Bajo | Influencia indirecta | Monitorea ocasionalmente |
| 3 — Medio | Puede afectar decisiones | Involucrado activamente |
| 4 — Alto | Aprueba o bloquea entregables | Seguimiento continuo |
| 5 — Muy alto | Control total o veto | Comprometido profundamente |

**Estrategia segn cuadrante**:
- Poder alto / Interes alto -> **Gestionar activamente**
- Poder alto / Interes bajo -> **Mantener satisfecho**
- Poder bajo / Interes alto -> **Mantener informado**
- Poder bajo / Interes bajo -> **Monitorear**

---

## Registro completo de interesados

### S01 — Javier Suarez (Co-fundador / CTO)

| Campo | Valor |
|-------|-------|
| Organizacion | Kittypau IoT |
| Rol en el proyecto | Director tecnico, firmware, hardware, bridge |
| Poder | 5 |
| Interes | 5 |
| Cuadrante | Gestionar activamente |
| Contacto | javomauro.contacto@gmail.com |
| Expectativas | Excelencia tecnica, arquitectura solida, firmware confiable en campo |
| Preocupaciones | Tiempo limitado (part-time), deuda tecnica acumulada |
| Influencia | Toma decision final sobre stack IoT, firmware y hardware |
| Estrategia | Sincronizacion semanal, documentacin continua compartida |

---

### S02 — Mauro Carcamo (Co-fundador / CPO)

| Campo | Valor |
|-------|-------|
| Organizacion | Kittypau IoT |
| Rol en el proyecto | Director de producto, full-stack app, SQL, UX |
| Poder | 5 |
| Interes | 5 |
| Cuadrante | Gestionar activamente |
| Contacto | Por definir |
| Expectativas | App robusta, buen UX, modelo de negocio vlidado, fondos adjudicados |
| Preocupaciones | Deuda tecnica en frontend, lint errors, tiempo para desarrollar features premium |
| Influencia | Toma decision final sobre producto, UX y estrategia comercial |
| Estrategia | Co-revision de PRs, roadmap compartido, reuniones de priorizacion |

---

### S03 — CORFO (Corporacion de Fomento de la Produccion)

| Campo | Valor |
|-------|-------|
| Organizacion | Gobierno de Chile |
| Rol en el proyecto | Patrocinador financiero potencial (Semilla Inicia) |
| Poder | 5 |
| Interes | 3 |
| Cuadrante | Mantener satisfecho |
| Contacto | corfo.cl / Ejecutivos regionales |
| Expectativas | Proyecto innovador con potencial de mercado, equipo ejecutable, presupuesto justificado |
| Preocupaciones | Riesgo de ejecucion, falta de empresa formal, mercado no vlidado |
| Indicadores que valora | Prototipo funcional, potencial de empleo, impacto economico regional |
| Estrategia | Dossier completo + evidencia tecnica (fotos, datos, TRL). Usar lenguaje de impacto social. |

---

### S04 — ANID (Agencia Nacional de I+D)

| Campo | Valor |
|-------|-------|
| Organizacion | Gobierno de Chile |
| Rol en el proyecto | Patrocinador financiero potencial (Startup Ciencia) |
| Poder | 5 |
| Interes | 2 |
| Cuadrante | Mantener satisfecho |
| Contacto | anid.cl |
| Expectativas | Base tecnico-cientifica solida, empresa constituida, equipo de 3+ personas dedicado |
| Preocupaciones | Falta de empresa, equipo part-time, sin publicaciones academicas |
| Indicadores que valora | Innovacion tecnolgica, metodologia rigurosa, impacto cientifico potencial |
| Estrategia | Preparar 6+ meses antes. Priorizar constitucion empresa y ampliar equipo. |
| Condicion bloqueante | Empresa constituida (actualmente no existe) |

---

### S05 — StartUp Chile

| Campo | Valor |
|-------|-------|
| Organizacion | Gobierno de Chile (CORFO) |
| Rol en el proyecto | Patrocinador financiero potencial (BIG 12 — Ignite) |
| Poder | 4 |
| Interes | 2 |
| Cuadrante | Mantener satisfecho |
| Contacto | startupchile.org |
| Expectativas | Traccin demostrada, potencial global, equipo con ejecucion |
| Indicadores que valora | Usuarios activos, revenue (si existe), potencial de escala regional |
| Condicion bloqueante | Empresa constituida, traccin real (piloto completado) |
| Estrategia | Postular con datos del piloto (Fase 2). Preparar pitch en ingles. |

---

### S06 — Usuarios piloto (duenos de mascotas)

| Campo | Valor |
|-------|-------|
| Perfil | Duenos de gatos/perros, 25-45 anos, NSE medio-alto, conectados digitalmente |
| Poder | 3 |
| Interes | 5 |
| Cuadrante | Gestionar activamente |
| Numero objetivo | 10 usuarios en Fase 2 |
| Expectativas | Producto facil de instalar, datos tiles, no que interrumpa rutina del animal |
| Preocupaciones | Privacidad, complejidad de instalacion, precio |
| Lo que necesitan del equipo | Onboarding asistido, soporte rapido, feedback loop visible |
| Estrategia | Contacto directo y personal. Entrevistas pre-piloto. Iteracion semanal. |

---

### S07 — Veterinarias (canal futuro — Fase 3)

| Campo | Valor |
|-------|-------|
| Perfil | Clinicas veterinarias, pet hotels, guarderias |
| Poder | 2 |
| Interes | 3 |
| Cuadrante | Mantener informado |
| Expectativas | Herramienta profesional de seguimiento, datos exportables, sin complejidad tecnica |
| Cuando involucrar | Post-piloto B2C, cuando existan datos de valor clinico |
| Estrategia | Mapear 2-3 clinicas de referencia durante el piloto. No abordar formalmente hasta Fase 3. |

---

### S08 — Proveedores de hardware

| Campo | Valor |
|-------|-------|
| Proveedores clave | AliExpress (MCUs, sensores), Electronica Embajador Chile (local), MCI Chile |
| Poder | 3 |
| Interes | 1 |
| Cuadrante | Monitorear |
| Riesgo principal | Alza de precios, stock agotado, tiempos de envio internacionales (3-6 semanas) |
| Estrategia | Mantener stock mnimo de componentes criticos (20 unidades). Identificar proveedor alternativo para cada componente critico. |

---

### S09 — Proveedores cloud (Supabase, Vercel, HiveMQ)

| Campo | Valor |
|-------|-------|
| Proveedores | Supabase Inc., Vercel Inc., HiveMQ GmbH |
| Poder | 4 |
| Interes | 1 |
| Cuadrante | Mantener satisfecho |
| Riesgo principal | Cambio de precios, discontinuacion de plan free, caida de servicio |
| Estrategia | Shadow-pricing activo. Plan de migracion documentado por proveedor. SLA monitoreado via panel admin. |

---

### S10 — Comunidad open source / makers

| Campo | Valor |
|-------|-------|
| Perfil | Makers, desarrolladores IoT, comunidad PlatformIO/Arduino |
| Poder | 1 |
| Interes | 2 |
| Cuadrante | Monitorear |
| Oportunidad | Contribuciones de firmware, feedback tecnico, difusion organica |
| Estrategia | Mantener repositorio publico bien documentado. Contemplar licencia open-source para firmware en Fase 3. |

---

## Mapa de poder e interes

```
PODER
  5 |  S03(CORFO)    S01(Javier)
    |  S04(ANID)     S02(Mauro)
  4 |  S09(Cloud)    S05(SUCh)
    |
  3 |  S08(Provee)   S06(Usuarios)
    |                S07(Vets)
  2 |
    |
  1 |                S10(OSS)
    |___________________________
       1    2    3    4    5   INTERES

Gestionar activamente: S01, S02, S06
Mantener satisfechos:  S03, S04, S05, S09
Mantener informados:   S07
Monitorear:            S08, S10
```

---

## Plan de involucramiento

| Interesado | Frecuencia | Canal | Responsable |
|-----------|-----------|-------|-------------|
| S01 Javier | Continuo | GitHub + mensajes | Mutuo |
| S02 Mauro | Continuo | GitHub + mensajes | Mutuo |
| S03 CORFO | En hitos | Email + plataforma CORFO | Ambos |
| S04 ANID | Trimestral (2do semestre) | Email + plataforma ANID | Ambos |
| S05 StartUp Chile | Semestral | plataforma + email | Ambos |
| S06 Usuarios piloto | Semanal | WhatsApp / email directo | Ambos |
| S07 Veterinarias | Cuando sea relevante | Visita / email | Mauro |
| S08 Proveedores | Por pedido | AliExpress / email | Javier |
| S09 Cloud providers | Por alerta | Panel admin / status page | Ambos |

---

_Referencias: PMBOK 6ta Ed. Cap. 13 (Gestion de Interesados) | PMBOK 7ma Ed. Dominio de Stakeholders_
_Documento anterior: [06_RISK_REGISTER.md](06_RISK_REGISTER.md) | Siguente: [08_QUALITY_PLAN.md](08_QUALITY_PLAN.md)_


