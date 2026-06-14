# DSN Call Orchestrator

Node.js/Express service deployed on Railway that handles DSN's outbound AI calling via Retell. Two functions: speed-to-lead (call new leads after a 5min buffer — gives self-bookers time to book before the AI calls) and appointment reminders (T-24h + T-1h before strategy calls).

Live URL: `https://dsn-call-orchestrator-production.up.railway.app`

---

## Architecture

```
GHL Webhook ──► /webhook/new-lead          ──► Supabase leads table
                /webhook/appointment-booked ──► Supabase appointments + reminders
                /webhook/appointment-cancelled ──► cancel appointment + reminders

In-process    ──► /cron/speed-to-lead        ──► picks up leads where next_followup_at <= now()
scheduler        /cron/appointment-reminders ──► picks up reminders where trigger_at <= now()
(setInterval,    /cron/no-show-check         ──► marks past appointments 'no_show', resumes follow-up
 every 5/5/15min)
                         │
                         ▼
                 Retell API create-phone-call
                         │
                         ▼
              Morgan (AI agent) calls lead
                         │
              Lead picks a time ──► /retell/function/check-availability ──► GHL slots API
              Lead books      ──► /retell/function/book-appointment      ──► GHL calendar API
                         │
                         ▼
             /webhook/retell (call_analyzed) ──► update lead status, log to Supabase
```

---

## Key IDs

| Resource | ID |
|---|---|
| Railway project | `b15f53c2-10e3-48b1-a006-0557020f5499` |
| Supabase project | `kygcxlteriyctkzcpzvk` |
| GHL location | `NgduPjDbvABP3zFIqnt4` |
| GHL calendar | `DXh5uGCZVjFLPQNeKRZu` |
| Retell speed-to-lead agent | `agent_d7bffee08f5962e2a0c5789fcd` |
| Retell reminder agent | `agent_1cf55115cf9e5477adb445c754` |
| Retell speed-to-lead flow | `conversation_flow_9ef584e2f263` |
| Retell reminder flow | `conversation_flow_68c0252a092d` |

---

## Environment Variables

```
# Retell
RETELL_API_KEY=                  # shared DSN/TFG Retell workspace key — see secrets manager
RETELL_FROM_NUMBER=+15618340099  # set ✅
RETELL_AGENT_ID_SPEED_TO_LEAD=agent_d7bffee08f5962e2a0c5789fcd
RETELL_AGENT_ID_REMINDER=agent_1cf55115cf9e5477adb445c754

# Supabase (project kygcxlteriyctkzcpzvk)
SUPABASE_URL=https://kygcxlteriyctkzcpzvk.supabase.co
SUPABASE_SECRET_KEY=             # service_role key from Supabase dashboard

# GHL
GHL_API_KEY=
GHL_LOCATION_ID=NgduPjDbvABP3zFIqnt4
GHL_CALENDAR_ID=DXh5uGCZVjFLPQNeKRZu

# Security
WEBHOOK_SECRET=                  # generate a random 32-char string — see secrets manager

# Admin
ADMIN_PASSWORD=                  # gates /admin/* endpoints — required, server fails closed if unset
```

---

## Endpoints

### Inbound webhooks (from GHL)
| Method | Path | Trigger |
|---|---|---|
| POST | `/webhook/new-lead` | GHL: new contact created |
| POST | `/webhook/appointment-booked` | GHL: appointment booked |
| POST | `/webhook/appointment-cancelled` | GHL: appointment cancelled |
| POST | `/webhook/opt-out` | GHL: contact opts out / tagged DNC |

All four require header `x-webhook-secret: <WEBHOOK_SECRET>`.

### Inbound webhooks (from Retell)
| Method | Path | Events |
|---|---|---|
| POST | `/webhook/retell` | `call_started`, `call_ended`, `call_analyzed` |

Verified via `x-retell-signature` HMAC (raw body required).

### Retell tool functions (called by agent mid-call)
| Method | Path | What it does |
|---|---|---|
| POST | `/retell/function/check-availability` | Returns free GHL slots for the next N days |
| POST | `/retell/function/book-appointment` | Books slot on GHL calendar, creates appointment + reminder rows |

### Cron triggers
The server runs all three jobs itself via an in-process `setInterval` scheduler (started in `app.listen`'s callback) — no external scheduler is required for the service to function. The `/cron/*` endpoints below remain available, secured by `x-cron-secret: <CRON_SECRET>`, and are also hit on the same schedule by the `.github/workflows/cron.yml` GitHub Actions workflow as a redundant trigger (handy if the service restarts right as a tick is due). `cron_locks` (distributed lock) ensures only one trigger actually runs a given tick.

| Method | Path | Schedule |
|---|---|---|
| POST | `/cron/speed-to-lead` | every 5min |
| POST | `/cron/appointment-reminders` | every 5min |
| POST | `/cron/no-show-check` | every 15min |

### Admin / debug
| Path | Shows |
|---|---|
| GET `/health` | Service connection status (Supabase, GHL, Retell, agents) + per-cron-job staleness (`status: "degraded"` if a cron job hasn't run in >2x its interval) |
| GET `/ping` | 200 OK — use for uptime monitoring |
| GET `/admin/leads` | All leads |
| GET `/admin/call-logs` | All call logs |
| GET `/admin/lead-events` | Audit trail |
| GET `/admin/reminders` | Appointment reminders |
| GET `/admin/failed-webhooks` | Dead-letter queue |
| GET `/admin/dnc` | Do-not-call list |

---

## Lead lifecycle

```
new ──► calling ──► booked      (speed_to_lead call booked appointment)
                ──► not_interested
                ──► exhausted   (6 attempts, no answer/voicemail)
                ──► dnc         (asked to stop calling)

booked ──► calling   (no_show: appointment time passed with no GHL status update —
                       /cron/no-show-check re-enters lead at followup_step=2,
                       last_call_outcome='no_show', skips the double-dial)
```

Follow-up delays (speed_to_lead, steps 1–6): immediate, 45s (double-dial), 10min, 30min, 4h, 24h.

---

## Appointment reminder lifecycle

On `appointment-booked` webhook, two rows are inserted into `appointment_reminders`:
- `reminder_24h` — fires at `start_at - 24h`
- `reminder_1h` — fires at `start_at - 1h`

Cron picks up rows where `trigger_at <= now()` and `status = 'pending'`. Before claiming, it checks the `dnc` table (a lead who opted out after booking gets the reminder skipped and is marked `dnc`) and TCPA calling hours (8am–9pm lead-local) — if outside hours, `trigger_at` is deferred forward rather than calling. Then it atomically claims the row (`status = 'sent'`) before calling Retell.

---

## Timezone handling (US-only assumption)

`phoneToTimezone()` maps US area codes to IANA timezones and falls back to `America/New_York` for any number it doesn't recognize (including all non-US numbers). This is used as the last resort in the timezone priority chain (GHL contact timezone → webhook payload timezone → area-code lookup → `America/New_York`) for both TCPA calling-hours checks and the times spoken in reminder calls.

**This is a deliberate US-only assumption.** If DSN ever calls leads outside the US/Canada NANP area codes, those leads will be scheduled and reminded in Eastern time regardless of their actual timezone — an 8am "TCPA-compliant" call could land at 1am or 1pm their time, and reminder calls will state the wrong local appointment time. No code change is needed unless/until DSN's lead geography expands beyond North America.

---

## Knowledge base / playbook

`scripts/build_playbook.py` pulls Zoom strategy call transcripts, runs two-pass Claude synthesis (per-call JSON extraction → Opus playbook), and injects the result into the speed-to-lead agent's `global_prompt`.

```bash
cd dsn-orchestrator
pip install -r scripts/requirements.txt

# Full run: fetch new transcripts + synthesize + push to Retell
python scripts/build_playbook.py

# Re-synthesize from cache (skip Zoom fetch)
python scripts/build_playbook.py --synthesize-only

# Just push existing playbook.json
python scripts/build_playbook.py --push-only
```

Zoom credentials are read from `server/.env` (`ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ANTHROPIC_API_KEY`).

**Cadence & ownership — this is a manual, on-demand script, not a scheduled job.** Nothing runs it automatically, and nothing alerts if it goes stale — if no one runs it, the speed-to-lead agent silently keeps using last week's (or last month's) objection-handling playbook with no error. Whoever owns the STL prompt should re-run `python scripts/build_playbook.py` periodically (e.g. monthly, or after a batch of new strategy-call transcripts lands in Zoom) and spot-check the diff in `playbook.json` before/after — it's pushed straight into the *live* agent's `global_prompt` via `--push-only`/full run, so a bad synthesis run affects production calls immediately.

---

## Debugging

**First stop:** `GET /admin/failed-webhooks` — any webhook that threw is stored here with full payload + error message.

**Lead stuck in 'calling'?** Check `GET /admin/lead-events?lead_id=X` for the audit trail.

**Reminder didn't fire?** Check `GET /admin/reminders` — look at `status` and `trigger_at`. If `status=pending` and `trigger_at` is in the past, the cron lock may be stuck. Reset: `UPDATE cron_locks SET locked_until = '1970-01-01' WHERE job_name = 'appointment_reminders';`

**Cron lock reset (Supabase SQL editor):**
```sql
UPDATE cron_locks SET locked_until = '1970-01-01 00:00:00+00';
```

---

## Pending (as of 2026-06-14)

1. **Publish 4 GHL Automation Workflows** — the drafts already exist in GHL, they just need configuration verified and Published. See the table below. *(Dashboard action — cannot be done via API.)*
2. **End-to-end test:** submit test lead → call fires ~5min later (if not self-booked first) → book slot → reminders appear in Supabase → reminder calls fire
3. **UptimeRobot monitor** — point at `GET /ping` for uptime alerting.
4. **Retell flow v1 publish** *(optional)* — v1 drafts were patched 2026-06-14 with flow improvements; v0 is live and working. Publish v1 from the Retell dashboard when ready to go live with the improvements.

Everything else is fully wired: phone number `+15618340099` set, Twilio SIP trunk configured, all Railway env vars set.

---

## Twilio / call routing

Phone number `+15618340099` serves three roles simultaneously:

```
+15618340099
    │
    ├── INBOUND (lead calls back)
    │   └── Twilio voice webhook → GHL (leadconnectorhq.com)
    │       Agents answer in GHL conversations inbox
    │
    ├── GHL OUTBOUND (human agent dials from GHL)
    │   └── GHL → Twilio programmable voice → PSTN
    │
    └── RETELL OUTBOUND (AI speed-to-lead / reminder calls)
        └── Retell → SIP INVITE to dsn-retellai.pstn.twilio.com
            Authenticated via IP ACL 18.98.16.120/30 (Retell SBC range)
            Exits to PSTN showing +15618340099 as caller ID
```

**Twilio Elastic SIP Trunk — DSN - Retell AI** (`TK5a0c87c46e7da48a3069f0291a0c9c96`):

| Setting | Value |
|---|---|
| Termination URI | `dsn-retellai.pstn.twilio.com` |
| Origination URI | `sip:sip.retellai.com` (priority 10) |
| IP ACL | `18.98.16.120/30` — Retell SIP SBC |
| Active region | United States (US1) |

No credentials needed — IP ACL authentication is sufficient for Retell's SBC range.

---

## GHL Workflow configuration

The orchestrator expects **GHL Automation Workflow** webhooks — NOT native GHL webhook subscriptions (Settings → Integrations → Webhooks). The payload field names differ; the code reads `contact_id`, `appointment_id`, `start_time` which only Workflow custom data sends.

Header on all 4 webhook actions:
```
x-webhook-secret: 3b4cf74321aff6778ece459be76462127ffcaef642dbb536
```

| Workflow | Trigger | URL | Custom data fields to configure |
|---|---|---|---|
| New Lead → Retell AI | Contact Created | `.../webhook/new-lead` | `contact_id`, `first_name`, `last_name`, `phone`, `email` |
| Appointment Booked → Retell AI | Appointment Created | `.../webhook/appointment-booked` | `contact_id`, `appointment_id`, `start_time`, `end_time` |
| Appointment Cancelled → Retell AI | Appointment Status Changed (Cancelled) | `.../webhook/appointment-cancelled` | `appointment_id` |
| Opt-out (DND) → Retell AI | Tag Added ("DNC") | `.../webhook/opt-out` | `contact_id`, `phone` |

GHL variable tokens to use in the custom data values: `{{contact.id}}`, `{{contact.phone}}`, `{{contact.first_name}}`, `{{contact.last_name}}`, `{{contact.email}}`, `{{appointment.id}}`, `{{appointment.start_time}}`, `{{appointment.end_time}}`.

**Note:** when Morgan books an appointment during a speed-to-lead call (via the `book-appointment` tool), GHL will also fire the Appointment Created workflow. The handler is idempotent — the upsert is safe to run twice on the same appointment.
