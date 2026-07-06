"""READ-ONLY: pull summaries + call analyses from the Meetings sheet."""
from app.services.sheets import _get_service, SHEET_NAME
from app.config import settings

def main():
    service = _get_service()
    result = service.spreadsheets().values().get(
        spreadsheetId=settings.GOOGLE_SHEET_ID,
        range=f"{SHEET_NAME}!A2:M10000",
    ).execute()
    rows = result.get("values", [])

    # Col indices: A=0 id, B=1 date, C=2 topic, D=3 duration, E=4 status,
    # F=5 follow_up, G=6 deal_status, H=7 summary, I=8 call_analysis, J=9 score
    real = []
    for r in rows:
        r = r + [""] * (13 - len(r))
        status = r[4].strip()
        if status.lower() in ("no show", "no transcript", "error", ""):
            continue
        real.append({
            "date": r[1],
            "topic": r[2],
            "status": status,
            "summary": r[7],
            "analysis": r[8],
            "score": r[9],
        })

    print(f"Real meetings with data: {len(real)}\n")
    for m in real:
        print("=" * 70)
        print(f"DATE   : {m['date'][:10]}  |  CONTACT: {m['topic']}  |  STATUS: {m['status']}  |  SCORE: {m['score']}")
        print(f"SUMMARY: {m['summary']}")
        print(f"ANALYSIS: {m['analysis']}")
        print()

if __name__ == "__main__":
    main()
