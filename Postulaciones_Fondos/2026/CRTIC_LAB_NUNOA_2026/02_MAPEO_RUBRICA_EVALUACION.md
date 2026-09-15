# Mapeo contra la rúbrica real de evaluación (1ª etapa)

> Fuente: bases oficiales PDF, sección 9.2 — "Primera evaluación: selección de 25
> proyectos para la fase formativa". Son los 25 mayores puntajes de esta rúbrica los
> que pasan; no llegar a los 5 finalistas todavía depende del pitch (sección 9.4,
> tabla aparte, no cubierta acá porque es la segunda etapa).

| # | Criterio | Ponderación | Qué pide realmente | Qué tiene Kittypau hoy | Qué falta |
|---|---|---|---|---|---|
| 1 | Pertinencia y calidad de la propuesta | **25%** | Vinculación con industrias creativas; integración creatividad+tecnología; claridad; uso pertinente de CRTIC/Hub Ñuñoa; estrategia de difusión | El reframe de `01_NARRATIVA_TECNOCREATIVA_CRTIC.md` | Elegir y describir UNA idea concreta de prototipo experiencial (no las 3 opciones a la vez) |
| 2 | Experiencia y capacidades del equipo | 15% | Trayectoria vía CV/portafolio, experiencia en proyectos similares. **El formulario real exige 3-4 personas cubriendo 4 roles: creativo/a, técnico/a, productor/a, investigador/a** (ver `05_FORMULARIO_REAL_2026-09-15.md`) — esto es en realidad un requisito de admisibilidad, no solo de puntaje | CVs reales de Javier (técnico/a: IoT/firmware/MQTT, 15+ años) y Mauro (investigador/a y productor/a: Data Science/ML/visualización, ver `../EQUIPO/`) | **Falta el rol creativo/a** — 3ª persona en curso (`04_PLAN_DE_ACCION.md` Paso 0b). Portafolio del equipo en PDF (máx. 10 hojas, un solo archivo) — no existe todavía, armar con capturas reales de `/today` + fotos del hardware KPCL una vez sumada esa persona |
| 3 | Proyección y escalabilidad | 10% | Potencial de comercialización, distribución, licenciamiento, internacionalización | Ya documentado en `../documento_2026/02_PROPUESTA_VALOR_MERCADO_2026.md` y `04_MODELO_NEGOCIO_FINANZAS_2026.md` | Adaptar el lenguaje: acá "escalar" también puede leerse como "replicar la experiencia a otros formatos" (instalación, evento, partnership de marca), no solo negocio SaaS |
| 4 | Factibilidad técnica y operativa | **20%** | Resultado demostrable dentro del tiempo/infraestructura/recursos del programa (12-15 semanas) | El hardware/datos YA existen y funcionan en producción — bajo riesgo real | Acotar el prototipo experiencial a algo construible por 2 personas en 12-15 semanas sin dedicación 100% (ver `04_PLAN_DE_ACCION.md`) |
| 5 | Viabilidad económica | 10% | Coherencia entre alcance y recursos financieros disponibles | El programa es gratuito (bases §6) — no hay presupuesto que presentar como tal | Igual conviene decir con qué recursos propios se cubre lo que el programa no da (ej. tiempo del equipo, materiales menores) |
| 6 | Innovación e impacto potencial | 10% | Novedad, relevancia del desafío, impacto en productos/servicios/empleo/PI/mercados | El motor de detección real (Investigacion_v2) + datos longitudinales reales desde abril | Articular la novedad en términos de "nueva forma de percibir el bienestar de una mascota", no en términos de algoritmo |
| 7 | Retribución a la comuna de Ñuñoa | 10% | Acción de impacto/transferencia en Ñuñoa + transferencia de conocimiento a CRTIC/Hub Ñuñoa | — | Definir una acción concreta y realista (ver opciones en `01_NARRATIVA_TECNOCREATIVA_CRTIC.md`) — no prometer algo que después no se pueda cumplir (bases §7, es un compromiso formal si se selecciona) |

## Lectura del peso relativo

Los dos criterios más pesados (1 y 4, 45% juntos) premian **claridad de una idea
concreta + que sea realmente construible en el tiempo del programa** — no premian
tener la idea más grande o más "de IA". Esto confirma la recomendación de
`01_NARRATIVA_TECNOCREATIVA_CRTIC.md`: elegir una sola pieza de prototipo
experiencial, simple y construible con las capacidades reales del equipo (Next.js/
React + datos ya disponibles vía API), en vez de prometer algo que requiera
aprender Unreal Engine o motion capture desde cero.
