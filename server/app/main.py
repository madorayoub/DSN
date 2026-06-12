import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.routes import ghl, zoom
from app.services import zoom as zoom_service
import uvicorn

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 8 AM, 12 PM, 6 PM Central Daylight Time (UTC-5)
    scheduler.add_job(
        zoom_service.sync_meetings,
        CronTrigger(hour=13, minute=0, timezone="UTC"),
        id="sync_morning",
        kwargs={"days_back": 1},
    )
    scheduler.add_job(
        zoom_service.sync_meetings,
        CronTrigger(hour=17, minute=0, timezone="UTC"),
        id="sync_midday",
        kwargs={"days_back": 1},
    )
    scheduler.add_job(
        zoom_service.sync_meetings,
        CronTrigger(hour=23, minute=0, timezone="UTC"),
        id="sync_evening",
        kwargs={"days_back": 1},
    )
    scheduler.start()
    logger.info("Scheduler started — syncing at 08:00, 12:00, 18:00 Central (13/17/23 UTC)")
    yield
    scheduler.shutdown()


app = FastAPI(title="DSN Orchestrator", lifespan=lifespan)

app.include_router(ghl.router, prefix="/webhook/ghl", tags=["GHL"])
app.include_router(zoom.router, prefix="/cron/zoom", tags=["Zoom"])


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
