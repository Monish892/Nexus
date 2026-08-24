# NEXUS Architecture

NEXUS is organized as a small monorepo: `apps/web` owns the responsive Next.js experience, `apps/api` owns authenticated domain APIs, and `services/ai` owns Python AI workflows. PostgreSQL is the source of truth; Redis will support caching and BullMQ jobs as domain modules arrive.

```mermaid
flowchart LR
  Web[Next.js web] --> API[TypeScript API]
  API --> DB[(PostgreSQL)]
  API --> Redis[(Redis / jobs)]
  API --> AI[FastAPI AI service]
  AI --> Vector[(pgvector / future)]
```

Day 1 deliberately establishes contracts and runtime health endpoints before feature modules.
