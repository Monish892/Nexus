# NEXUS

AI Developer Intelligence & Career Engineering Platform.

## Day 1 foundation

This repository contains the initial production-oriented boundaries for the web app, API, AI service, PostgreSQL, Redis, and CI. Feature modules are intentionally added incrementally with verified quality gates.

## Local development

1. Copy `.env.example` to `.env` and adjust values.
2. Run `npm install`.
3. Start infrastructure with `docker compose up -d`.
4. Run `npm run dev:web`, `npm run dev:api`, and `python -m uvicorn services.ai.main:app --reload --port 8000` in separate terminals.

## Checks

`npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` are the Day 1 quality-gate commands. The project currently has service smoke tests only; domain tests will be introduced with each module.

Authentication setup requires `DATABASE_URL`, `WEB_ORIGIN`, and optionally `SESSION_TTL_DAYS`. Apply the checked-in migration with `npm run prisma:migrate --workspace @nexus/api` after PostgreSQL is available, or validate with `DATABASE_URL=... npm run prisma:validate --workspace @nexus/api`.

Auth routes are `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, and `GET /auth/me`. Profile routes are `GET /profile` and `PATCH /profile`. Sessions are opaque HTTP-only cookies; passwords are bcrypt-hashed and never returned.

See [architecture documentation](docs/architecture.md) and [development log](docs/development-log.md).
