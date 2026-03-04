# Estrategia de Datos, Métricas y Modelos de IA

Este documento centraliza la estrategia para la recolección, análisis y utilización de datos en el proyecto KittyPaw. Incluye métricas de negocio (externas), métricas de producto (internas) y la planificación para los modelos de Machine Learning.

---

## 1. Métricas Clave (KPIs)

### 1.1. Métricas de Negocio (Externas)
*   **Adquisición de Usuarios:** Nº de registros nuevos por semana/mes.
*   **Retención de Usuarios:** Porcentaje de usuarios activos después de 1, 3, 6 meses.
*   **Engagement:** Frecuencia con la que los usuarios abren la app y consultan el dashboard.

### 1.2. Métricas de Producto (Internas)
*   **Salud de la Plataforma:** Uptime del servidor, latencia de la API.
*   **Fiabilidad del Dispositivo:** Nº de dispositivos que se desconectan, vida de la batería (si aplica).
*   **Precisión de los Eventos:** Porcentaje de eventos de "comida/bebida" detectados correctamente.

---

## 2. Estrategia de Machine Learning (Fase Futura)

El objetivo a largo plazo es utilizar los datos para ofrecer insights predictivos sobre la salud de las mascotas.

### 2.1. Modelo 1: Detección de Comportamiento en el Plato

*   **Pregunta:** ¿Cómo identificar si el peso en el plato es la mascota o si simplemente se está rellenando el plato?
*   **Propuesta de Solución:**
    1.  **Análisis de Patrones de Peso:** Un evento de "comida" real tiene un patrón característico: el peso disminuye lentamente en pequeñas cantidades durante un período de tiempo. Un "rellenado" es un aumento de peso brusco y único.
    2.  **Sensor de Proximidad (Mejora Futura):** Añadir un sensor infrarrojo simple podría confirmar la presencia física de la mascota, haciendo la detección mucho más fiable.
    3.  **Identificación por Peso (Muy Avanzado):** Distinguir una mascota de otra por su peso es complejo. Requeriría que cada mascota tuviera un peso muy estable y diferente al de las otras, y que la balanza fuera extremadamente precisa. Se considera fuera del alcance para la fase inicial.

### 2.2. Modelo 2: Predicción de Enfermedades (Visión a Largo Plazo)

*   **Pregunta:** ¿Cuántos gatos y perros necesito para tener un sistema de predicción aceptable?
*   **Respuesta Preliminar:**
    *   **No hay un número mágico.** La cantidad depende de la **especificidad de la enfermedad** que se quiera predecir. Predecir un "malestar general" (basado en la falta de apetito) es más fácil que predecir una "enfermedad renal".
    *   **Calidad sobre Cantidad:** Es más valioso tener **datos detallados y continuos de 100 mascotas durante un año**, que datos esporádicos de 5,000 mascotas. Necesitamos el historial completo (antes, durante y después) de un diagnóstico confirmado por un veterinario.
    *   **Estimación Inicial:** Para empezar a encontrar patrones significativos para enfermedades comunes (ej. problemas urinarios, diabetes felina), probablemente necesitaríamos un dataset de **al menos 500-1,000 mascotas con historiales de datos de más de 6 meses**.
    *   **Estrategia:** La fase inicial del proyecto **es** la fase de recolección de datos. Debemos enfocarnos en conseguir usuarios iniciales (beta testers) y registrar sus datos de la forma más limpia posible.

---

## 3. Plan de Recolección de Datos

1.  **Fase Actual:** Implementar la lógica del "dispositivo inteligente" para registrar eventos de comida/bebida con alta precisión (timestamp, duración, cantidad).
2.  **Lanzamiento Beta:** Invitar a un grupo de dueños de mascotas para que usen el sistema, idealmente con un diario de salud para correlacionar los datos con eventos reales.
3.  **Colaboración Veterinaria:** En una fase más madura, buscar colaboraciones con clínicas veterinarias para obtener datos etiquetados profesionalmente.
