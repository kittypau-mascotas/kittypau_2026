"""
index_knowledge.py — Pipeline de indexación RAG del vault Kittypau.

Pasos:
  1. Lee todos los .md de Knowledge/ con frontmatter YAML
  2. Extrae body (sin frontmatter)
  3. Divide en chunks de ~500 tokens con overlap 50
  4. Genera embeddings locales (sentence-transformers, sin costo, sin red)
  5. Upsert en Supabase tabla knowledge_embeddings por doc_id + chunk_idx
  6. Log: N docs indexados, N chunks totales

Dependencias:
  pip install supabase tiktoken python-frontmatter python-dotenv sentence-transformers

SQL prerequisito — ejecutar en Supabase SQL Editor (solo primera vez):

  CREATE EXTENSION IF NOT EXISTS vector;

  DROP TABLE IF EXISTS knowledge_embeddings;

  CREATE TABLE knowledge_embeddings (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id      text        NOT NULL,
    doc_path    text        NOT NULL,
    doc_type    text        NOT NULL,
    doc_status  text,
    chunk_text  text        NOT NULL,
    chunk_idx   int         NOT NULL,
    embedding   vector(384),
    metadata    jsonb,
    created_at  timestamptz DEFAULT now(),
    UNIQUE (doc_id, chunk_idx)
  );

  CREATE INDEX IF NOT EXISTS knowledge_embeddings_embedding_idx
    ON knowledge_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

  CREATE OR REPLACE FUNCTION match_knowledge_docs(
    query_embedding vector(384),
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
    SELECT doc_id, doc_path, chunk_text,
           1 - (embedding <=> query_embedding) AS similarity
    FROM knowledge_embeddings
    WHERE (filter_type IS NULL OR doc_type = filter_type)
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
  $$;

Uso:
  python scripts/index_knowledge.py              # indexar todo
  python scripts/index_knowledge.py --dry-run    # solo contar chunks sin indexar
  python scripts/index_knowledge.py --query "tpl_doble_rampa"
  python scripts/index_knowledge.py --query "anotaciones" --type knowledge
"""

import argparse
import os
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

import frontmatter
import tiktoken

VAULT_PATH    = Path(__file__).parent.parent / "Knowledge"
CHUNK_SIZE    = 500
CHUNK_OVERLAP = 50
EMBED_MODEL   = "paraphrase-multilingual-MiniLM-L12-v2"  # 384 dims, multilingüe, gratis
TIKTOKEN_MODEL = "cl100k_base"                             # para chunking

SKIP_DIRS  = {"_Templates"}
SKIP_FILES = {"MEMORY.md"}


def get_embedder():
    from sentence_transformers import SentenceTransformer
    print(f"🤖 Cargando modelo local: {EMBED_MODEL}")
    print("   (Primera vez: descarga ~500MB. Las siguientes: <5s desde caché)\n")
    return SentenceTransformer(EMBED_MODEL)


def get_sb_client():
    from dotenv import load_dotenv
    from supabase import create_client
    env_path = Path(__file__).parent.parent / ".env.local"
    load_dotenv(env_path)
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def chunk_text(text: str, enc, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    tokens = enc.encode(text)
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + size, len(tokens))
        chunks.append(enc.decode(tokens[start:end]))
        if end == len(tokens):
            break
        start += size - overlap
    return chunks


def collect_md_files() -> list[Path]:
    files = []
    for path in sorted(VAULT_PATH.rglob("*.md")):
        if any(skip in path.parts for skip in SKIP_DIRS):
            continue
        if path.name in SKIP_FILES:
            continue
        files.append(path)
    return files


def index_vault(dry_run: bool = False) -> dict:
    enc = tiktoken.get_encoding(TIKTOKEN_MODEL)

    if not dry_run:
        model = get_embedder()
        sb    = get_sb_client()
    else:
        model = sb = None

    md_files = collect_md_files()
    total_chunks = 0
    skipped = 0

    print(f"📚 Vault: {VAULT_PATH}")
    print(f"📄 Archivos encontrados: {len(md_files)}")
    if dry_run:
        print("🔍 DRY RUN — no se indexará nada\n")
    else:
        print()

    for md_path in md_files:
        try:
            post = frontmatter.load(md_path)
        except Exception as e:
            print(f"  ⚠️  {md_path.name}: error al parsear — {e}")
            skipped += 1
            continue

        body = post.content.strip()
        if not body:
            skipped += 1
            continue

        doc_id   = md_path.stem
        doc_path = str(md_path.relative_to(VAULT_PATH))
        doc_type = post.metadata.get("type", "unknown")
        status   = post.metadata.get("status")
        tags     = post.metadata.get("tags", [])
        updated  = post.metadata.get("updated")

        chunks = chunk_text(body, enc)
        total_chunks += len(chunks)

        if dry_run:
            print(f"  📝 {doc_path} — {len(chunks)} chunks ({doc_type})")
            continue

        embeddings = model.encode(chunks, batch_size=32, show_progress_bar=False).tolist()

        rows = [
            {
                "doc_id":     doc_id,
                "doc_path":   doc_path,
                "doc_type":   doc_type,
                "doc_status": status,
                "chunk_text": chunk,
                "chunk_idx":  idx,
                "embedding":  emb,
                "metadata":   {"tags": tags, "updated": str(updated) if updated else None},
            }
            for idx, (chunk, emb) in enumerate(zip(chunks, embeddings))
        ]

        sb.table("knowledge_embeddings").upsert(
            rows,
            on_conflict="doc_id,chunk_idx",
        ).execute()

        print(f"  ✅ {doc_path} — {len(chunks)} chunks")

    print(f"\n{'─' * 50}")
    print(f"{'DRY RUN ' if dry_run else ''}Total: {len(md_files)} docs, {total_chunks} chunks, {skipped} omitidos")

    return {"archivos": len(md_files), "chunks": total_chunks, "skipped": skipped}


def search_vault(query: str, n: int = 5, doc_type: str = None) -> list[dict]:
    model = get_embedder()
    sb    = get_sb_client()

    embedding = model.encode([query])[0].tolist()

    result = sb.rpc("match_knowledge_docs", {
        "query_embedding": embedding,
        "match_count":     n,
        "filter_type":     doc_type,
    }).execute()

    print(f'\n🔍 Query: "{query}"\n')
    for i, row in enumerate(result.data, 1):
        print(f"  {i}. [{row['doc_path']}] similarity={row['similarity']:.3f}")
        print(f"     {row['chunk_text'][:120].strip()}...\n")

    return result.data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Indexar Knowledge vault en Supabase (RAG local, sin OpenAI)")
    parser.add_argument("--dry-run", action="store_true", help="Solo contar chunks, no indexar")
    parser.add_argument("--query",   type=str,            help="Buscar en el vault (requiere indexación previa)")
    parser.add_argument("--n",       type=int, default=5, help="Número de resultados en búsqueda")
    parser.add_argument("--type",    type=str, dest="doc_type", help="Filtrar por tipo de doc")
    args = parser.parse_args()

    if args.query:
        search_vault(args.query, n=args.n, doc_type=args.doc_type)
        sys.exit(0)

    index_vault(dry_run=args.dry_run)
