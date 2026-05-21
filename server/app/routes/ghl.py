from fastapi import APIRouter, Request, HTTPException
from app.config import settings
from app.services import ghl as ghl_service
from app.services import zoho as zoho_service
import logging, json

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/stage-changed")
async def stage_changed(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    logger.info(f"GHL payload: {json.dumps(body)}")

    data = body.get("data") or body
    contact_id = (
        data.get("contact_id") or data.get("contactId") or
        body.get("contact_id") or body.get("contactId")
    )
    opportunity_id = (
        data.get("opportunity_id") or data.get("opportunityId") or
        body.get("opportunity_id") or body.get("opportunityId")
    )

    if not contact_id:
        raise HTTPException(status_code=400, detail="No contact_id in payload")

    # If GHL didn't send opportunity_id, find the one currently in "Invoice Sent" stage
    if not opportunity_id:
        logger.info(f"No opportunity_id in payload — looking up by contact {contact_id}")
        opps = await ghl_service.get_opportunities_by_contact(contact_id)
        opp = next(
            (o for o in opps if o.get("pipelineStageId") == settings.GHL_STAGE_INVOICE_SENT),
            None,
        )
        if not opp:
            raise HTTPException(status_code=404, detail=f"No opportunity in Invoice Sent stage for contact {contact_id}")
        opportunity_id = opp["id"]
        opportunity = opp
    else:
        opportunity = await ghl_service.get_opportunity(opportunity_id)

    stage_id = (
        data.get("pipeline_stage_id") or data.get("pipelineStageId") or
        body.get("pipelineStageId") or
        opportunity.get("pipelineStageId")
    )

    logger.info(f"opp={opportunity_id} stage={stage_id} expected={settings.GHL_STAGE_INVOICE_SENT}")

    if stage_id != settings.GHL_STAGE_INVOICE_SENT:
        return {"status": "ignored", "stage": stage_id}

    contact = await ghl_service.get_contact(contact_id)
    contact_name = contact.get("name") or contact.get("firstName", "Client")
    deal_name = opportunity.get("name", "Professional Services")

    raw_amount = opportunity.get("monetaryValue")
    amount = float(raw_amount or 0) or 1999.0
    if not raw_amount or float(raw_amount) <= 0:
        logger.warning(f"Opportunity {opportunity_id} has no monetary value — defaulting to $1,999")

    # Collect emails from both opportunity and contact, deduplicated, preserving order
    seen_emails = set()
    emails = []
    for email in [opportunity.get("email"), contact.get("email")]:
        if email and email not in seen_emails:
            seen_emails.add(email)
            emails.append(email)

    if not emails:
        raise HTTPException(status_code=422, detail=f"No email for contact {contact_id}")

    # Phone — contact first, fall back to opportunity, deduplicated
    seen_phones = set()
    phones = []
    for phone in [
        contact.get("phone"), contact.get("mobilePhone"),
        opportunity.get("phone"),
    ]:
        if phone and phone not in seen_phones:
            seen_phones.add(phone)
            phones.append(phone)
    phone = phones[0] if phones else ""

    # Company name from opportunity level only — blank if not set
    company_name = (
        opportunity.get("companyName") or
        opportunity.get("company_name") or
        ""
    )

    invoice = await zoho_service.create_and_send_invoice(
        contact_name=contact_name,
        contact_emails=emails,
        deal_name=deal_name,
        amount=amount,
        phone=phone,
        company_name=company_name,
    )

    invoice_id = invoice.get("invoice_id", "unknown")
    logger.info(f"Invoice {invoice_id} sent to {emails}")
    return {"status": "invoice_sent", "invoice_id": invoice_id}
