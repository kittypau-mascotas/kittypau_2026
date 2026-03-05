# Tipografía del Proyecto - KittyPaw

Este documento define las familias tipográficas, tamaños y pesos de fuente para la marca y aplicación KittyPaw.

---

## Fuentes Principales

Se han seleccionado dos fuentes principales para crear una jerarquía visual clara y una personalidad de marca amigable y moderna.

### 1. Titan One
- **Familia:** `sans-serif`
- **Uso Principal:** Títulos y elementos muy destacados (`h1`, `.app-title`).
- **Estilo:** Es una fuente con mucho cuerpo, redondeada y con gran impacto visual. Perfecta para llamar la atención.
- **Peso:** `Bold` (700).

### 2. Varela Round
- **Familia:** `sans-serif`
- **Uso Principal:** Cuerpo de texto, párrafos, subtítulos (`h2`, `h3`), etiquetas y elementos de interfaz.
- **Estilo:** Redondeada y amigable, muy legible en tamaños pequeños y medianos. Proporciona una sensación de calidez y accesibilidad.
- **Peso:** `Regular` (400).

---

## Jerarquía y Tamaños

- **Título Principal (ej. Landing Page):**
  - **Fuente:** Titan One
  - **Tamaño:** 40px

- **Títulos de Sección (Dashboard, etc.):**
  - **Fuente:** Titan One
  - **Tamaño:** 24px - 32px (h1, h2)

- **Navegación y Pestañas:**
  - **Fuente:** Varela Round
  - **Tamaño:** 20px

- **Texto General / Párrafos:**
  - **Fuente:** Varela Round
  - **Tamaño Base:** 16px

- **Texto Pequeño (Descripciones, metadatos):**
  - **Fuente:** Varela Round
  - **Tamaño:** 14px

- **Texto Muy Pequeño (Notas, etc.):**
  - **Fuente:** Varela Round
  - **Tamaño:** 12px

---

## Implementación

Estas fuentes se importan desde Google Fonts en el archivo `index.html` y se aplican globalmente a través de `index.css` utilizando las utilidades de Tailwind CSS.
