from datetime import datetime, timezone
from fastapi import FastAPI

app = FastAPI(title="NEXUS AI Service", version="0.1.0")

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai", "timestamp": datetime.now(timezone.utc).isoformat()}
