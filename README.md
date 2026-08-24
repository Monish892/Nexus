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

See [architecture documentation](docs/architecture.md) and [development log](docs/development-log.md).
