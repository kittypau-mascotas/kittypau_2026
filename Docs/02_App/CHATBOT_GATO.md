---
tags: [chatbot, ia, llama, huggingface, gato]
area: App
estado: activo
actualizado: 2026-06-24
---

# Chatbot Gato (IA Conversacional)

## Descripción

Sistema de chatbot integrado en la app bajo `src/chatbot-gato/`. Usa un modelo Llama 3.1 8B hosteado en Hugging Face Spaces para responder consultas del usuario sobre su mascota y el sistema.

## Stack

| Componente | Tecnología |
|---|---|
| Modelo | `meta-llama/Llama-3.1-8B-Instruct` |
| Hosting modelo | Hugging Face Spaces |
| Integración | Variable `HF_TOKEN` + `HF_MODEL` |
| Frontend | `src/chatbot-gato/` |

## Variables de entorno requeridas

```
HF_TOKEN=hf_...          # Token de acceso Hugging Face
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

## Ubicación en el repo

```
kittypau_app/
└── src/
    └── chatbot-gato/    ← Componentes y lógica del chatbot
```

## HF Spaces relacionados

```
hf-spaces/
├── admin/               ← Space admin HF
└── gato/                ← Space del chatbot gato
```

## Links relacionados

- [[../05_DevOps/ENV_VARIABLES]]
- [[ESTRUCTURA_APP]]
- [[../01_Arquitectura/MAPA_ECOSISTEMA]]
