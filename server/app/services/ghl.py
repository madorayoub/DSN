import httpx
from app.config import settings

BASE = "https://services.leadconnectorhq.com"
HEADERS = {
    "Authorization": f"Bearer {settings.GHL_API_KEY}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "User-Agent": "DSN-Orchestrator/1.0",
}


async def get_contact(contact_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE}/contacts/{contact_id}", headers=HEADERS)
        r.raise_for_status()
        return r.json().get("contact", {})


async def move_to_stage(opportunity_id: str, stage_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.put(
            f"{BASE}/opportunities/{opportunity_id}",
            headers=HEADERS,
            json={"pipelineStageId": stage_id},
        )
        r.raise_for_status()
        return r.json()


import re

# Prefixes like "Strategy Call — " that precede the actual contact name
_TOPIC_PREFIXES = re.compile(
    r"^(strategy|discovery|intro|demo|onboard\w*)\s+call\s*[—–\-]\s*",
    re.IGNORECASE,
)

# Suffixes appended to Zoom meeting topics that don't appear in GHL contact names
# Includes em-dash (—), en-dash (–), and hyphen (-)
_TOPIC_SUFFIXES = re.compile(
    r"\s*[—–\-]\s*(follow[\s\-]?up|followup|fu|check[\s\-]?in|callback|call\s*back|"
    r"re[\s\-]?schedule|reschedule|intro|discovery|demo|onboard\w*)$",
    re.IGNORECASE,
)


def _clean_topic(name: str) -> str:
    """Strip Zoom-topic prefixes and suffixes so GHL name search has a better match rate."""
    name = _TOPIC_PREFIXES.sub("", name).strip()
    name = _TOPIC_SUFFIXES.sub("", name).strip()
    return name


async def search_contact_by_name(name: str) -> dict:
    """Search GHL contacts by name (with suffix-stripped fallback), return first match."""
    candidates = [name]
    cleaned = _clean_topic(name)
    if cleaned != name:
        candidates.append(cleaned)

    async with httpx.AsyncClient() as client:
        for query in candidates:
            r = await client.get(
                f"{BASE}/contacts/",
                headers=HEADERS,
                params={"locationId": settings.GHL_LOCATION_ID, "query": query, "limit": 1},
            )
            if r.status_code != 200:
                logger.warning(f"GHL contact search returned {r.status_code} for query={query!r}")
                continue
            results = r.json().get("contacts", [])
            if results:
                return results[0]
    return {}


async def get_opportunity(opportunity_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE}/opportunities/{opportunity_id}", headers=HEADERS
        )
        r.raise_for_status()
        return r.json().get("opportunity", {})


async def get_opportunities_by_contact(contact_id: str) -> list:
    """Get all opportunities for a contact, sorted by most recently updated."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE}/opportunities/search",
            headers=HEADERS,
            params={
                "location_id": settings.GHL_LOCATION_ID,
                "contact_id": contact_id,
                "limit": 10,
            },
        )
        r.raise_for_status()
        return r.json().get("opportunities", [])
