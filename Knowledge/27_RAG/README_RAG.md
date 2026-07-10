---
id: readme_rag
title: Pipeline RAG — Embeddings + pgvector
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - rag
  - pgvector
  - embeddings
  - supabase
  - openai
related:
  - [[00_HOME]]
  - [[26_MCP/README_MCP]]
  - [[06_BaseDatos/README_BaseDatos]]
  - [[28_KnowledgeGraph/README_KnowledgeGraph]]
---

# Pipeline RAG — Embeddings + pgvector

> Búsqueda semántica sobre toda la documentación del vault.
> Estado: **planificado** — implementar como Fase 5.
> Prerequisito: [[26_MCP/README_MCP]] completo.

---

## Objetivo

Permitir consultas en lenguaje natural sobre el vault:

```
"¿Qué feature discrimina mejor alimentación de servido?"
→ tpl_doble_rampa (7.63σ) — Knowledge/13_Features/ATLAS_Features_v2.md
```

Expuesta como herramienta en el MCP server del proyecto o desde la app admin.

---

## 5.1 — Schema en Supabase

```sql
-- Habilitar extensión (si no está activa)
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla principal de embeddings
CREATE TABLE knowledge_embeddings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id      text        NOT NULL,   -- nombre del archivo sin extensión
  doc_path    text        NOT NULL,   -- ruta relativa desde Knowledge/
  doc_type    text        NOT NULL,   -- type del frontmatter
  doc_status  text,                   -- status del frontmatter
  chunk_text  text        NOT NULL,
  chunk_idx   int         NOT NULL,
  embedding   vector(1536),           -- text-embedding-3-small
  metadata    jsonb,                  -- tags, related, updated
  created_at  timestamptz DEFAULT now(),
  UNIQUE (doc_id, chunk_idx)
);

-- Índice para búsqueda cosine
CREATE INDEX ON knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## 5.2 — Pipeline de indexación

**Archivo:** `scripts/index_knowledge.py`

```python
"""
Pipeline de indexación del vault Kittypau.

Pasos:
  1. Lee todos los .md de Knowledge/ con frontmatter YAML
  2. Extrae body (sin frontmatter)
  3. Divide en chunks de ~500 tokens con overlap 50
  4. Genera embeddings (OpenAI text-embedding-3-small)
  5. Upsert en Supabase tabla knowledge_embeddings por doc_id + chunk_idx
  6. Log: N docs indexados, N chunks totales

Dependencias:
  pip install openai supabase tiktoken pyyaml python-frontmatter
"""

import frontmatter
import tiktoken
from openai import OpenAI
from supabase import create_client
from pathlib import Path

VAULT_PATH    = Path("Knowledge/")
CHUNK_SIZE    = 500   # tokens
CHUNK_OVERLAP = 50    # tokens
MODEL_EMBED   = "text-embedding-3-small"

def chunk_text(text: str, enc, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP) -> list[str]:
    tokens = enc.encode(text)
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + size, len(tokens))
        chunks.append(enc.decode(tokens[start:end]))
        start += size - overlap
    return chunks

def index_vault():
    client_oai = OpenAI()
    client_sb  = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    enc        = tiktoken.encoding_for_model("text-embedding-3-small")

    md_files = list(VAULT_PATH.rglob("*.md"))
    total_chunks = 0

    for md_path in md_files:
        post = frontmatter.load(md_path)
        body = post.content.strip()
        if not body:
            continue

        doc_id = md_path.stem
        chunks = chunk_text(body, enc)

        rows = []
        for idx, chunk in enumerate(chunks):
            emb = client_oai.embeddings.create(
                input=chunk, model=MODEL_EMBED
            ).data[0].embedding

            rows.append({
                "doc_id":     doc_id,
                "doc_path":   str(md_path.relative_to(VAULT_PATH)),
                "doc_type":   post.metadata.get("type", "unknown"),
                "doc_status": post.metadata.get("status"),
                "chunk_text": chunk,
                "chunk_idx":  idx,
                "embedding":  emb,
                "metadata":   {
                    "tags":    post.metadata.get("tags", []),
                    "updated": post.metadata.get("updated"),
                }
            })

        client_sb.table("knowledge_embeddings").upsert(
            rows, on_conflict="doc_id,chunk_idx"
        ).execute()
        total_chunks += len(chunks)
        print(f"  ✅ {doc_id}: {len(chunks)} chunks")

    print(f"\nTotal: {len(md_files)} docs, {total_chunks} chunks")

if __name__ == "__main__":
    index_vault()
```

---

## 5.3 — Función de búsqueda

```python
def buscar_knowledge(query: str, n: int = 5, doc_type: str = None) -> list[dict]:
    """
    Búsqueda semántica sobre el vault.
    Retorna los N chunks más relevantes con su doc_path y score.
    """
    client_oai = OpenAI()
    client_sb  = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    embedding = client_oai.embeddings.create(
        input=query, model="text-embedding-3-small"
    ).data[0].embedding

    # RPC en Supabase (crear con match_knowledge_docs)
    result = client_sb.rpc("match_knowledge_docs", {
        "query_embedding": embedding,
        "match_count":     n,
        "filter_type":     doc_type,
    }).execute()

    return result.data
```

### SQL RPC `match_knowledge_docs`

```sql
CREATE OR REPLACE FUNCTION match_knowledge_docs(
  query_embedding vector(1536),
  match_count     int  DEFAULT 5,
  filter_type     text DEFAULT NULL
)
RETURNS TABLE (
  doc_id     text,
  doc_path   text,
  chunk_text text,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    doc_id, doc_path, chunk_text,
    1 - (embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings
  WHERE (filter_type IS NULL OR doc_type = filter_type)
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## Estimación de escala

| Métrica | Estimado actual |
|---|---|
| Archivos .md en vault | 43 (verificado dry-run 2026-06-28) |
| Chunks reales (~500 tok/chunk) | **128** |
| Costo de indexación inicial | ~$0.005 USD (text-embedding-3-small) |
| Re-indexación (solo cambios) | ~$0.001 USD |
| Latencia de búsqueda | <200ms |

---

## Criterio de éxito

- `knowledge_embeddings` tiene 128 chunks indexados (43 docs)
- Query "¿qué feature discrimina mejor alimentación?" devuelve `tpl_doble_rampa`
- Query "¿cuántas anotaciones hay?" devuelve chunk de README_Datasets

---

## Ver también

- [[26_MCP/README_MCP]] — acceso directo al vault (sin embeddings)
- [[06_BaseDatos/README_BaseDatos]] — schema Supabase donde vive la tabla
- [[28_KnowledgeGraph/README_KnowledgeGraph]] — ontología de entidades del proyecto
