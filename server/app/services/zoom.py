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


async def _get_report_meetings(token: str, user_id: str, days_back: int = 1) -> list:
    """Reports API returns ALL past meetings, including no-shows that have no recording.

    Requires report:read:user:admin scope. Uses a real user ID because the 'me'
    alias does not resolve for S2S OAuth account credentials tokens.
    """
    from_date = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    to_date = datetime.utcnow().strftime("%Y-%m-%d")
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ZOOM_BASE}/report/users/{user_id}/meetings",
            headers=headers,
            params={"from": from_date, "to": to_date, "page_size": 300},
        )
        r.raise_for_status()
        return r.json().get("meetings", [])


async def _get_recordings(token: str, days_back: int = 1) -> dict:
    """Returns {uuid: meeting_data} for meetings that have cloud recordings."""
    from_date = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    to_date = datetime.utcnow().strftime("%Y-%m-%d")
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ZOOM_BASE}/users/me/recordings",
            headers=headers,
            params={"from": from_date, "to": to_date, "page_size": 100},
        )
        r.raise_for_status()
        meetings = r.json().get("meetings", [])

    return {str(m.get("uuid", m.get("id", ""))): m for m in meetings}


async def _download_transcript(token: str, download_url: str) -> str:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            download_url,
            headers={"Authorization": f"Bearer {token}"},
            follow_redirects=True,
        )
        r.raise_for_status()
        return r.text


async def sync_meetings(days_back: int = 1):
    logger.info(f"Starting Zoom meeting sync — {days_back} day(s) back")
    token = await _get_access_token()

    # Recordings API always works — also gives us the host_id needed for the Reports API.
    recordings = await _get_recordings(token, days_back=days_back)

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
            wider = await _get_recordings(token, days_back=30)
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
            report_meetings = await _get_report_meetings(token, user_id=host_id, days_back=days_back)
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
