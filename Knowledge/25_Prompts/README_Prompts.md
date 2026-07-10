---
id: readme_prompts
title: Prompts Reutilizables — Kittypau
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - prompts
  - claude
  - cursor
  - ia
related:
  - [[00_HOME]]
  - [[13_Features/README_ShapeFeatures]]
  - [[10_Datasets/README_Datasets]]
  - [[11_ModelosIA/MOC_ModelosIA]]
---

# Prompts Reutilizables — Kittypau

> Prompts calibrados para tareas recurrentes del proyecto. Usar con Claude Code o Cursor.
> Copiar el bloque entero, incluyendo el contexto del sistema cuando se indica.

---

## Análisis de features

### Explicar una feature por nombre

```
Contexto: proyecto Kittypau, IoT monitoring de alimentación e hidratación de mascotas.
Motor Matemático v2: 102 features extraídas de señales de peso (HX711, 30s sampling).
Documentos: Knowledge/13_Features/README_ShapeFeatures.md y ATLAS_Features_v2.md

Explica la feature `[NOMBRE_FEATURE]`:
- ¿Qué mide matemáticamente?
- ¿Por qué discrimina alimentación vs servido?
- ¿En qué familia (F00–F14) cae?
- ¿Cuál es su separabilidad reportada (sep A/S)?
```

### Comparar dos candidatos

```
Tengo dos candidatos del dataset readings_rows.csv para KPCL0034 "Bandida":
Candidato A: [pegar array de valores de peso]
Candidato B: [pegar array de valores de peso]

Usa las familias F00–F14 del Motor v2 para determinar:
1. ¿Cuál es más probablemente alimentación?
2. ¿Cuál es más probablemente servido?
Justifica con las features más discriminativas (tpl_doble_rampa, tpl_sigmoide).
```

---

## Base de datos

### Auditar tabla nueva

```
Contexto: Supabase proyecto Kittypau, tablas core en Knowledge/06_BaseDatos/README_BaseDatos.md
Nueva tabla a auditar: [nombre_tabla]
Schema: [pegar CREATE TABLE]

Verifica:
1. ¿Tiene RLS habilitado?
2. ¿Los campos tienen tipos correctos (uuid, timestamptz, text vs varchar)?
3. ¿El nombre sigue la convención snake_case del proyecto?
4. ¿Hay índices faltantes obvios?
5. ¿Está en la lista de tablas del README_BaseDatos? Si no, agrégala.
```

### Consulta analítica

```
Contexto: Supabase Kittypau.
Tablas disponibles: readings, profiles, pets, devices, audit_events, device_bowl_sessions.
Schema completo en Knowledge/06_BaseDatos/README_BaseDatos.md.

Escribe una consulta SQL para: [descripción de lo que necesito]
Restricciones: solo usar tablas activas (no usar sensor_readings ni breeds).
```

---

## MQTT / Bridge

### Debug de payload

```
Bridge v3.2 Kittypau — Raspberry Pi Zero 2W.
HiveMQ Cloud: cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud port 8883 (TLS).
Topics en Knowledge/07_MQTT/README_MQTT.md.

Payload recibido en topic [TOPIC]:
[pegar payload JSON]

¿Es válido según el schema? ¿Qué campo podría fallar al escribir en Supabase?
```

---

## App / Frontend

### Revisar componente

```
Stack: Next.js 16.1.6 + React 19.2.3 + Tailwind 4 + Supabase 2.106.1.
Carpeta de app: src/ (ver Knowledge/04_Frontend/README_Frontend.md para estructura).
Enums oficiales en Knowledge/01_Proyecto/ENUMS_OFICIALES.md.

Componente a revisar: [pegar código]

¿Usa valores hardcodeados que deberían ser enums? ¿Hay llamadas a API no tipadas?
¿El estado de mascota/dispositivo sigue la máquina de estados oficial?
```

### Nuevo endpoint API

```
Proyecto Kittypau — Next.js API Routes en src/app/api/.
Contratos en Knowledge/05_API/README_API.md.
Auth: Supabase JWT — todas las rutas protegidas requieren header Authorization: Bearer <token>.

Crea un endpoint [METHOD] /api/[ruta] que:
[descripción funcional]

Seguir el patrón de los endpoints existentes. Usar service_role solo si es necesario.
```

---

## Machine Learning

### Evaluar nueva feature

```
Motor Matemático v2: 102 features, familias F00–F14, numpy/scipy only.
Dataset: anotaciones_av2.csv — 421 filas (alim=209, serv=45, ruido=167).
Métricas clave: sep_AS (separabilidad Alimentación vs Servido) y sep_AR (vs Ruido).

Propongo agregar la feature: [descripción]
Familia sugerida: [FXX]
Implementación: [pegar función Python]

¿Cómo calcularías su separabilidad? ¿Hay riesgo de colinealidad con features existentes?
¿Debería reemplazar a `tpl_plateau` (sep_AS=0.0, siempre constante)?
```

---

## Anotación

### Revisar candidato dudoso

```
Soy el anotador humano de Kittypau. Tengo un candidato con categoría ambigua.
Categorías: alimentacion | servido | ruido | ciclo_servido_alimento.
Evidence scores del Motor v2: alim=[X], serv=[Y], ruido=[Z].

Señal de peso: [pegar array]
Duración: [N] lecturas × 30s = [M] segundos.
Contexto: [hora del día, si se sabe]

¿Qué categoría recomiendas y por qué?
```

---

## Documentación / Vault

### Crear ADR

```
Usando el template Knowledge/_Templates/TPL_ADR.md del vault Obsidian de Kittypau.
ADRs existentes en Knowledge/23_Decisiones/ (ver MOC_ADR.md).

Decisión a documentar: [título]
Contexto: [por qué se tuvo que decidir]
Opción elegida: [qué se eligió]
Alternativas rechazadas: [qué se descartó y por qué]

Genera el ADR completo en formato vault (frontmatter + wikilinks).
```

---

## Ver también

- [[26_MCP/README_MCP]] — configuración MCP para que Claude lea el vault directamente
- [[27_RAG/README_RAG]] — búsqueda semántica sobre documentación
- [[11_ModelosIA/MOC_ModelosIA]] — modelos de IA del proyecto
