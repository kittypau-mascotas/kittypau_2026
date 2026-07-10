---
id: adr_002_supabase
title: "ADR-002: Supabase como backend principal"
type: adr
status: accepted
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - adr
  - supabase
  - backend
  - base-de-datos
related:
  - [[23_Decisiones/MOC_ADR]]
  - [[06_BaseDatos/README_BaseDatos]]
  - [[03_Backend/README_Backend]]
---

# ADR-002: Supabase como backend principal

**Estado:** Accepted  
**Fecha:** 2026 (arquitectura inicial)  
**Área:** Backend / Base de datos

---

## Contexto

Se necesita un backend que provea auth, base de datos, storage y funciones serverless,
sin operar servidores propios. El proyecto está en etapa startup — velocidad de desarrollo
y costo importan más que control total.

---

## Opciones consideradas

| Opción | Ventaja | Desventaja |
|--------|---------|------------|
| Supabase (elegida) | Auth + DB + Realtime + Edge Functions integrados, open source | Vendor lock-in moderado, límites en capa free |
| Firebase | Ecosistema maduro, fácil integración | Costo, no SQL |
| Backend propio (Node/Express + Postgres) | Control total | Costo operativo, tiempo de setup |
| PlanetScale / Neon | SQL serverless barato | Sin auth ni realtime integrado |

---

## Decisión

Supabase como única fuente de datos del producto. PostgreSQL para datos relacionales,
Auth para usuarios, Realtime para actualizaciones en vivo, Edge Functions para lógica
serverless. Upstash Redis para caché y cron adicional.

---

## Consecuencias

**Positivas:**
- Una sola plataforma para auth + DB + realtime + functions
- pgvector disponible para RAG/embeddings futuros sin infraestructura adicional
- RLS (Row Level Security) para seguridad por usuario sin lógica extra en el servidor
- Dashboard visual para consultas SQL rápidas

**Negativas / trade-offs:**
- Límites en la capa gratuita (especialmente connections y storage)
- Dual DB (principal + analytics separado) agrega complejidad de configuración
- El cliente de Supabase en browser expone la `anon key` — requiere RLS bien configurado

---

## Ver también

- [[06_BaseDatos/README_BaseDatos]]
- [[03_Backend/README_Backend]]
