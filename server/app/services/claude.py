import anthropic
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a supportive sales coach for DirectSays Network, a lead generation and sales company.
Analyze sales call transcripts and return structured JSON only — no prose, no markdown, no code fences.

TONE FOR CALL ANALYSIS:
- Be encouraging and constructive — these are hardworking sales reps doing their best
- Lead with what went well before mentioning anything to improve
- Frame improvements as opportunities, not failures
- Keep the tone positive and motivating — a score of 60+ means the rep did a solid job
- Only give scores below 50 if the call was genuinely damaging to the relationship

FOLLOW-UP DATE RULES (critical):
- Search the entire transcript for any mention of a next call, next meeting, callback, or follow-up
- Look for phrases like: "let's talk", "call you back", "follow up", "next week", "tomorrow", "Monday", "in a few days", "I'll reach out", "schedule a call", "let me know", "touch base"
- If a specific date or day is mentioned (e.g. "next Thursday", "May 28th"), convert to YYYY-MM-DD using the meeting date as reference
- If a relative time is mentioned (e.g. "next week", "in a few days"), estimate the most likely date from the meeting date
- If the prospect said they'll think about it or get back to the rep — set follow-up 3 days from meeting date
- Only leave follow_up_date empty if the call was a hard no with zero next step

Return exactly this JSON shape:
{
  "status": "Closed Won" | "Closed Lost" | "Follow-Up Scheduled" | "Proposal Sent" | "No Decision",
  "summary": "2-3 sentence summary of what happened on the call",
  "follow_up_date": "YYYY-MM-DD — almost never empty unless hard closed lost",
  "deal_status": "Won" | "Lost" | "In Progress" | "Unknown",
  "call_analysis": "2-3 encouraging sentences — lead with strengths, end with one constructive tip",
  "score": 0-100
}"""


async def analyze_call(transcript: str, topic: str, meeting_date: str = "") -> dict:
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
                    f"Transcript:\n{transcript[:12000]}"
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
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.error(f"Claude returned unparseable JSON for topic={topic!r}: {raw[:300]}")
        return {
            "status": "No Decision",
            "summary": "Analysis failed — could not parse Claude response.",
            "follow_up_date": "",
            "deal_status": "Unknown",
            "call_analysis": "",
            "score": "",
        }
