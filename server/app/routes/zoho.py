from fastapi import APIRouter, Request
from app.config import settings
from app.services import ghl as ghl_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/invoice-paid")
async def invoice_paid(request: Request):
    """
    Zoho Invoice fires this webhook when an invoice status changes.
    Configure in Zoho: Settings > Integrations > Webhooks > Invoice Paid
    """
    body = await request.json()
    logger.info(f"Zoho webhook received: {body}")

    # Zoho sends different payload shapes — handle both
    invoice_data = body.get("invoice") or body.get("data", {}).get("invoice", {})
    status = invoice_data.get("status")

    if status != "paid":
        return {"status": "ignored", "invoice_status": status}

    # The contact email is on the invoice — use it to find the GHL contact
    customer_name = invoice_data.get("customer_name")
    invoice_number = invoice_data.get("invoice_number")

    # Custom field on invoice — store GHL opportunity ID when creating invoice
    # (set via Zoho's custom_fields on the invoice payload)
    opportunity_id = next(
        (
            f["value"]
            for f in invoice_data.get("custom_fields", [])
            if f.get("label") == "GHL Opportunity ID"
        ),
        None,
    )

    if not opportunity_id:
        logger.warning(f"Invoice {invoice_number} paid but no GHL opportunity ID found — manual stage update needed")
        return {"status": "no_opportunity_id", "invoice": invoice_number}

    await ghl_service.move_to_stage(
        opportunity_id=opportunity_id,
        stage_id=settings.GHL_STAGE_PAID_DEAL_CLOSED,
    )

    logger.info(f"Moved opportunity {opportunity_id} to Paid/Onboarding — invoice {invoice_number}")
    return {"status": "stage_updated", "opportunity_id": opportunity_id}
