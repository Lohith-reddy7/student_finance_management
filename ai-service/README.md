# LearnAI - AI Microservice

This lightweight microservice provides endpoints for extracting text from uploaded PDFs/TXT, summarization, and question-answering over a document. It is intentionally independent from the main backend so you can iterate or scale the AI separately.

## Quick start

1. Install dependencies

```bash
cd ai-service
npm install
```

2. Create `.env` next to `package.json` and set:

```
PORT=9000
OPENAI_API_KEY=sk-...
```

3. Run in development:

```bash
npm run dev
```

## Endpoints

- `POST /api/extract` — form `file` upload (PDF/TXT). Returns `{ text }`.
- `POST /api/summarize` — accepts `{ text }` or `file` upload. Returns `{ summary }`.
- `POST /api/qa` — accepts `{ text, question }` or `file` + `question`. Returns `{ answer }`.

## Integration notes

- Call these endpoints from your backend or frontend. For instance, when a document is uploaded to the main backend, you can forward the file to `POST http://localhost:9000/api/summarize` and store the returned summary in your database.
- The service prefers an OpenAI API key (set as `OPENAI_API_KEY`) and will fall back to simple local heuristics when the key is missing.

## Next improvements

- Add embeddings + vector DB for accurate long-document QA.
- Add authentication between services.
- Persist document text + embeddings for cheaper repeated queries.
