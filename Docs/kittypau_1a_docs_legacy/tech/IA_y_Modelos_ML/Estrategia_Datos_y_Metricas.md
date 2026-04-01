# Estrategia de Datos, MÃ©tricas y Modelos de IA

> Estado: **LEGACY**. Complemento conceptual; no necesariamente refleja el pipeline/tabla actual.
> Referencias vigentes: `Docs/archive/analitica/KittyPau_Arquitectura_Datos_v3.md` (datos/ML) y `Docs/ADMIN_DASHBOARD_INFORMATION_ARCHITECTURE.md` (KPIs admin).

Este documento centraliza la estrategia para la recolecciÃ³n, anÃ¡lisis y utilizaciÃ³n de datos en el proyecto KittyPaw. Incluye mÃ©tricas de negocio (externas), mÃ©tricas de producto (internas) y la planificaciÃ³n para los modelos de Machine Learning.

---

## 1. MÃ©tricas Clave (KPIs)

### 1.1. MÃ©tricas de Negocio (Externas)
*   **AdquisiciÃ³n de Usuarios:** NÂº de registros nuevos por semana/mes.
*   **RetenciÃ³n de Usuarios:** Porcentaje de usuarios activos despuÃ©s de 1, 3, 6 meses.
*   **Engagement:** Frecuencia con la que los usuarios abren la app y consultan el dashboard.

### 1.2. MÃ©tricas de Producto (Internas)
*   **Salud de la Plataforma:** Uptime del servidor, latencia de la API.
*   **Fiabilidad del Dispositivo:** NÂº de dispositivos que se desconectan, vida de la baterÃ­a (si aplica).
*   **PrecisiÃ³n de los Eventos:** Porcentaje de eventos de "comida/bebida" detectados correctamente.

---

## 2. Estrategia de Machine Learning (Fase Futura)

El objetivo a largo plazo es utilizar los datos para ofrecer insights predictivos sobre la salud de las mascotas.

### 2.1. Modelo 1: DetecciÃ³n de Comportamiento en el Plato

*   **Pregunta:** Â¿CÃ³mo identificar si el peso en el plato es la mascota o si simplemente se estÃ¡ rellenando el plato?
*   **Propuesta de SoluciÃ³n:**
    1.  **AnÃ¡lisis de Patrones de Peso:** Un evento de "comida" real tiene un patrÃ³n caracterÃ­stico: el peso disminuye lentamente en pequeÃ±as cantidades durante un perÃ­odo de tiempo. Un "rellenado" es un aumento de peso brusco y Ãºnico.
    2.  **Sensor de Proximidad (Mejora Futura):** AÃ±adir un sensor infrarrojo simple podrÃ­a confirmar la presencia fÃ­sica de la mascota, haciendo la detecciÃ³n mucho mÃ¡s fiable.
    3.  **IdentificaciÃ³n por Peso (Muy Avanzado):** Distinguir una mascota de otra por su peso es complejo. RequerirÃ­a que cada mascota tuviera un peso muy estable y diferente al de las otras, y que la balanza fuera extremadamente precisa. Se considera fuera del alcance para la fase inicial.

### 2.2. Modelo 2: PredicciÃ³n de Enfermedades (VisiÃ³n a Largo Plazo)

*   **Pregunta:** Â¿CuÃ¡ntos gatos y perros necesito para tener un sistema de predicciÃ³n aceptable?
*   **Respuesta Preliminar:**
    *   **No hay un nÃºmero mÃ¡gico.** La cantidad depende de la **especificidad de la enfermedad** que se quiera predecir. Predecir un "malestar general" (basado en la falta de apetito) es mÃ¡s fÃ¡cil que predecir una "enfermedad renal".
    *   **Calidad sobre Cantidad:** Es mÃ¡s valioso tener **datos detallados y continuos de 100 mascotas durante un aÃ±o**, que datos esporÃ¡dicos de 5,000 mascotas. Necesitamos el historial completo (antes, durante y despuÃ©s) de un diagnÃ³stico confirmado por un veterinario.
    *   **EstimaciÃ³n Inicial:** Para empezar a encontrar patrones significativos para enfermedades comunes (ej. problemas urinarios, diabetes felina), probablemente necesitarÃ­amos un dataset de **al menos 500-1,000 mascotas con historiales de datos de mÃ¡s de 6 meses**.
    *   **Estrategia:** La fase inicial del proyecto **es** la fase de recolecciÃ³n de datos. Debemos enfocarnos en conseguir usuarios iniciales (beta testers) y registrar sus datos de la forma mÃ¡s limpia posible.

---

## 3. Plan de RecolecciÃ³n de Datos

1.  **Fase Actual:** Implementar la lÃ³gica del "dispositivo inteligente" para registrar eventos de comida/bebida con alta precisiÃ³n (timestamp, duraciÃ³n, cantidad).
2.  **Lanzamiento Beta:** Invitar a un grupo de dueÃ±os de mascotas para que usen el sistema, idealmente con un diario de salud para correlacionar los datos con eventos reales.
3.  **ColaboraciÃ³n Veterinaria:** En una fase mÃ¡s madura, buscar colaboraciones con clÃ­nicas veterinarias para obtener datos etiquetados profesionalmente.

