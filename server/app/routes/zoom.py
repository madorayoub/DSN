from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from app.services import zoom as zoom_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/run")
async def run_zoom_sync(
    background_tasks: BackgroundTasks,
    days_back: int = Query(default=1, description="How many days back to sync"),
    from_date: str | None = Query(default=None, description="YYYY-MM-DD, overrides days_back"),
    to_date: str | None = Query(default=None, description="YYYY-MM-DD, defaults to today"),
):
    """
    Triggered by the in-process scheduler (3x daily) or manually.

    Pass ?days_back=90 for a backfill, or an explicit ?from_date=&to_date= to
    re-run a window that has already scrolled out of range. Either way the request
    is split into <=30-day chunks, because Zoom silently truncates wider ranges.
    """
    try:
        from_d, to_d = zoom_service._resolve_range(days_back, from_date, to_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    background_tasks.add_task(
        zoom_service.sync_meetings,
        days_back=days_back,
        from_date=from_date,
        to_date=to_date,
    )
    return {
        "status": "zoom_sync_started",
        "from": str(from_d),
        "to": str(to_d),
        "windows": len(zoom_service._date_windows(from_d, to_d)),
    }
