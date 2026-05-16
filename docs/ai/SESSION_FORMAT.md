# AI session format

## Goal
Define a portable chat session format for local AI, hosted AI and future RAG features.

## JSON shape

```json
{
  "version": 1,
  "id": "session-id",
  "title": "Session title",
  "provider": "ollama-local",
  "model": "llama3.1",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z",
  "system": "System instruction",
  "messages": [
    { "role": "user", "content": "Question", "created_at": "2026-01-01T00:00:00.000Z" },
    { "role": "assistant", "content": "Answer", "created_at": "2026-01-01T00:00:00.000Z" }
  ],
  "metadata": {
    "source": "ollama-chat-lab",
    "tags": []
  }
}
```

## Rules
- Keep sessions exportable as JSON.
- Do not include API keys or secrets.
- RAG citations should be added as metadata, not mixed into raw content.
- For multi-user backends, store workspace and owner server-side.

## Next implementation
- Add export/import for chat sessions.
- Add local session list.
- Add session title rename.
- Add optional RAG source metadata later.
