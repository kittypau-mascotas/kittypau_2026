# Roadmap de Desarrollo del Proyecto KittyPaw (Versión Corregida)

Este documento describe la hoja de ruta propuesta para el desarrollo continuo del proyecto KittyPaw, ajustada para centrarse en las funcionalidades core de monitoreo de mascotas.

---

## Fase 1: Consolidación y Pruebas (Próximos 1-2 meses)

**Objetivo:** Asegurar que la plataforma actual sea estable, segura y que todos sus componentes estén perfectamente integrados. Preparar el terreno para un lanzamiento controlado o beta.

### 1.1. Integración End-to-End
- **Tarea:** Conectar y verificar el flujo completo de datos: `iot_firmware` -> `AWS IoT/MQTT` -> `server` -> `Base de Datos` -> `client`.
- **Resultado Esperado:** Datos de los sensores (peso, temperatura, etc.) visibles en tiempo real en la `app_principal`.

### 1.2. Pruebas Exhaustivas
- **Tarea:** Desarrollar un plan de pruebas unitarias y de integración para el backend y el frontend.
- **Resultado Esperado:** Un sistema fiable con una cobertura de pruebas que garantice la estabilidad en futuros desarrollos.

### 1.3. Refinamiento de UI/UX
- **Tarea:** Realizar una revisión completa de la `app_principal` para mejorar la usabilidad y la experiencia de usuario.
- **Resultado Esperado:** Una interfaz intuitiva y estéticamente agradable para visualizar los datos de la mascota.

### 1.4. Pipeline de Despliegue (CI/CD)
- **Tarea:** Configurar un pipeline de integración y despliegue continuo utilizando Docker.
- **Resultado Esperado:** Despliegues automatizados y consistentes.

---

## Fase 2: Expansión de Funcionalidades Core (Próximos 3-6 meses)

**Objetivo:** Enriquecer la experiencia del usuario añadiendo funcionalidades clave de monitoreo y mejorando el hardware.

### 2.1. `app_principal` - Dashboard de Datos
- **Tarea:** Implementar un dashboard claro y efectivo que muestre gráficos históricos y el estado actual de los sensores.
- **Resultado Esperado:** Los usuarios pueden ver tendencias en el peso, alimentación y actividad de su mascota.

### 2.2. `iot_firmware` - Mejoras y Nuevos Sensores
- **Tarea:** Implementar actualizaciones de firmware Over-the-Air (OTA). Investigar y añadir un nuevo sensor relevante (ej. sensor de nivel de agua/comida).
- **Resultado Esperado:** Dispositivos actualizables remotamente y con mayor capacidad de monitoreo.

### 2.3. Notificaciones y Alertas
- **Tarea:** Desarrollar un sistema de notificaciones (push/email) para eventos importantes (ej. "Nivel de comida bajo", "Cambio de peso inusual").
- **Resultado Esperado:** Comunicación proactiva con el usuario.

### 2.4. `app_camara` - Integración de Vídeo (Postergado)
- **Tarea:** Integrar el streaming de la cámara y los eventos del modelo de IA en la `app_principal`.
- **Nota:** Esta funcionalidad se abordará después de consolidar las funciones básicas de sensores.

---

## Fase 3: Madurez y Analítica (Próximos 6-12 meses)

**Objetivo:** Utilizar los datos recopilados para ofrecer un valor añadido significativo al usuario.

### 3.1. Perfiles de Salud Detallados
- **Tarea:** Expandir los perfiles de las mascotas para incluir un historial de salud completo (vacunas, visitas al veterinario, etc.).
- **Resultado Esperado:** Un registro centralizado de la salud de la mascota.

### 3.2. `dashboard_datos` - Insights para el Usuario
- **Tarea:** Utilizar los datos analizados para ofrecer al usuario insights y recomendaciones personalizadas sobre la salud y comportamiento de su mascota.
- **Resultado Esperado:** Informes de tendencias y consejos prácticos visibles en la `app_principal`.

---

## Fase 4: Optimización y Escalado (Continuo)

**Objetivo:** Asegurar que la plataforma pueda crecer de manera sostenible.

### 4.1. Escalado de Infraestructura
- **Tarea:** Optimizar y escalar la arquitectura en la nube para soportar una mayor carga de dispositivos y usuarios.
- **Resultado Esperado:** Una plataforma robusta y de alto rendimiento.

### 4.2. API Pública
- **Tarea:** Diseñar y documentar una API para futuras integraciones.
- **Resultado Esperado:** Apertura de la plataforma a nuevas posibilidades.

---

## Anexo: Plan de Implementación de Negocio por Fases

Este anexo complementa el roadmap técnico con una visión de negocio.

1.  **Fase Piloto / Beta:**
    *   Lanzar con un hardware mínimo y la suscripción de Nivel Básico.
    *   Enfocarse en un grupo pequeño de `early adopters` para recoger feedback.
    *   Asegurar la calidad del producto y la fiabilidad del servicio.

2.  **Fase de Lanzamiento Comercial:**
    *   Lanzar el Nivel Plus para el mercado general.
    *   Iniciar las campañas de marketing de adquisición de clientes.
    *   Establecer las primeras alianzas con clínicas veterinarias.

3.  **Fase de Crecimiento y Expansión:**
    *   Agregar las funcionalidades avanzadas del Nivel Pro (IA, reconocimiento por cámara).
    *   Expandir a nuevos mercados regionales o segmentos de cliente (ej. criadores, hoteles de mascotas).

4.  **Fase de Ecosistema:**
    *   Desarrollar la API pública.
    *   Fomentar integraciones con terceros y explorar el modelo de marketplace.