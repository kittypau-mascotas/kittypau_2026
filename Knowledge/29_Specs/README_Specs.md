---
id: readme_specs
title: Specs — Roadmap técnico y de producto (2026-08-11)
type: spec
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
tags:
  - specs
  - roadmap
  - bugs
  - ux
  - producto
  - metricas
related:
  - [[00_HOME]]
  - [[AUDITORIA_2026_08_11]]
  - [[18_UI/UX_DIAGNOSTICO_2026_06_30]]
  - [[05_API/SPEC_HungerBar_Alimentacion]]
---

# Specs — Roadmap técnico y de producto

> 5 specs pedidos por Mauro el 2026-08-11, a partir de la auditoría + recorrido en vivo del
> mismo día ([[AUDITORIA_2026_08_11]]). **Backlog vivo, no archivo histórico**: cada spec
> saca sus items en cuanto se implementan (el historial de qué se hizo vive en `git log`,
> no acá) — si volvés a esta carpeta, todo lo que queda listado sigue pendiente.

| Spec | Pregunta que responde |
|---|---|
| [[29_Specs/SPEC_01_Errores_Prioritarios]] | ¿Qué está roto hoy y en qué orden se arregla? |
| [[29_Specs/SPEC_02_UIUX_Mejoras]] | ¿Qué hace que la app se sienta mejor de usar? |
| [[29_Specs/SPEC_03_Objetivos_Monitoreo]] | ¿La app realmente cumple su promesa de monitorear alimentación e hidratación? |
| [[29_Specs/SPEC_04_Metricas_Today_Investigacion]] | ¿Qué métricas nuevas en `/today` están respaldadas por la investigación de `fase_0_ruido`, y cuáles no? |
| [[29_Specs/SPEC_05_Optimizacion_Tecnica]] | ¿Qué hay que arreglar/optimizar que no se ve navegando la app — seguridad, tests, duplicación, bridge? |
| [[29_Specs/SPEC_06_Mobile_APK_2026]] | ¿Qué necesita el APK móvil para seguir siendo publicable y sentirse actual en 2026 — Android 16, plugins, UX nativa? |
| [[29_Specs/SPEC_07_Investigacion_Hidratacion]] | ¿Cómo se reorganiza `Docs/09_Investigacion` y qué hace falta para replicar el pipeline de comida (`fase_0_ruido/`) del lado de hidratación, sin perder ni romper nada? |
| [[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]] | ¿El dispositivo de comida y el de agua están tipificados correctamente en `kittypau_app` (Hunger Bar, `/bowl`, `/today`)? — no: bug real encontrado y corregido, causa raíz en firmware/bridge |

## Cómo se relacionan entre sí

Los 5 specs no son independientes — hay una cadena real:

```
SPEC 01 (errores)     →  limpia el terreno (auth bugs, rutas muertas, deuda técnica visible)
SPEC 05 (técnico)     →  limpia lo invisible (seguridad, tests, duplicación, bridge)
       │
       ▼
SPEC 03 (objetivos)   →  define qué "cumplir el objetivo" significa por pilar
       │                 (alimentación / hidratación / confianza en los datos)
       ▼
SPEC 04 (métricas)    →  qué mostrar en /today para cerrar esos gaps,
       │                 filtrado por "¿está respaldado por datos reales o es una suposición?"
       ▼
SPEC 02 (UI/UX)       →  cómo se ve y se siente todo lo anterior
```

No implementar SPEC 04 sin haber leído SPEC 03 — la mitad del valor de una métrica nueva es
saber si responde a un gap real de producto o es una curiosidad de investigación sin
audiencia.

**SPEC 07 es aparte de esta cadena** — desarrolla en profundidad el Pilar 2 (Hidratación)
de SPEC 03, pero vive del lado de `Docs/09_Investigacion/` (reorganización de carpetas +
roadmap de investigación), no del lado de `kittypau_app`. Léelo si el próximo paso es
"empezar a investigar hidratación", no si el próximo paso es tocar código de producto.

## Ver también

- [[AUDITORIA_2026_08_11]] — hallazgos fuente de estos 5 specs
- [[18_UI/README_UI]] — recorrido en vivo pantalla por pantalla
- [[05_API/SPEC_HungerBar_Alimentacion]] — precedente de spec "investigación → producto" ya implementado
