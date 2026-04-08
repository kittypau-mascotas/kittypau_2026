# Especificacion Integral - Chatbot de Admin de Kittypau

## 1. Proposito

Este documento define el chatbot de administracion de Kittypau:

- su rol como asistente total del proyecto;
- su acceso a toda la documentacion viva;
- como responde sobre producto, arquitectura, datos, finanzas y operacion;
- como se diferencia del gato visible para cliente;
- y como se prepara para futuras consultas sobre el estado completo del ecosistema.

Es la fuente de verdad para cualquier implementacion del chatbot de admin.
Su forma visible debe ser simple, tipo hero interno dentro del area de admin.

## 2. Principio central

Kittypau tiene dos experiencias conversacionales distintas:

### Gato visible para cliente
Asiste al usuario dentro de `login`, `demo` e `inicio`.

- habla de la experiencia de uso;
- habla de la mascota;
- explica la interfaz;
- guia acciones concretas;
- mantiene tono felino y sarcastico.

### Chatbot de admin
Asiste al equipo interno y a los agentes que trabajan sobre el proyecto completo.

- vive en el hero de admin;
- conoce la documentacion total;
- responde sobre arquitectura, datos, UI, finanzas y despliegue;
- conecta piezas dispersas del proyecto;
- resume el estado vivo;
- y ayuda a navegar el ecosistema de Kittypau de forma amplia.

Su uso es solo interno para nosotros: Javo, Mauro y quienes administran el proyecto.

No deben mezclarse.

## 3. Alcance del chatbot de admin

El chatbot de admin puede consultar y resumir:

- `Docs/INDEX.md`;
- `Docs/README.md`;
- `Docs/FUENTE_DE_VERDAD.md`;
- `Docs/PLAN_MAESTRO.md`;
- `Docs/ESTADO_PROYECTO_ACTUAL.md`;
- `Docs/ESTADO_AVANCE.md`;
- `Docs/PLAN_MEJORA_PRIORIZADO.md`;
- `Docs/TAREAS_PENDIENTES_ACTUALES.md`;
- `Docs/AUDITORIA_COHERENCIA_ECOSISTEMA.md`;
- `Docs/SQL_MAESTRO.md`;
- `Docs/SQL_SCHEMA.sql`;
- `Docs/FRONT_BACK_APIS.md`;
- `Docs/BRIDGE_HEALTHCHECK.md`;
- `Docs/ESTADO_BRIDGE_ACTUAL.md`;
- `Docs/RASPBERRY_BRIDGE.md`;
- `Docs/ADMIN_PORTAL_PLAN.md`;
- `Docs/ADMIN_DASHBOARD_INFORMATION_ARCHITECTURE.md`;
- `Docs/VALIDACION_ADMIN_DASHBOARD.md`;
- `Docs/ADMIN_TEST_SUITE.md`;
- `Docs/CIERRE_FINAL_ADMIN_CHECKLIST.md`;
- `Docs/FINANZAS/README.md`;
- `Docs/FINANZAS/COMPROBANTES/README.md`;
- `Docs/FONDOS_RASTREADOS_ACTUALES.md`;
- `Docs/PLAN_PENDIENTES_APP_WEB_KITTYPAU.md`;
- `Docs/PLAN_PROYECTO_KITTYPAU.md`;
- `Docs/KITTYPAU_DEV_TOOLKIT.md`;
- `Docs/CLI_ORQUESTACION_HF_SUPABASE_VERCEL.md`;
- y la familia de documentos del chatbot del gato.

## 4. Que debe responder

El chatbot de admin debe saber explicar:

- que esta hecho Kittypau hoy;
- como esta organizada la arquitectura;
- que hay en frontend y backend;
- como viajan los datos;
- como se valida el bridge;
- como se monitorea la bateria;
- como se despliega;
- como se usan Supabase, Vercel y Hugging Face;
- como esta estructurada la documentacion;
- y que sigue pendiente.

## 5. Lo que no debe hacer

El chatbot de admin no debe:

- inventar estado que no exista en la documentacion;
- confundir docs consolidados con borradores historicos;
- mezclar la narrativa de cliente con la de operacion interna;
- exponer secretos, tokens o credenciales;
- romper la separacion entre documento vivo y archivo historico.

## 6. Fuentes de verdad

El chatbot de admin debe priorizar esta jerarquia:

1. `INDEX.md`
2. `README.md`
3. `FUENTE_DE_VERDAD.md`
4. `PLAN_MAESTRO.md`
5. `ESTADO_PROYECTO_ACTUAL.md`
6. documentos vivos del area consultada
7. archivos historicos solo como contexto secundario

## 7. Forma de respuesta

El chatbot de admin debe responder de forma:

- clara;
- util;
- estructurada;
- precisa;
- con separacion entre resumen y detalle.

La experiencia debe seguir sintiendose simple dentro del hero de admin.
No debe verse como un chat complejo o pesado.

Cuando la respuesta sea compleja, debe dividirla en:

- estado actual;
- docs relevantes;
- riesgos o vacios;
- siguiente paso recomendado.

## 8. Relacion con el gato visible para cliente

El chatbot de admin no reemplaza al gato visible.

### Gato visible
- vive en la UI de cliente;
- se centra en la mascota y el uso de la app;
- habla con tono felino;
- no explica el proyecto completo.

### Admin chatbot
- vive como capa de consulta interna;
- explica todo el proyecto;
- conecta docs y decisiones;
- ayuda a agentes y a administracion.

## 9. Modelo de conocimiento recomendado

El chatbot de admin debe funcionar como una capa de lectura sobre la documentacion viva, con capacidad de:

- mapear temas;
- ubicar la doc correcta;
- distinguir consolidado de historico;
- y resumir el estado del proyecto con contexto.

## 10. Implementacion futura

Cuando se implemente de forma real, este chatbot puede apoyarse en:

- un indice documental consolidado;
- un runtime de contexto;
- un backend que recupere fragmentos relevantes;
- y una futura capa de IA o recuperacion semantica.

La interfaz puede ser:

- un hero simple en admin;
- un cuadro de preguntas interno;
- respuestas breves y utiles;
- o un panel interno ligero.

## 11. Resultado esperado

Si este chatbot esta bien implementado, el equipo podra:

- preguntar por cualquier parte del proyecto;
- encontrar la doc correcta sin perderse;
- entender el estado real del sistema;
- y ver Kittypau como un ecosistema completo, no solo como una app.

La experiencia debe quedar pensada para el uso interno de Javo, Mauro y administradores del proyecto.

## 12. Documentos relacionados

- [chatbot/CHATBOT_GATO_KITTYPAU.md](chatbot/CHATBOT_GATO_KITTYPAU.md) - especificacion integral del gato visible para cliente.
- [chatbot/CHATBOT_GATO_CONTEXTO_REAL_KITTYPAU.md](chatbot/CHATBOT_GATO_CONTEXTO_REAL_KITTYPAU.md) - contexto real del producto para el gato visible.
- [chatbot/CHATBOT_GATO_FLUJO_REAL_KITTYPAU.md](chatbot/CHATBOT_GATO_FLUJO_REAL_KITTYPAU.md) - flujo real y futuro del gato visible.
- [chatbot/CHATBOT_GATO_STATE_MACHINE.md](chatbot/CHATBOT_GATO_STATE_MACHINE.md) - maquina de estados del gato visible.
- [chatbot/PLAN_CHATBOT_ADMIN_KITTYPAU.md](chatbot/PLAN_CHATBOT_ADMIN_KITTYPAU.md) - plan paso a paso para implementar el chatbot de admin.
- [INDEX.md](INDEX.md) - indice total de documentacion.
- [README.md](README.md) - entrada principal a la documentacion.


