import httpx
import base64
import logging
from datetime import datetime, timedelta
from app.config import settings
from app.services import claude as claude_service
from app.services import sheets as sheets_service
from app.services import ghl as ghl_service

logger = logging.getLogger(__name__)

ZOOM_TOKEN_URL = "https://zoom.us/oauth/token"
ZOOM_BASE = "https://api.zoom.us/v2"
NO_SHOW_THRESHOLD_MINUTES = 10

# Zoom's recordings and report endpoints only honour one month per request. A
# wider from/to still returns 200 — it just silently drops the oldest part of the
# range, so a 45-day backfill quietly covers the last 30 days and no one notices.
# Every query is therefore split into chunks no wider than this.
ZOOM_MAX_WINDOW_DAYS = 30


def _resolve_range(days_back: int, from_date: str | None, to_date: str | None):
    """Return (from, to) dates. Explicit YYYY-MM-DD strings win over days_back."""
    today = datetime.utcnow().date()
    to_d = datetime.strptime(to_date, "%Y-%m-%d").date() if to_date else today
    from_d = (
        datetime.strptime(from_date, "%Y-%m-%d").date()
        if from_date
        else to_d - timedelta(days=days_back)
    )
    if from_d > to_d:
        raise ValueError(f"from_date {from_d} is after to_date {to_d}")
    return from_d, to_d


def _date_windows(from_d, to_d) -> list[tuple[str, str]]:
    """Split [from_d, to_d] into consecutive chunks of at most ZOOM_MAX_WINDOW_DAYS."""
    windows = []
    start = from_d
    while start <= to_d:
        end = min(start + timedelta(days=ZOOM_MAX_WINDOW_DAYS - 1), to_d)
        windows.append((start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")))
        start = end + timedelta(days=1)
    return windows


async def _get_access_token() -> str:
    credentials = base64.b64encode(
        f"{settings.ZOOM_CLIENT_ID}:{settings.ZOOM_CLIENT_SECRET}".encode()
    ).decode()
    async with httpx.AsyncClient() as client:
        r = await client.post(
            ZOOM_TOKEN_URL,
            params={"grant_type": "account_credentials", "account_id": settings.ZOOM_ACCOUNT_ID},
            headers={"Authorization": f"Basic {credentials}"},
        )
        r.raise_for_status()
        return r.json()["access_token"]


async def _get_report_meetings(token: str, user_id: str, from_d, to_d) -> list:
    """Reports API returns ALL past meetings, including no-shows that have no recording.

    Requires report:read:user:admin scope. Uses a real user ID because the 'me'
    alias does not resolve for S2S OAuth account credentials tokens.
    """
    headers = {"Authorization": f"Bearer {token}"}
    by_id = {}

    async with httpx.AsyncClient(timeout=60.0) as client:
        for window_from, window_to in _date_windows(from_d, to_d):
            r = await client.get(
                f"{ZOOM_BASE}/report/users/{user_id}/meetings",
                headers=headers,
                params={"from": window_from, "to": window_to, "page_size": 300},
            )
            r.raise_for_status()
            for m in r.json().get("meetings", []):
                by_id[str(m.get("uuid", m.get("id", "")))] = m

    return list(by_id.values())


async def _get_recordings(token: str, from_d, to_d) -> dict:
    """Returns {uuid: meeting_data} for meetings that have cloud recordings."""
    headers = {"Authorization": f"Bearer {token}"}
    by_id = {}

    async with httpx.AsyncClient(timeout=60.0) as client:
        for window_from, window_to in _date_windows(from_d, to_d):
            r = await client.get(
                f"{ZOOM_BASE}/users/me/recordings",
                headers=headers,
                params={"from": window_from, "to": window_to, "page_size": 300},
            )
            r.raise_for_status()
            for m in r.json().get("meetings", []):
                by_id[str(m.get("uuid", m.get("id", "")))] = m

    return by_id


async def _download_transcript(token: str, download_url: str) -> str:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            download_url,
            headers={"Authorization": f"Bearer {token}"},
            follow_redirects=True,
        )
        r.raise_for_status()
        return r.text


async def sync_meetings(
    days_back: int = 1,
    from_date: str | None = None,
    to_date: str | None = None,
):
    from_d, to_d = _resolve_range(days_back, from_date, to_date)
    windows = _date_windows(from_d, to_d)
    logger.info(
        f"Starting Zoom meeting sync — {from_d} to {to_d} "
        f"({len(windows)} request window(s))"
    )
    token = await _get_access_token()

    # Recordings API always works — also gives us the host_id needed for the Reports API.
    recordings = await _get_recordings(token, from_d, to_d)

    # Extract host_id from any recording so the Reports API gets a real user ID.
    # ('me' does not resolve for S2S account-credentials tokens on the report endpoint.)
    host_id = next(
        (m.get("host_id") for m in recordings.values() if m.get("host_id")),
        None,
    )

    # If no recordings in the requested window (e.g. all meetings were true no-shows),
    # widen the search to 30 days just to find a valid host_id for the Reports API.
    if not host_id:
        try:
            today = datetime.utcnow().date()
            wider = await _get_recordings(token, today - timedelta(days=30), today)
            host_id = next(
                (m.get("host_id") for m in wider.values() if m.get("host_id")),
                None,
            )
            if host_id:
                logger.info(f"Resolved host_id from 30-day window: {host_id}")
        except Exception:
            pass

    # Try Reports API — catches true no-shows (requires report:read:user:admin scope).
    # Falls back to recordings-only when the scope is missing or no host_id is available.
    report_meetings = None
    if host_id:
        try:
            report_meetings = await _get_report_meetings(token, host_id, from_d, to_d)
        except Exception as e:
            logger.warning(
                f"Reports API unavailable (add report:read:user:admin scope to Zoom app): {e}"
            )

    if report_meetings is not None:
        master_list = report_meetings
        logger.info(
            f"Report: {len(report_meetings)} meetings | Recordings: {len(recordings)}"
        )
    else:
        master_list = list(recordings.values())
        logger.info(
            f"Fallback to recordings master: {len(master_list)} meetings (host_id={'found' if host_id else 'missing'})"
        )

    processed_ids = await sheets_service.get_processed_meeting_ids()
    logger.info(f"Already processed: {len(processed_ids)}")

    rows = []
    skipped = 0
    for meeting in master_list:
        topic = meeting.get("topic", "Unknown")
        start_time = meeting.get("start_time", "")
        meeting_id = str(meeting.get("uuid", meeting.get("id", "")))

        if meeting_id in processed_ids:
            skipped += 1
            logger.info(f"Skipping already processed: {topic} ({meeting_id})")
            continue

        contact = await ghl_service.search_contact_by_name(topic)
        email = contact.get("email", "")
        phone = contact.get("phone", "") or contact.get("mobilePhone", "")

        recording = recordings.get(meeting_id)
        # Use recording's actual duration when available; fall back to report's value
        duration_minutes = recording.get("duration", meeting.get("duration", 0)) if recording else meeting.get("duration", 0)

        # No recording at all, or actual duration below threshold → No Show
        if not recording or duration_minutes < NO_SHOW_THRESHOLD_MINUTES:
            rows.append({
                "meeting_id": meeting_id,
                "date": start_time,
                "topic": topic,
                "email": email,
                "phone": phone,
                "duration_min": duration_minutes,
                "status": "No Show",
                "summary": "",
                "follow_up_date": "",
                "deal_status": "",
                "call_analysis": "",
                "score": "",
            })
            continue

        # Find transcript file — prefer audio_transcript, take first match
        recording_files = recording.get("recording_files", [])
        transcript_file = next(
            (f for f in recording_files
             if f.get("file_type") == "TRANSCRIPT"
             and f.get("recording_type") == "audio_transcript"),
            None,
        ) or next(
            (f for f in recording_files if f.get("file_type") == "TRANSCRIPT"),
            None,
        )

        if not transcript_file:
            rows.append({
                "meeting_id": meeting_id,
                "date": start_time,
                "topic": topic,
                "email": email,
                "phone": phone,
                "duration_min": duration_minutes,
                "status": "No Transcript",
                "summary": "",
                "follow_up_date": "",
                "deal_status": "",
                "call_analysis": "",
                "score": "",
            })
            continue

        try:
            transcript_text = await _download_transcript(token, transcript_file["download_url"])
            analysis = await claude_service.analyze_call(transcript_text, topic, meeting_date=start_time)
            rows.append({
                "meeting_id": meeting_id,
                "date": start_time,
                "topic": topic,
                "email": email,
                "phone": phone,
                "duration_min": duration_minutes,
                "status": analysis["status"],
                "summary": analysis["summary"],
                "follow_up_date": analysis["follow_up_date"],
                "deal_status": analysis["deal_status"],
                "call_analysis": analysis["call_analysis"],
                "score": analysis["score"],
            })
        except Exception as e:
            logger.error(f"Failed to analyze meeting {meeting_id}: {e}")
            rows.append({
                "meeting_id": meeting_id,
                "date": start_time,
                "topic": topic,
                "email": email,
                "phone": phone,
                "duration_min": duration_minutes,
                "status": "Error",
                "summary": str(e),
                "follow_up_date": "",
                "deal_status": "",
                "call_analysis": "",
                "score": "",
            })

    if rows:
        await sheets_service.append_rows(rows)
        logger.info(f"Synced {len(rows)} new meetings | Skipped {skipped} already processed")
    else:
        logger.info(f"Nothing new to sync — all {skipped} meetings already in sheet")
