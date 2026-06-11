#!/usr/bin/env python3
"""
build_playbook.py — Pull DSN Zoom transcripts, synthesize a call playbook with
Claude, and push it into the Retell speed-to-lead agent's global_prompt.

Usage
-----
  # Full run: fetch new transcripts + synthesize + push to Retell
  python scripts/build_playbook.py

  # Only download/cache new transcripts (no synthesis, no Retell push)
  python scripts/build_playbook.py --fetch-only

  # Re-synthesize from cached transcripts and push (skip Zoom fetch)
  python scripts/build_playbook.py --synthesize-only

  # Just push the existing playbook.json to Retell (no fetch, no synthesis)
  python scripts/build_playbook.py --push-only

  # Control how far back to look for Zoom recordings (default: 365 days)
  python scripts/build_playbook.py --days 730

Requirements
------------
  pip install httpx python-dotenv anthropic

Credentials are loaded from:
  1. dsn-orchestrator/.env  (RETELL_API_KEY)
  2. server/.env            (ZOOM_*, ANTHROPIC_API_KEY)
"""

import argparse
import asyncio
import base64
import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

import httpx

# ── Load env ──────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    _root = Path(__file__).parent.parent.parent  # DSN-main/
    load_dotenv(_root / "server" / ".env")
    load_dotenv(Path(__file__).parent.parent / ".env", override=False)
except ImportError:
    pass  # env vars must already be in environment

ZOOM_ACCOUNT_ID   = os.environ.get("ZOOM_ACCOUNT_ID", "")
ZOOM_CLIENT_ID    = os.environ.get("ZOOM_CLIENT_ID", "")
ZOOM_CLIENT_SECRET = os.environ.get("ZOOM_CLIENT_SECRET", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
# RETELL_API_KEY lives in Railway env vars, not a local .env
# Set it inline: RETELL_API_KEY=key_... python scripts/build_playbook.py --push-only
# Or add it to server/.env temporarily
RETELL_API_KEY    = os.environ.get("RETELL_API_KEY", "key_b94ce6795b1d70d2882779b2eb31")

ZOOM_TOKEN_URL = "https://zoom.us/oauth/token"
ZOOM_BASE      = "https://api.zoom.us/v2"
RETELL_BASE    = "https://api.retellai.com"

# Retell conversation flow that contains global_prompt for speed-to-lead
STL_FLOW_ID = "conversation_flow_9ef584e2f263"

SCRIPTS_DIR    = Path(__file__).parent
CACHE_DIR      = SCRIPTS_DIR / "transcripts_cache"
PLAYBOOK_PATH  = SCRIPTS_DIR / "playbook.json"

CACHE_DIR.mkdir(exist_ok=True)


# ── Zoom helpers ──────────────────────────────────────────────────────────────

async def zoom_token(client: httpx.AsyncClient) -> str:
    credentials = base64.b64encode(
        f"{ZOOM_CLIENT_ID}:{ZOOM_CLIENT_SECRET}".encode()
    ).decode()
    r = await client.post(
        ZOOM_TOKEN_URL,
        params={"grant_type": "account_credentials", "account_id": ZOOM_ACCOUNT_ID},
        headers={"Authorization": f"Basic {credentials}"},
    )
    r.raise_for_status()
    return r.json()["access_token"]


async def fetch_recordings(client: httpx.AsyncClient, token: str, days_back: int) -> list:
    """Return all cloud-recording meetings in the window."""
    from_date = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    to_date   = datetime.utcnow().strftime("%Y-%m-%d")
    meetings  = []
    next_token = None

    while True:
        params = {"from": from_date, "to": to_date, "page_size": 100}
        if next_token:
            params["next_page_token"] = next_token

        r = await client.get(
            f"{ZOOM_BASE}/users/me/recordings",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
        )
        r.raise_for_status()
        data = r.json()
        meetings.extend(data.get("meetings", []))
        next_token = data.get("next_page_token")
        if not next_token:
            break

    return meetings


async def download_transcript(client: httpx.AsyncClient, token: str, url: str) -> str:
    r = await client.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        follow_redirects=True,
        timeout=30.0,
    )
    r.raise_for_status()
    return r.text


def parse_vtt(vtt_text: str) -> str:
    """Strip VTT timestamps and return plain speaker dialogue."""
    lines = []
    for line in vtt_text.splitlines():
        line = line.strip()
        # Skip header, timestamp lines, cue identifiers, blank lines
        if not line or line.startswith("WEBVTT") or "-->" in line or line.isdigit():
            continue
        # Remove inline tags like <c> or <00:00:01.000>
        line = re.sub(r"<[^>]+>", "", line).strip()
        if line:
            lines.append(line)
    return "\n".join(lines)


# ── Fetch & cache ─────────────────────────────────────────────────────────────

async def fetch_and_cache(days_back: int) -> int:
    """Download transcripts from Zoom and save to cache. Returns count of new files."""
    if not all([ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET]):
        print("ERROR: Missing ZOOM_* credentials. Check server/.env", file=sys.stderr)
        sys.exit(1)

    print(f"Fetching Zoom recordings from the past {days_back} days…")
    async with httpx.AsyncClient(timeout=30.0) as client:
        token = await zoom_token(client)
        meetings = await fetch_recordings(client, token, days_back)

    print(f"Found {len(meetings)} meeting(s) with cloud recordings")
    new_count = 0

    async with httpx.AsyncClient(timeout=30.0) as client:
        for meeting in meetings:
            meeting_id = str(meeting.get("uuid") or meeting.get("id", "unknown"))
            topic      = meeting.get("topic", "Unknown")
            start_time = meeting.get("start_time", "")
            duration   = meeting.get("duration", 0)
            cache_path = CACHE_DIR / f"{meeting_id.replace('/', '_').replace('+', '-')}.txt"

            if cache_path.exists():
                print(f"  SKIP (cached): {topic}")
                continue

            # Need a fresh token per batch (they expire in 1h)
            token = await zoom_token(client)

            # Find transcript file
            files = meeting.get("recording_files", [])
            transcript_file = next(
                (f for f in files
                 if f.get("file_type") == "TRANSCRIPT"
                 and f.get("recording_type") == "audio_transcript"),
                None,
            ) or next(
                (f for f in files if f.get("file_type") == "TRANSCRIPT"),
                None,
            )

            if not transcript_file:
                print(f"  SKIP (no transcript): {topic} — {duration}min")
                continue

            try:
                vtt = await download_transcript(client, token, transcript_file["download_url"])
                plain = parse_vtt(vtt)
                if len(plain.strip()) < 100:
                    print(f"  SKIP (transcript too short): {topic}")
                    continue

                meta = f"MEETING: {topic}\nDATE: {start_time}\nDURATION: {duration} min\n\n"
                cache_path.write_text(meta + plain, encoding="utf-8")
                print(f"  SAVED: {topic} ({duration}min, {len(plain)} chars)")
                new_count += 1
            except Exception as e:
                print(f"  ERROR downloading transcript for {topic}: {e}")

    print(f"\nDone — {new_count} new transcript(s) cached in {CACHE_DIR}")
    return new_count


# ── Claude synthesis ──────────────────────────────────────────────────────────

def call_claude(messages: list, system: str, model: str = "claude-sonnet-4-6") -> str:
    """Synchronous Claude API call via httpx."""
    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY missing", file=sys.stderr)
        sys.exit(1)

    with httpx.Client(timeout=120.0) as client:
        r = client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 2048,
                "system": system,
                "messages": messages,
            },
        )
        r.raise_for_status()
        return r.json()["content"][0]["text"].strip()


EXTRACT_SYSTEM = """You are analyzing a B2B sales call transcript for Direct Sales Network (DSN).
DSN books strategy calls for companies that want more qualified appointments.
The agent calling is named Morgan.

Extract a structured JSON object with these fields:
- outcome: "booked" | "not_interested" | "callback" | "voicemail" | "no_show" | "other"
- objections: list of strings — each objection the lead raised verbatim or paraphrased
- winning_responses: list of strings — responses that visibly moved the lead toward yes
- booking_signals: list of strings — phrases or moments that signaled the lead was warming up
- friction_points: list of strings — things that caused resistance or disengagement
- notable_technique: string or null — one standout move the agent made (or null if none)

Return ONLY valid JSON. No commentary."""

SYNTHESIZE_SYSTEM = """You are a B2B sales coach for Direct Sales Network (DSN).
DSN's outbound agent Morgan calls leads who filled a form and tries to book a free 30-minute strategy call.

You have been given extracts from 50+ real calls. Your job is to write a PLAYBOOK SECTION
that will be injected into Morgan's system prompt to improve every future call.

The playbook must be:
- Written in second person ("When a lead says X, respond with...")
- Concrete and specific — use real patterns from the data, not generic advice
- Tightly structured — no fluff, no filler
- Under 700 words total

Structure it with these labeled sections:
## Top Objections & Proven Responses
List the 6-7 most common objections with the response pattern that worked. One sentence each.

## Booking Signals
List 5-6 phrases or signals that indicate a lead is about to say yes. Short bullets.

## Qualifying Questions That Work
List 3-4 specific questions that consistently open the conversation and build rapport.

## Language That Kills Deals
List 5-6 specific words or phrases that caused disengagement. Short bullets.

## Recovery Pattern
One paragraph: what to do when a lead who was engaged suddenly goes cold.

Return ONLY the playbook text. No preamble."""


def extract_one(path: Path) -> dict | None:
    """Run first-pass extraction on a single transcript."""
    text = path.read_text(encoding="utf-8")
    # Truncate very long transcripts to ~12k chars to stay within token limits
    if len(text) > 12_000:
        text = text[:12_000] + "\n[...truncated...]"

    try:
        raw = call_claude(
            messages=[{"role": "user", "content": f"Transcript:\n\n{text}"}],
            system=EXTRACT_SYSTEM,
        )
        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception as e:
        print(f"  EXTRACT ERROR ({path.name}): {e}")
        return None


def synthesize_playbook(extracts: list[dict]) -> str:
    """Second-pass: synthesize all extracts into a coaching playbook."""
    extracts_json = json.dumps(extracts, indent=2)
    return call_claude(
        messages=[{"role": "user", "content": f"Call extracts (JSON array):\n\n{extracts_json}"}],
        system=SYNTHESIZE_SYSTEM,
        model="claude-opus-4-8",  # Use best model for synthesis
    )


def run_synthesis() -> str:
    """Load cached transcripts, run two-pass synthesis, save playbook.json."""
    transcript_files = sorted(CACHE_DIR.glob("*.txt"))
    if not transcript_files:
        print("ERROR: No cached transcripts found. Run with --fetch-only first.", file=sys.stderr)
        sys.exit(1)

    print(f"Running first-pass extraction on {len(transcript_files)} transcript(s)…")
    extracts = []
    for i, path in enumerate(transcript_files, 1):
        print(f"  [{i}/{len(transcript_files)}] {path.name}")
        extract = extract_one(path)
        if extract:
            extracts.append(extract)

    print(f"\n{len(extracts)} extracts ready. Running synthesis with Claude Opus…")
    playbook_text = synthesize_playbook(extracts)

    result = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "source_calls": len(extracts),
        "playbook": playbook_text,
    }
    PLAYBOOK_PATH.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"\nPlaybook saved to {PLAYBOOK_PATH}")
    print("\n" + "─" * 60)
    print(playbook_text)
    print("─" * 60)
    return playbook_text


# ── Retell push ───────────────────────────────────────────────────────────────

def get_flow(flow_id: str) -> dict:
    with httpx.Client(timeout=30.0) as client:
        r = client.get(
            f"{RETELL_BASE}/get-conversation-flow/{flow_id}",
            headers={"Authorization": f"Bearer {RETELL_API_KEY}"},
        )
        r.raise_for_status()
        return r.json()


def patch_flow(flow_id: str, payload: dict) -> None:
    with httpx.Client(timeout=30.0) as client:
        r = client.patch(
            f"{RETELL_BASE}/update-conversation-flow/{flow_id}",
            headers={
                "Authorization": f"Bearer {RETELL_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        r.raise_for_status()


PLAYBOOK_MARKER_START = "\n\n# === DSN CALL PLAYBOOK (synthesized from real calls) ===\n"
PLAYBOOK_MARKER_END   = "\n# === END PLAYBOOK ==="


def push_to_retell(playbook_text: str) -> None:
    if not RETELL_API_KEY:
        print("ERROR: RETELL_API_KEY missing", file=sys.stderr)
        sys.exit(1)

    print(f"\nFetching current speed-to-lead flow ({STL_FLOW_ID})…")
    flow = get_flow(STL_FLOW_ID)

    # Strip any existing playbook section
    base_prompt = flow.get("global_prompt", "")
    if PLAYBOOK_MARKER_START in base_prompt:
        base_prompt = base_prompt[:base_prompt.index(PLAYBOOK_MARKER_START)]

    new_prompt = base_prompt + PLAYBOOK_MARKER_START + playbook_text + PLAYBOOK_MARKER_END

    # Rebuild payload with updated global_prompt only
    print("Pushing updated global_prompt to Retell…")
    patch_flow(STL_FLOW_ID, {"global_prompt": new_prompt})
    print(f"Done — speed-to-lead agent updated. New global_prompt length: {len(new_prompt)} chars")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Build and push DSN call playbook")
    parser.add_argument("--fetch-only",      action="store_true", help="Only download + cache transcripts")
    parser.add_argument("--synthesize-only", action="store_true", help="Synthesize from cache, push to Retell")
    parser.add_argument("--push-only",       action="store_true", help="Push existing playbook.json to Retell")
    parser.add_argument("--days",            type=int, default=365, help="Days back to fetch recordings (default: 365)")
    parser.add_argument("--no-push",         action="store_true", help="Synthesize but don't push to Retell")
    args = parser.parse_args()

    if args.push_only:
        if not PLAYBOOK_PATH.exists():
            print(f"ERROR: {PLAYBOOK_PATH} not found. Run without --push-only first.", file=sys.stderr)
            sys.exit(1)
        data = json.loads(PLAYBOOK_PATH.read_text())
        push_to_retell(data["playbook"])
        return

    if args.synthesize_only:
        playbook_text = run_synthesis()
        if not args.no_push:
            push_to_retell(playbook_text)
        return

    # Default: fetch + synthesize + push
    asyncio.run(fetch_and_cache(args.days))

    if args.fetch_only:
        return

    playbook_text = run_synthesis()
    if not args.no_push:
        push_to_retell(playbook_text)


if __name__ == "__main__":
    main()
