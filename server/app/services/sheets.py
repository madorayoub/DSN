import asyncio
import json
import base64
import logging
from google.oauth2 import service_account
from googleapiclient.discovery import build
from app.config import settings

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SHEET_NAME = "Meetings"

# Meeting ID is column A (hidden key), visible data starts at B
# This means the sheet never re-processes a meeting it already has
HEADERS = [
    "Meeting ID",  # col A — dedup key
    "Date", "Topic / Contact", "Duration (min)", "Status",
    "Follow-Up Date", "Deal Status", "Summary", "Call Analysis",
    "Score", "Email", "Phone", "Commission Paid (Yes/No — Date)",
]


def _get_service():
    sa_json = json.loads(base64.b64decode(settings.GOOGLE_SERVICE_ACCOUNT_JSON).decode())
    creds = service_account.Credentials.from_service_account_info(sa_json, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)


def _ensure_sheet_exists(service):
    spreadsheet = service.spreadsheets().get(
        spreadsheetId=settings.GOOGLE_SHEET_ID
    ).execute()

    sheets = spreadsheet.get("sheets", [])
    sheet_titles = [s["properties"]["title"] for s in sheets]

    if SHEET_NAME in sheet_titles:
        return

    if len(sheets) == 1:
        # Rename whatever the default sheet is called
        service.spreadsheets().batchUpdate(
            spreadsheetId=settings.GOOGLE_SHEET_ID,
            body={"requests": [{
                "updateSheetProperties": {
                    "properties": {
                        "sheetId": sheets[0]["properties"]["sheetId"],
                        "title": SHEET_NAME
                    },
                    "fields": "title"
                }
            }]}
        ).execute()
    else:
        service.spreadsheets().batchUpdate(
            spreadsheetId=settings.GOOGLE_SHEET_ID,
            body={"requests": [{
                "addSheet": {"properties": {"title": SHEET_NAME}}
            }]}
        ).execute()


def _get_processed_ids_sync() -> set:
    service = _get_service()
    try:
        result = service.spreadsheets().values().get(
            spreadsheetId=settings.GOOGLE_SHEET_ID,
            range=f"{SHEET_NAME}!A2:A10000",
        ).execute()
        values = result.get("values", [])
        return {row[0] for row in values if row}
    except Exception:
        return set()


async def get_processed_meeting_ids() -> set:
    """Return all meeting IDs already in the sheet. Used to skip re-processing."""
    return await asyncio.to_thread(_get_processed_ids_sync)


def _append_rows_sync(rows: list[dict]):
    service = _get_service()
    sheet = service.spreadsheets()

    _ensure_sheet_exists(service)

    existing = sheet.values().get(
        spreadsheetId=settings.GOOGLE_SHEET_ID,
        range=f"{SHEET_NAME}!A1:M1",
    ).execute()

    if not existing.get("values"):
        sheet.values().update(
            spreadsheetId=settings.GOOGLE_SHEET_ID,
            range=f"{SHEET_NAME}!A1",
            valueInputOption="RAW",
            body={"values": [HEADERS]},
        ).execute()

    values = [
        [
            r["meeting_id"],  # col A — dedup key
            r["date"], r["topic"], r["duration_min"], r["status"],
            r["follow_up_date"], r["deal_status"], r["summary"], r["call_analysis"],
            r["score"], r.get("email", ""), r.get("phone", ""),
            "",  # Commission Paid (col M) — blank, filled manually
        ]
        for r in rows
    ]

    # Get the sheetId for the Meetings tab (needed for insertDimension)
    spreadsheet = service.spreadsheets().get(
        spreadsheetId=settings.GOOGLE_SHEET_ID
    ).execute()
    sheet_id = next(
        s["properties"]["sheetId"]
        for s in spreadsheet["sheets"]
        if s["properties"]["title"] == SHEET_NAME
    )

    # Build cell objects for updateCells (strings and numbers handled separately so
    # Sheets stores numeric scores/durations as numbers, not text).
    def _cell(val):
        if isinstance(val, (int, float)) and val != "":
            return {"userEnteredValue": {"numberValue": val}}
        return {"userEnteredValue": {"stringValue": str(val) if val is not None else ""}}

    rows_data = [{"values": [_cell(v) for v in row]} for row in values]

    # Single batchUpdate: insertDimension + updateCells in one atomic request.
    # Previously these were two separate calls — if the second failed, blank rows
    # were left in the sheet with no data.
    service.spreadsheets().batchUpdate(
        spreadsheetId=settings.GOOGLE_SHEET_ID,
        body={"requests": [
            {
                "insertDimension": {
                    "range": {
                        "sheetId": sheet_id,
                        "dimension": "ROWS",
                        "startIndex": 1,      # 0-based → row 2 in the UI
                        "endIndex": 1 + len(values),
                    },
                    "inheritFromBefore": False,
                },
            },
            {
                "updateCells": {
                    "rows": rows_data,
                    "fields": "userEnteredValue",
                    "start": {"sheetId": sheet_id, "rowIndex": 1, "columnIndex": 0},
                },
            },
        ]},
    ).execute()

    logger.info(f"Inserted {len(values)} rows at top of {SHEET_NAME}")


async def append_rows(rows: list[dict]):
    """Offload blocking Google Sheets I/O to a thread so the event loop stays free."""
    await asyncio.to_thread(_append_rows_sync, rows)
