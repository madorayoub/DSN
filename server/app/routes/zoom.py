from fastapi import APIRouter, BackgroundTasks, Query
from app.services import zoom as zoom_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/run")
async def run_zoom_sync(
    background_tasks: BackgroundTasks,
    days_back: int = Query(default=1, description="How many days back to sync")
):
    """
    Triggered by Railway cron job (daily) or manually.
    Pass ?days_back=30 to do a full backfill.
    """
    background_tasks.add_task(zoom_service.sync_meetings, days_back=days_back)
    return {"status": "zoom_sync_started", "days_back": days_back}
