# RAG architecture plan

## Goal
Prepare MMIR for retrieval-augmented generation without exposing documents, embeddings, database credentials or API keys in frontend code.

## Static v1
- Keep public docs and static content visible in the repo.
- Use manual prompt workflows and the app template generator.
- Do not embed private files or secrets in GitHub Pages.

## Backend v2
- Add a server-side ingestion pipeline.
- Store documents in object storage.
- Store embeddings in a vector store.
- Route chat through a backend model router.
- Enforce workspace/user permissions.

## Minimal API contract
- `POST /api/rag/search`
- `POST /api/rag/chat`
- `GET /api/rag/sources`

## Security rules
- Private sources must not be committed to public repo.
- API keys must stay server-side.
- RAG answers must cite source IDs and timestamps.

## First implementation steps
1. Define source metadata schema.
2. Add backend-only ingestion script later.
3. Add RAG source picker UI after backend exists.
4. Add evaluation set for answer quality.
