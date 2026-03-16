# Resumen del Tablero de Miro: KittyPaw

Este documento resume el contenido exportado del tablero de Miro relacionado con el proyecto KittyPaw.

## 1. Modelo de Negocio (Business Model Canvas)

### Socios Clave
- Proveedores de Servicios Cloud (AWS)
- Desarrolladores de Software y UX/UI
- Fabricantes de Hardware y Sensores
- Universidades o Centros de Investigación en Veterinaria y Tecnología
- Aliados en Distribución Veterinaria y Pet-Tech
- Inversionistas o Fondos de Innovación Tecnológica

### Actividades Clave
- Desarrollo y Optimización del Dispositivo IoT
- Implementación de la Plataforma Web y App Móvil
- Integración de Inteligencia Artificial
- Captación y Soporte a Usuarios Tempranos (prototipo)
- Campañas de Marketing y Concientización
- Escalabilidad y Automatización

### Propuestas de Valor
- Monitoreo Inteligente y en Tiempo Real
- Detección Temprana de Problemas de Salud
- Control y Gestión de Alimentación
- Recomendaciones Personalizadas
- Conexión Emocional y Tranquilidad
- Accesible desde Múltiples Dispositivos

### Relaciones con los Clientes
- Automatizada y Continua (día a día)
- Soporte Personalizado (según necesidad)
- Actualizaciones Frecuentes (mensuales o bimensuales)
- Feedback y Comunidad (periódicamente)
- Educación y Fidelización (continuo)

### Segmentos de Clientes
- Dueños de mascotas preocupados por su bienestar
- Amantes de la tecnología ("pet lovers tech-savvy")
- Veterinarios y clínicas veterinarias
- "Pet parents" primerizos
- Personas con mascotas enfermas o en dieta controlada

### Recursos Clave
- Recursos Tecnológicos
- Recursos Humanos
- Conocimiento y Datos
- Capital y Financiamiento
- Red de Socios y Distribución
- Propiedad intelectual y licencias

### Canales
- Canales Digitales Directos (Web, App, RRSS)
- Marketplaces (Mercado Libre, Amazon, Falabella Marketplace)
- Alianzas con clínicas veterinarias y tiendas de mascotas
- Ferias, expos y eventos del rubro pet/tech
- Correo electrónico y newsletters

### Estructura de Costos
- Se detalla en tablas separadas para Dispositivo, App/Software y Diseño/Desarrollo.
- Componentes principales: Microcontrolador ESP32, sensores, hosting (AWS), dominio, APIs, desarrollo de software, diseño y prototipado.

### Flujos de Ingresos
- Modelo de ingresos mixto:
  - Venta de dispositivos inteligentes.
  - Suscripción mensual a la app premium (con IA, reportes y soporte).
  - Ingresos adicionales (no especificados).

## 2. Aspectos Técnicos

### Dispositivo IoT
- **Microcontrolador:** ESP32 DevKitC, ESP32-CAM.
- **Sensores:** BME280 (humedad/temperatura), HX711 (peso), BH1750 (luz).
- **Carcasa:** Impresión 3D PLA.

### Software, App y Servicios
- **Backend:** Se menciona tanto Django como Node.js. La lógica más reciente parece apuntar a un backend híbrido o una migración a Node.js para tiempo real (WebSockets, MQTT) y Django para API de datos históricos.
- **Frontend:** React.
- **Base de Datos:** PostgreSQL (menciona AWS RDS, Neon, Supabase).
- **Plataforma Móvil:** Capacitor para generar APK de Android.
- **Cloud:** AWS (EC2, S3, RDS).
- **Otros:** Grafana/InfluxDB para analíticas, Meta/Twilio para API de WhatsApp.

### Inteligencia Artificial y Machine Learning
- **Objetivo:** Reconocimiento facial de perros y gatos, identificación de razas, detección de información nutricional de alimentos.
- **Modelos:** Se mencionan Redes Neuronales Convolucionales (CNN), modelos Densos y CNN con Dropout.
- **Herramientas:** TensorFlow, Keras, Google Colab, Hugging Face Datasets.
- **Bases de datos de imágenes:** Se mencionan Kaggle (Human Faces) y TensorFlow Datasets (cats_vs_dogs).

## 3. Gestión y Tareas

### Estado de Tareas
- **Pendientes:** Mis redes Sociales.
- **En Progreso:** PPT DIPLOMADO KITTYPAW.
- **Terminado:** No se listan tareas específicas.

### Constitución de Empresa
- Se detallan los 6 pasos para la constitución de una empresa SpA en Chile, desde la redacción de la escritura hasta la apertura de una cuenta bancaria.
- Se mencionan trámites como el registro de marca en INAPI y la obtención de RUT en el SII.

## 4. Diseño y Branding

### Paleta de Colores
- **Principal:** Coral (`#F87A6D`), Beige Rosado (`#EBB7AA`), Verde Suave (`#99B898`).
- **Fondos:** Blanco cálido (`#FFFAF7`), Blanco (`#ffffff`).
- **Texto:** Gris Oscuro (`#2A363B`).

### Tipografía
- **Títulos:** "Titan One", sans-serif.
- **Cuerpo de texto:** "Varela Round", sans-serif.

## 5. Recursos y Enlaces Externos

- **Google Drive:** Varios enlaces a carpetas con documentos de constitución, bases de concursos, etc.
- **Google Colab:** Notebooks para reconocimiento de imágenes.
- **Hugging Face:** Dataset `Javomauro/kittypaw_replit_ddbb`.
- **Plataformas de Cloud/DB:** Render, Supabase, Neon.
- **APIs de imágenes:** Unsplash, The Cat API, Dog API, Pixabay.
- **Instituciones:** CORFO, ProChile, Chiletec, Startup Chile, SERCOTEC.
- **Legales:** registrodemarcaschile.cl, inapi.cl, registrodeempresasysociedades.cl.
