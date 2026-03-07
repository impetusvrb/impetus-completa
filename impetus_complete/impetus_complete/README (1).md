# IMPETUS - Scaffold (Integrated)

This scaffold includes backend, frontend, DB migrations and diagnostic + proacao modules integrated.

## Quick start (local)

1. Ensure Docker and Docker Compose are installed.
2. Copy `.env` with your variables, e.g.: `OPENAI_API_KEY=sk-xxx`
3. Run: `docker-compose up --build`
4. Apply migrations: connect to Postgres and run `backend/src/models/migrations.sql` and `backend/src/models/proacao_diag_migration.sql` (you can use psql).
5. Open frontend at http://localhost:3000 and backend at http://localhost:4000

Endpoints:
- /api/webhook
- /api/manuals/upload
- /api/tasks
- /api/proacao
- /api/alerts
- /api/diagnostic
- /api/diagnostic/report/:id

Notes: OpenAI key is optional; without it the AI features return safe fallbacks.
