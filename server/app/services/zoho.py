import httpx
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"
BASE = "https://invoice.zoho.com/api/v3"


def _payment_instructions(invoice_number: str) -> str:
    return (
        "HOW TO PAY\n\n"
        "Send payment via ACH or Wire Transfer to:\n\n"
        f"Beneficiary Name: {settings.WISE_ACCOUNT_NAME}\n"
        f"Bank: {settings.WISE_BANK_NAME}\n"
        "Bank Address: 108 W 13th St, Wilmington, DE 19801, United States\n"
        f"Routing Number: {settings.WISE_ROUTING_NUMBER}\n"
        f"Account Number: {settings.WISE_ACCOUNT_NUMBER}\n"
        "Account Type: Deposit\n\n"
        f"IMPORTANT: You MUST include '{invoice_number}' in the payment memo/reference field.\n"
        "This is required to match your payment to this invoice.\n\n"
        "ACH transfers typically clear within 1-3 business days."
    )


def _check_zoho_response(r: httpx.Response, context: str):
    """Raise if Zoho returns HTTP error OR a Zoho-level error code in the body."""
    if not r.is_success:
        raise RuntimeError(f"Zoho HTTP error ({context}): {r.status_code} — {r.text[:1000]}")
    body = r.json()
    code = body.get("code")
    if code is not None and code != 0:
        raise RuntimeError(f"Zoho error ({context}): code={code} message={body.get('message')} body={r.text[:500]}")


async def _get_access_token() -> str:
    async with httpx.AsyncClient() as client:
        r = await client.post(TOKEN_URL, data={
            "refresh_token": settings.ZOHO_REFRESH_TOKEN,
            "client_id": settings.ZOHO_CLIENT_ID,
            "client_secret": settings.ZOHO_CLIENT_SECRET,
            "grant_type": "refresh_token",
        })
        r.raise_for_status()
        return r.json()["access_token"]


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Zoho-oauthtoken {token}",
        "X-com-zoho-invoice-organizationid": settings.ZOHO_ORGANIZATION_ID,
        "Content-Type": "application/x-www-form-urlencoded",
    }


async def _get_or_create_customer(
    token: str, name: str, email: str, phone: str = "", company_name: str = ""
) -> str:
    """Return Zoho customer_id, creating the contact if they don't exist."""
    headers = _headers(token)

    async with httpx.AsyncClient() as client:
        # Search without contact_type filter — catches contacts saved under any type
        r = await client.get(
            f"{BASE}/contacts",
            headers=headers,
            params={"email": email},
        )
        _check_zoho_response(r, "search customer")
        contacts = r.json().get("contacts", [])

        # Normalize phone — Zoho rejects non-standard formats
        clean_phone = ""
        if phone:
            digits = "".join(c for c in phone if c.isdigit() or c == "+")
            clean_phone = digits if len(digits) >= 7 else ""

        person: dict = {"email": email, "is_primary_contact": True}
        if clean_phone:
            person["phone"] = clean_phone

        contact_payload: dict = {
            "contact_name": name,
            "contact_type": "customer",
            "contact_persons": [person],
        }
        if company_name:
            contact_payload["company_name"] = company_name

        if contacts:
            customer_id = contacts[0]["contact_id"]
            logger.info(f"Found existing Zoho contact {customer_id} for {email} — updating")
            ur = await client.put(
                f"{BASE}/contacts/{customer_id}",
                headers=headers,
                data={"JSONString": json.dumps(contact_payload)},
            )
            logger.info(f"Update customer: {ur.status_code} {ur.text[:200]}")
            return customer_id

        # Create new customer
        r = await client.post(
            f"{BASE}/contacts",
            headers=headers,
            data={"JSONString": json.dumps(contact_payload)},
        )
        logger.info(f"Create customer: {r.status_code} {r.text[:500]}")

        # Retry without phone if that was the issue
        if r.status_code == 400 and clean_phone:
            logger.warning("Customer creation failed — retrying without phone")
            contact_payload.pop("phone", None)
            r = await client.post(
                f"{BASE}/contacts",
                headers=headers,
                data={"JSONString": json.dumps(contact_payload)},
            )
            logger.info(f"Create customer (no phone): {r.status_code} {r.text[:500]}")

        # If Zoho says name already exists (code 3062), find that contact by name
        if r.status_code == 400 and "3062" in r.text:
            logger.warning(f"Customer name already exists — searching by name: {name}")
            sr = await client.get(
                f"{BASE}/contacts",
                headers=headers,
                params={"contact_name": name, "contact_type": "customer"},
            )
            existing = sr.json().get("contacts", [])
            if existing:
                customer_id = existing[0]["contact_id"]
                logger.info(f"Recovered existing customer {customer_id} by name — updating with email/phone")
                ur = await client.put(
                    f"{BASE}/contacts/{customer_id}",
                    headers=headers,
                    data={"JSONString": json.dumps(contact_payload)},
                )
                logger.info(f"Update recovered customer: {ur.status_code} {ur.text[:200]}")
                return customer_id

        _check_zoho_response(r, "create customer")
        customer_id = r.json()["contact"]["contact_id"]
        logger.info(f"Created Zoho customer {customer_id} for {email}")
        return customer_id


def _billing_address_text(email: str, phone: str) -> str:
    """Build address text that renders in the Bill To section of the PDF."""
    lines = [f"Email: {email}"]
    if phone:
        lines.append(f"Phone: {phone}")
    return "\n".join(lines)


async def create_and_send_invoice(
    contact_name: str,
    contact_emails: list[str],
    deal_name: str,
    amount: float,
    phone: str = "",
    company_name: str = "",
    currency: str = "USD",
    subject: str = "",
) -> dict:
    if not contact_emails:
        raise ValueError("contact_emails must not be empty")

    token = await _get_access_token()
    headers = _headers(token)

    primary_email = contact_emails[0]
    customer_id = await _get_or_create_customer(
        token, contact_name, primary_email, phone=phone, company_name=company_name
    )

    line_items = [
        {
            "name": f"Lead Gen & Marketing Services - {contact_name}",
            "description": "Direct Sales Network LLC",
            "quantity": 1,
            "rate": amount,
            "unit": "service",
        }
    ]

    invoice_subject = subject or deal_name

    # Create invoice with placeholder notes first so Zoho assigns the invoice number
    invoice_payload = json.dumps({
        "customer_id": customer_id,
        "currency_code": currency,
        "subject": invoice_subject,
        "notes": _payment_instructions("PENDING"),
        "terms": "Payment due within 7 days. Please include the invoice number in your payment reference.",
        "payment_terms": 7,
        "payment_terms_label": "Due in 7 days",
        "billing_address": {"address": _billing_address_text(primary_email, phone)},
        "line_items": line_items,
    })

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE}/invoices",
            headers=headers,
            data={"JSONString": invoice_payload},
        )
        logger.info(f"Create invoice: {r.status_code} {r.text[:300]}")
        _check_zoho_response(r, "create invoice")
        invoice = r.json()["invoice"]
        invoice_id = invoice["invoice_id"]
        real_invoice_number = invoice["invoice_number"]

        # Update notes with the real invoice number — include required fields to avoid wiping data
        update_payload = json.dumps({
            "customer_id": customer_id,
            "currency_code": currency,
            "subject": invoice_subject,
            "notes": _payment_instructions(real_invoice_number),
            "terms": "Payment due within 7 days. Please include the invoice number in your payment reference.",
            "payment_terms": 7,
            "payment_terms_label": "Due in 7 days",
            "billing_address": {"address": _billing_address_text(primary_email, phone)},
            "line_items": line_items,
        })
        ur = await client.put(
            f"{BASE}/invoices/{invoice_id}",
            headers=headers,
            data={"JSONString": update_payload},
        )
        logger.info(f"Update notes: {ur.status_code} {ur.text[:200]}")
        _check_zoho_response(ur, "update notes")
        # Use the updated invoice from the PUT response so the returned dict is fresh
        invoice = ur.json().get("invoice", invoice)

        # Send to all collected emails (opportunity + contact, deduplicated)
        email_payload = json.dumps({
            "to_mail_ids": contact_emails,
            "subject": f"Invoice from Direct Sales Network — {deal_name}",
            "body": (
                f"Hi {contact_name},\n\n"
                "Please find your invoice attached.\n\n"
                "To complete your payment, initiate an ACH or wire transfer "
                "using the banking details in the invoice notes.\n\n"
                "Direct Sales Network LLC"
            ),
        })
        er = await client.post(
            f"{BASE}/invoices/{invoice_id}/email",
            headers=headers,
            data={"JSONString": email_payload},
        )
        logger.info(f"Send email: {er.status_code} — {er.text[:500]}")
        _check_zoho_response(er, "send email")

    return invoice
