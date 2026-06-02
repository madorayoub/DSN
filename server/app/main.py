import logging
from fastapi import FastAPI
from app.routes import ghl, zoom
import uvicorn

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(title="DSN Orchestrator")

app.include_router(ghl.router, prefix="/webhook/ghl", tags=["GHL"])
app.include_router(zoom.router, prefix="/cron/zoom", tags=["Zoom"])


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
