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
    "Evidence",  # col N — verbatim quote backing Status / Follow-Up Date
]
LAST_COLUMN = "N"

# Columns a human fills in by hand. A retry rewrites the row, so these are read
# off the old row and carried across instead of being blanked.
MANUAL_COLUMN_INDICES = (12,)  # M — Commission Paid

DATE_COLUMN_INDEX = 1  # B — the sheet is kept sorted by this, newest first

# Statuses that mean "we didn't get an answer yet", not "this meeting is done".
# They are excluded from the processed set so a later sync retries them once the
# cause clears — an outage or expired API credit for Error, a transcript Zoom
# hadn't finished generating for No Transcript. Without this a transient failure
# is permanent: the row keeps its meeting ID in col A, so every future run skips
# it forever. Retries are naturally bounded because a sync only ever looks at the
# last `days_back` days of Zoom meetings.
RETRYABLE_STATUSES = {"error", "no transcript"}


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
            range=f"{SHEET_NAME}!A2:E10000",
        ).execute()
        processed = set()
        for row in result.get("values", []):
            if not row or not row[0]:
                continue
            status = (row[4] if len(row) > 4 else "").strip().lower()
            if status in RETRYABLE_STATUSES:
                continue
            processed.add(row[0])
        return processed
    except Exception:
        return set()


async def get_processed_meeting_ids() -> set:
    """Return meeting IDs that are done with. Used to skip re-processing.

    Rows in a RETRYABLE_STATUSES state are deliberately excluded so a later sync
    picks them up again — see the note on RETRYABLE_STATUSES.
    """
    return await asyncio.to_thread(_get_processed_ids_sync)


def _find_existing_rows_by_ids(service, ids: set) -> dict:
    """Map meeting ID -> (0-based sheet row index, row values) for rows already present."""
    if not ids:
        return {}
    result = service.spreadsheets().values().get(
        spreadsheetId=settings.GOOGLE_SHEET_ID,
        # From A1 so the list index lines up with the sheet's 0-based row index.
        range=f"{SHEET_NAME}!A1:{LAST_COLUMN}10000",
    ).execute()
    found = {}
    for i, row in enumerate(result.get("values", [])):
        if i > 0 and row and row[0] in ids:
            found[row[0]] = (i, row + [""] * (len(HEADERS) - len(row)))
    return found


def _append_rows_sync(rows: list[dict]):
    service = _get_service()
    sheet = service.spreadsheets()

    _ensure_sheet_exists(service)

    existing_header = sheet.values().get(
        spreadsheetId=settings.GOOGLE_SHEET_ID,
        range=f"{SHEET_NAME}!A1:{LAST_COLUMN}1",
    ).execute().get("values", [[]])

    # Rewrite the header when it is missing or narrower than HEADERS, so adding a
    # column does not leave the sheet labelled with the old shape.
    if not existing_header or existing_header[0] != HEADERS:
        sheet.values().update(
            spreadsheetId=settings.GOOGLE_SHEET_ID,
            range=f"{SHEET_NAME}!A1",
            valueInputOption="RAW",
            body={"values": [HEADERS]},
        ).execute()

    # Pull the rows we are about to replace so hand-entered columns survive the
    # rewrite, and so the delete step knows which sheet rows to remove.
    existing_rows = _find_existing_rows_by_ids(service, {r["meeting_id"] for r in rows})

    values = []
    for r in rows:
        previous = existing_rows.get(r["meeting_id"], (None, []))[1]
        row = [
            r["meeting_id"],  # col A — dedup key
            r["date"], r["topic"], r["duration_min"], r["status"],
            r["follow_up_date"], r["deal_status"], r["summary"], r["call_analysis"],
            r["score"], r.get("email", ""), r.get("phone", ""),
            "",  # Commission Paid (col M) — filled by hand, carried over below
            r.get("evidence", ""),
        ]
        for idx in MANUAL_COLUMN_INDICES:
            if previous and idx < len(previous) and str(previous[idx]).strip():
                row[idx] = previous[idx]
        values.append(row)

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

    # A retried meeting (see RETRYABLE_STATUSES) already has a stale row in the
    # sheet. Drop it first so the fresh result replaces it rather than sitting
    # alongside it as a duplicate. Only rows whose col A exactly matches an ID in
    # this batch are touched.
    stale_indices = [idx for idx, _ in existing_rows.values()]

    # Deletes run first and in descending row order, so each one cannot shift the
    # index of a delete still queued behind it.
    delete_requests = [
        {
            "deleteDimension": {
                "range": {
                    "sheetId": sheet_id,
                    "dimension": "ROWS",
                    "startIndex": i,
                    "endIndex": i + 1,
                },
            },
        }
        for i in sorted(stale_indices, reverse=True)
    ]

    # Single batchUpdate: deletes + insertDimension + updateCells + sort in one
    # atomic request. Previously insert and update were two separate calls — if
    # the second failed, blank rows were left in the sheet with no data.
    # New rows go in at the top and the sort then puts them in date order, so the
    # sheet reads newest-first no matter what order meetings were processed in.
    service.spreadsheets().batchUpdate(
        spreadsheetId=settings.GOOGLE_SHEET_ID,
        body={"requests": delete_requests + [
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
            {
                "sortRange": {
                    "range": {
                        "sheetId": sheet_id,
                        "startRowIndex": 1,   # keep the header pinned
                        "startColumnIndex": 0,
                        "endColumnIndex": len(HEADERS),
                    },
                    "sortSpecs": [{
                        "dimensionIndex": DATE_COLUMN_INDEX,
                        "sortOrder": "DESCENDING",
                    }],
                },
            },
        ]},
    ).execute()

    logger.info(
        f"Wrote {len(values)} rows to {SHEET_NAME} "
        f"(replaced {len(stale_indices)} stale), sorted newest first"
    )


async def append_rows(rows: list[dict]):
    """Offload blocking Google Sheets I/O to a thread so the event loop stays free."""
    await asyncio.to_thread(_append_rows_sync, rows)
