import anthropic
import json
import logging
import re
from datetime import datetime, timedelta
from app.config import settings

logger = logging.getLogger(__name__)

# Zoom hands us WebVTT: a cue number, a timestamp range, then the spoken line.
# The scaffolding is over half the payload and carries no meaning for analysis.
_VTT_TIMESTAMP = re.compile(r"^\d{2}:\d{2}:\d{2}[.,]\d+\s*-->")
_VTT_CUE_NUMBER = re.compile(r"^\d+$")

# Generous, because the end of a call is where the next step gets agreed and
# cutting it off is what made every follow-up date a guess. Cleaned transcripts
# of a 30-minute call land around 15k chars, so this rarely binds at all.
MAX_TRANSCRIPT_CHARS = 120_000


def _clean_transcript(raw: str) -> str:
    """Strip WebVTT scaffolding down to plain 'Speaker: line' text."""
    lines = []
    for line in raw.splitlines():
        line = line.strip()
        if (
            not line
            or line.upper().startswith("WEBVTT")
            or _VTT_CUE_NUMBER.match(line)
            or _VTT_TIMESTAMP.match(line)
        ):
            continue
        # Zoom repeats a caption line while it is still being spoken.
        if lines and lines[-1] == line:
            continue
        lines.append(line)
    return "\n".join(lines)


def _fit_to_budget(text: str) -> str:
    """Trim from the middle, never the end — the close is the part that matters."""
    if len(text) <= MAX_TRANSCRIPT_CHARS:
        return text
    head = MAX_TRANSCRIPT_CHARS // 3
    tail = MAX_TRANSCRIPT_CHARS - head
    return f"{text[:head]}\n\n[... middle of call trimmed ...]\n\n{text[-tail:]}"

SYSTEM_PROMPT = """You are a sales call analyst for DirectSays Network, a lead generation and sales company.
Analyze sales call transcripts and return structured JSON only — no prose, no markdown, no code fences.

THE ONE RULE THAT MATTERS: report only what the transcript actually says.
This sheet is used to decide who to chase and when. A guessed date is worse than
a blank one, because a blank prompts someone to go look while a guess does not.
Never estimate, infer, split the difference, or fall back to a default. If the
transcript does not say it, the field is empty or "Unknown".

FOLLOW-UP DATE — a named day that was accepted, nothing less and nothing more:
- The test is simple: did anyone name a specific day or date, and did the other
  side accept it? If yes, fill it in. If no, leave it empty.
- The verb does not matter. "Can we touch base Wednesday afternoon?" — "Yeah" is
  a commitment, because Wednesday was named and accepted. So are "book a
  follow-up on Monday" — "Yep, Monday afternoon", "same time next week", "I'll
  send you a link for Friday", "let's say the 14th".
- Acceptance can be brief. "Yep", "sure", "that works", "sounds good", or simply
  moving on to confirm the time all count as agreement.
- Put the exact words that set the day into follow_up_phrase — "Monday
  afternoon", "Friday", "the 14th". Do not paraphrase. If a weekday was named,
  leave the arithmetic alone: the calendar date is worked out from your phrase,
  so copying the words accurately matters more than the date you emit.
- LEAVE IT EMPTY when no day was named at all, however warm the call: "I'll
  reach out", "let's touch base soon", "give me a few days", "I'll think it
  over", "send me the info", "let me talk to my partner".
- Also leave it empty if a day was floated but the other side never agreed, or
  if they only described their own schedule ("I'm busy Monday to Wednesday")
  without a next meeting being set.
- Scheduling almost always happens in the last minutes of a call. Read the end
  of the transcript carefully before concluding there was no next step.

STATUS — pick the one the transcript supports:
- "Closed Won"          — prospect explicitly agreed to buy or signed.
- "Closed Lost"         — prospect explicitly declined or disqualified.
- "Proposal Sent"       — a specific offer, price, or contract was put in front
                          of them and a decision is pending.
- "Follow-Up Scheduled" — ONLY if a concrete next meeting was agreed, i.e. only
                          when follow_up_date is non-empty.
- "No Clear Next Step"  — the honest default. The call happened, nothing
                          concrete was agreed. Expect to use this often.

DEAL STATUS — strict:
- "Won" only with explicit agreement to buy. "Lost" only with an explicit no.
- "In Progress" only when there is a live opportunity with a real agreed next step.
- "Unknown" otherwise. Do not mirror status just to fill the cell.

EVIDENCE:
- A single verbatim quote from the transcript, under 200 characters, that a human
  can check to confirm status and follow_up_date. Copy the words exactly.
- If nothing in the transcript supports a concrete next step, return "" — an
  empty evidence field is the correct output for a "No Clear Next Step" call.

SCORE — 0-100, and use the whole range:
Add up these components, judging only what the transcript shows:
- Discovery: did the rep learn the prospect's situation, budget, timeline?  0-25
- Qualification: was fit established, or did the rep pitch blind?           0-20
- Objection handling: were concerns surfaced and addressed?                 0-20
- Value: was the offer made concrete and specific to this prospect?         0-15
- Next step: was a real, dated commitment secured?                          0-20
Anchors: a call with no discovery and no next step belongs in the 20s. A
competent call that simply did not close lands near 50. Reserve 80+ for calls
that genuinely did nearly everything well. Do not cluster scores — if two calls
differ in quality, their scores must differ. Do not inflate to be kind.

CALL ANALYSIS:
- 2-3 sentences of practical coaching. Note what worked, then the single highest
  leverage thing to do differently. Be direct and specific; the rep is a
  professional, not someone who needs cushioning.

Return exactly this JSON shape:
{
  "status": "Closed Won" | "Closed Lost" | "Proposal Sent" | "Follow-Up Scheduled" | "No Clear Next Step",
  "summary": "2-3 sentences on what actually happened",
  "follow_up_phrase": "the exact words that set the day, e.g. \\"Monday afternoon\\", or \\"\\"",
  "follow_up_date": "YYYY-MM-DD, or \\"\\" when no specific day was agreed",
  "deal_status": "Won" | "Lost" | "In Progress" | "Unknown",
  "call_analysis": "2-3 sentences of direct coaching",
  "score": 0-100,
  "evidence": "verbatim quote backing status and follow_up_date, or \\"\\""
}"""

_WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}


def _resolve_weekday(phrase: str, meeting_date: str):
    """Turn a named weekday into the next date that falls on it after the meeting.

    Weekday arithmetic is not something to delegate to the model — measured
    against six calls with known answers it was wrong every time, always by one
    day. The model reports the words it heard; the calendar maths happens here.
    """
    if not phrase or not meeting_date:
        return None
    lowered = phrase.lower()
    mentions = [(lowered.index(name), offset) for name, offset in _WEEKDAYS.items() if name in lowered]
    if not mentions:
        return None
    _, target = min(mentions)  # the first weekday named wins
    try:
        base = datetime.strptime(meeting_date[:10], "%Y-%m-%d").date()
    except ValueError:
        return None
    delta = (target - base.weekday()) % 7
    if delta == 0:
        delta = 7  # "Monday" agreed on a Monday means the following one
    return base + timedelta(days=delta)


async def analyze_call(transcript: str, topic: str, meeting_date: str = "") -> dict:
    cleaned = _fit_to_budget(_clean_transcript(transcript))
    if not cleaned.strip():
        logger.warning(f"Transcript for topic={topic!r} is empty after cleaning")

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Meeting topic: {topic}\n"
                    f"Meeting date: {meeting_date}\n\n"
                    f"Transcript:\n{cleaned}"
                ),
            }
        ],
    )

    raw = message.content[0].text.strip()

    # Strip markdown code fences robustly
    if "```" in raw:
        # Extract content between first ``` and last ```
        parts = raw.split("```")
        # parts[1] is the block content (possibly starting with "json\n")
        if len(parts) >= 3:
            raw = parts[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.error(f"Claude returned unparseable JSON for topic={topic!r}: {raw[:300]}")
        return {
            "status": "No Clear Next Step",
            "summary": "Analysis failed — could not parse Claude response.",
            "follow_up_date": "",
            "deal_status": "Unknown",
            "call_analysis": "",
            "score": "",
            "evidence": "",
        }

    return _enforce_next_step_invariant(parsed, topic, meeting_date)


def _enforce_next_step_invariant(result: dict, topic: str = "", meeting_date: str = "") -> dict:
    """"Follow-Up Scheduled" must be backed by a real date — enforced here, not just asked for.

    The prompt is explicit about it, but the whole point of this column is that a
    reader can trust it, so the invariant is checked rather than assumed. A date
    that is not a parseable YYYY-MM-DD is dropped for the same reason, and a
    named weekday is recomputed from the meeting date rather than trusted.
    """
    for key in ("status", "summary", "follow_up_phrase", "follow_up_date",
                "deal_status", "call_analysis", "evidence"):
        result.setdefault(key, "")
    result.setdefault("score", "")

    # A weekday the model heard beats a date the model calculated.
    resolved = _resolve_weekday(str(result.get("follow_up_phrase", "")), meeting_date)
    if resolved:
        if str(result.get("follow_up_date", "")).strip() != resolved.isoformat():
            logger.info(
                f"Recomputed follow-up for topic={topic!r} from phrase "
                f"{result['follow_up_phrase']!r}: {result.get('follow_up_date')!r} -> {resolved}"
            )
        result["follow_up_date"] = resolved.isoformat()

    follow_up = str(result.get("follow_up_date", "")).strip()
    if follow_up:
        try:
            datetime.strptime(follow_up, "%Y-%m-%d")
        except ValueError:
            logger.warning(f"Discarding unparseable follow_up_date {follow_up!r} for topic={topic!r}")
            follow_up = ""
    result["follow_up_date"] = follow_up

    if result.get("status") == "Follow-Up Scheduled" and not follow_up:
        logger.info(f"Downgrading 'Follow-Up Scheduled' with no agreed date for topic={topic!r}")
        result["status"] = "No Clear Next Step"

    return result
