# DSN Call Orchestrator

Node.js/Express service deployed on Railway that handles DSN's outbound AI calling via Retell. Two functions: speed-to-lead (call new leads after a 5min buffer — gives self-bookers time to book before the AI calls) and appointment reminders (T-24h + T-1h before strategy calls).

Live URL: `https://dsn-call-orchestrator-production.up.railway.app`

---

## Architecture

```
GHL Webhook ──► /webhook/new-lead          ──► Supabase leads table
                /webhook/appointment-booked ──► Supabase appointments + reminders
                /webhook/appointment-cancelled ──► cancel appointment + reminders

Railway Cron ──► /cron/speed-to-lead        ──► picks up leads where next_followup_at <= now()
(every 5min)     /cron/appointment-reminders ──► picks up reminders where trigger_at <= now()
(every 15min)    /cron/no-show-check         ──► marks past appointments 'no_show', resumes follow-up
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
RETELL_FROM_NUMBER=              # E.164 — buy in Retell dashboard, PENDING
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

### Cron triggers (Railway hits these)
| Method | Path | Schedule |
|---|---|---|
| POST | `/cron/speed-to-lead` | `*/5 * * * *` |
| POST | `/cron/appointment-reminders` | `*/5 * * * *` |
| POST | `/cron/no-show-check` | `*/15 * * * *` |

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

## Pending (as of 2026-06-12)

1. **Buy DSN phone number in Retell** → `railway variables set RETELL_FROM_NUMBER=+1XXXXXXXXXX --service dsn-call-orchestrator`
2. **Wire 3 GHL webhooks** with header `x-webhook-secret: <value of WEBHOOK_SECRET from Railway env vars>`:
   - New lead → `POST .../webhook/new-lead`
   - Appointment booked → `POST .../webhook/appointment-booked`
   - Appointment cancelled → `POST .../webhook/appointment-cancelled`
3. **End-to-end test:** submit test lead → call fires ~5min later (if not self-booked first) → book slot → reminders appear in Supabase → reminder calls fire
