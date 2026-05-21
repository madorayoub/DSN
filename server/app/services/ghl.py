import httpx
from app.config import settings

BASE = "https://services.leadconnectorhq.com"
HEADERS = {
    "Authorization": f"Bearer {settings.GHL_API_KEY}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
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


async def search_contact_by_name(name: str) -> dict:
    """Search GHL contacts by name, return first match with email + phone."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE}/contacts/",
            headers=HEADERS,
            params={"locationId": settings.GHL_LOCATION_ID, "query": name, "limit": 1},
        )
        if r.status_code != 200:
            return {}
        results = r.json().get("contacts", [])
        return results[0] if results else {}


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
