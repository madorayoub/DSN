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


async def _get_meetings(token: str, days_back: int = 1) -> list:
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
        return r.json().get("meetings", [])


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
    meetings = await _get_meetings(token, days_back=days_back)

    # Load already-processed meeting IDs from sheet — never re-process
    processed_ids = await sheets_service.get_processed_meeting_ids()
    logger.info(f"Already processed: {len(processed_ids)} meetings in sheet")

    rows = []
    skipped = 0
    for meeting in meetings:
        duration_minutes = meeting.get("duration", 0)
        topic = meeting.get("topic", "Unknown")
        start_time = meeting.get("start_time", "")
        meeting_id = str(meeting.get("uuid", meeting.get("id", "")))

        # Skip if already in sheet
        if meeting_id in processed_ids:
            skipped += 1
            logger.info(f"Skipping already processed: {topic} ({meeting_id})")
            continue

        # Look up contact in GHL by meeting topic (contact name)
        contact = await ghl_service.search_contact_by_name(topic)
        email = contact.get("email", "")
        phone = contact.get("phone", "") or contact.get("mobilePhone", "")

        # Classify no-shows immediately — no Claude needed
        if duration_minutes < NO_SHOW_THRESHOLD_MINUTES:
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
        recording_files = meeting.get("recording_files", [])
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

        # Download and analyze transcript — Claude only runs on NEW meetings
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
