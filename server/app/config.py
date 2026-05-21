from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # GoHighLevel
    GHL_API_KEY: str
    GHL_LOCATION_ID: str
    GHL_PIPELINE_ID: str
    GHL_STAGE_INVOICE_SENT: str = "b15c53b4-b293-417c-83a7-2397e8b87fd5"
    GHL_STAGE_PAID_DEAL_CLOSED: str = "4da0210c-127c-41ea-b9a9-e3ae5cd45e16"

    # Zoho Invoice
    ZOHO_CLIENT_ID: str
    ZOHO_CLIENT_SECRET: str
    ZOHO_REFRESH_TOKEN: str
    ZOHO_ORGANIZATION_ID: str

    # Zoom
    ZOOM_ACCOUNT_ID: str
    ZOOM_CLIENT_ID: str
    ZOOM_CLIENT_SECRET: str

    # Claude
    ANTHROPIC_API_KEY: str

    # Google Sheets
    GOOGLE_SHEET_ID: str
    GOOGLE_SERVICE_ACCOUNT_JSON: str  # full JSON string, base64 encoded

    # Wise (for invoice template — not used in API calls, just reference)
    WISE_ROUTING_NUMBER: str
    WISE_ACCOUNT_NUMBER: str
    WISE_ACCOUNT_NAME: str
    WISE_BANK_NAME: str = "Wise US Inc"

    class Config:
        env_file = ".env"


settings = Settings()
