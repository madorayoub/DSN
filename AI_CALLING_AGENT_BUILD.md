# DSN — Retell AI Calling Agent: Architecture & Build Plan

> **Purpose of this file:** Complete handoff document. If a build session is interrupted (usage limits, context loss), any engineer or AI agent can pick up from here with zero prior context. Read top to bottom before writing code.
>
> Last updated: 2026-06-12. Status: **DEPLOYED — orchestrator live on Railway, schema live on Supabase, Retell flows + agents active. Pending: DSN phone number purchase + 3 GHL webhooks.**
>
> **Revision 2 (2026-06-11, per Ayoub):** The orchestrator will be a **NEW standalone Railway service** (do NOT build inside the existing DSN server), and **Supabase is the single source of truth** (NOT Railway Postgres). See Sections 2b, 5, 6.

## 2b. Railway account inventory — two companies, don't mix them

The Railway account (`ayoubhighlevel3-arch`, ayoub.highlevel3@gmail.com) runs services for TWO unrelated companies:

| Railway project | Company | Purpose |
|---|---|---|
| `appealing-perception` | **DSN** (GHL location `NgduPjDbvABP3zFIqnt4`) | Existing DSN FastAPI server described in Section 2 (Zoom sync, Zoho invoicing) |
| `fb-lead-orchestrator` | **Task Force Garage (TFG)** (GHL location `EK2GwCXGAzUxIDjqhQ9C`) | TFG's speed-to-lead Retell orchestrator. Multi-city agents (Charlotte/Nashville/Scottsdale/Seattle each with own `RETELL_AGENT_ID_*` + `RETELL_FROM_NUMBER_*`), GHL calendar `VbGrFLei6jzy154UaZaP`, Supabase (`ewoftdovrrhcvliijyrl` = "TFG - Floor Visualizer") |
| `tfg-q2c` | TFG | Quote-to-contract (SignWell, Zoho Books, Supabase `proytmpvlxfbisxtrkai`) |
| `heartfelt-expression` (service `TFG-main`, repo `madorayoub/TFG-main`) | TFG | CRM/funnels at taskforcegarage.com (Postmark email, Retell agents, cron) |
| `wa-agent` | Personal | WhatsApp agent |

**Rules:**
- TFG services are COMPLETELY UNRELATED to DSN. Never reuse TFG's GHL location, calendars, Supabase projects, or phone numbers for DSN.
- The DSN orchestrator lives in its own Railway project (`dsn-call-orchestrator`, project ID `b15f53c2-10e3-48b1-a006-0557020f5499`).

---

## 2c. Retell account — DSN agents vs TFG agents (CRITICAL — never mix)

The Retell account (`key_b94ce6795b1d70d2882779b2eb31`) is **shared** between DSN and TFG. Both companies' agents live in the same Retell workspace. **Only edit the DSN agents listed below.**

### DSN agents (this repo — safe to edit)

| ID | Name | Type | Conversation flow |
|---|---|---|---|
| `agent_d7bffee08f5962e2a0c5789fcd` | Morgan — DSN Speed to Lead | Speed-to-lead outbound | `conversation_flow_9ef584e2f263` |
| `agent_1cf55115cf9e5477adb445c754` | Morgan — DSN Reminder | Appointment reminder | `conversation_flow_68c0252a092d` |

Both flows call back to `https://dsn-call-orchestrator-production.up.railway.app/retell/function/`.

### TFG agents (NEVER touch — separate company)

TFG runs **multi-city** agents. Each city has its own agent ID + from-number + GHL pipeline. These are in the same Retell workspace but belong to Task Force Garage, not DSN:

| City | Railway project | GHL location |
|---|---|---|
| Charlotte | `heartfelt-expression` (TFG-main) | `EK2GwCXGAzUxIDjqhQ9C` |
| Nashville | same | same |
| Scottsdale | same | same |
| Seattle | same | same |

**If you are ever looking at the Retell dashboard and see agents named after cities or "Task Force" — those are TFG. Do not edit, clone, or delete them for DSN work.**

---

## 2d. Timezone — area code lookup (already built)

Phone number → IANA timezone is resolved automatically from the US area code. No external API needed.

- Map: `AREA_CODE_TZ` in `dsn-orchestrator/index.js` (~330 US area codes → IANA tz)
- Function: `phoneToTimezone(phone)` — strips country code, reads 3-digit area code, returns e.g. `America/Chicago`. Falls back to `America/New_York` for unknown codes.
- Wired at all trigger points: new-lead webhook (line ~601), speed-to-lead cron (line ~641), reminder cron (line ~870)
- GHL timezone field takes precedence if present; area-code lookup is the fallback when GHL doesn't send it.

No ZIP codes required. All TCPA calling-hours checks (`msUntilCallable`) use the resolved IANA timezone.

---

## 1. Who we are (context for the AI agent's persona)

**Direct Sales Network LLC (DSN)** — B2B lead generation / sales development agency (founded 2017).
- Site: https://directsales.network (static site in `/docs`, GitHub Pages)
- Offer: omnichannel outreach programs delivering 100–400+ qualified appointments/year.
- Two funnels: **Trial** (`docs/trial/offer.html` — contractors/service businesses, "pre-sold jobs") and **Commercial** (`docs/commercial/offer.html` — B2B/enterprise SDR programs).
- Lead books a **free 30-min strategy call** via GHL calendar widget on `docs/book-a-call.html`.
- Company phone: +1 (561) 556-7182 · contact@directsales.network

## 2. Existing system (already built and deployed — DO NOT rebuild)

**Backend:** FastAPI in `server/`, deployed on **Railway** (`server/railway.toml`, start: `uvicorn app.main:app`). Health check at `/health`.

| Piece | File | What it does |
|---|---|---|
| Booking | `netlify/functions/booking.js` | GET availability / POST booking against GHL calendar `DXh5uGCZVjFLPQNeKRZu`. Upserts contact by phone (E.164), creates 30-min appointment. Fields captured: name, email, phone, timezone, slot. |
| GHL service | `server/app/services/ghl.py` | Contacts, opportunities, stage moves. Location `NgduPjDbvABP3zFIqnt4`, pipeline `deeFJVq1U9SYR8WIvEkl`. |
| Zoom sync | `server/app/services/zoom.py` + `server/app/routes/zoom.py` | Railway cron (13:00 & 21:00 UTC) hits `POST /cron/zoom/run` → pulls past meetings + cloud recordings, downloads VTT transcripts, sends to Claude Haiku (`server/app/services/claude.py`) for status/summary/score, logs to Google Sheet (`server/app/services/sheets.py`), dedup by meeting ID. |
| Invoicing | `server/app/routes/ghl.py`, `zoho.py` | GHL stage "Invoice Sent" webhook → Zoho invoice; Zoho paid webhook → move to "Paid/Deal Closed". |

**Credentials** all in `server/.env` (see `server/.env.example` for key names): `GHL_API_KEY`, `ZOOM_*` (S2S OAuth), `ANTHROPIC_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `ZOHO_*`.

**Key reusable assets for this build:** Zoom transcript download code already exists; GHL contact/appointment code already exists (Python + JS versions). ~~Build inside the same app~~ **SUPERSEDED:** per Ayoub, the orchestrator is a NEW standalone service (see 2b) — but copy/port logic from this repo and from TFG's `fb-lead-orchestrator` rather than rewriting from scratch.

## 3. What we're building

A **Retell AI** (https://docs.retellai.com) voice-agent orchestrator with two functions:

### Function A — Speed-to-Lead (call within 1–2 minutes, double-dial)
Why: leads called within 5 min are ~21x more likely to qualify vs 30 min ([source](https://www.calldrip.com/speed-to-lead)); calling ≥2x raises contact rates from ~48% to ~93% ([source](https://www.jvmlending.com/blog/lead-conversions-speed-double-dials-fascinating-info/)).

Flow:
1. New lead enters GHL (form fill / opt-in that did NOT already book). Trigger: **GHL Workflow → Custom Webhook action** POSTing to our server: `POST /webhook/retell/new-lead` with `{contact_id, first_name, phone, email, source}`. (Configure in GHL UI: Automation → Workflow → trigger "Contact Created" or "Form Submitted", filter out leads who already have an appointment.)
2. Server validates (has phone, not DNC, not already booked, within calling hours 8am–8pm lead-local time — derive timezone from area code or GHL contact field; if outside hours, queue for next morning).
3. Call Retell: `POST https://api.retellai.com/v2/create-phone-call` (Bearer `RETELL_API_KEY`) with `from_number`, `to_number`, `override_agent_id` = speed-to-lead agent, `retell_llm_dynamic_variables` ({first_name, source, company info}), `metadata` ({contact_id, attempt: 1, function: "speed_to_lead"}).
4. **Double-dial:** on Retell webhook `call_ended` with no answer/voicemail → wait ~60s → dial again (attempt 2). Recommended cadence if still no answer: attempt 3 at +10 min, attempt 4 at +30 min, then next-day attempt; cap at ~6 attempts over 48h, leave voicemail on final attempt only. Track attempts in DB.
5. **Goal of the call: book the strategy call.** Give the Retell agent two **Custom Functions** (tools) that hit our server:
   - `check_availability(date_range, timezone)` → `GET /retell/tools/availability` → proxies GHL free-slots API (same logic as `booking.js` GET).
   - `book_appointment(slot_iso, timezone)` → `POST /retell/tools/book` → creates GHL appointment for the contact in `metadata` (same logic as `booking.js` POST). Returns confirmation the agent speaks back.
6. On `call_analyzed` webhook: log outcome to DB + Google Sheet, update GHL contact with note/tag (`ai-call-booked`, `ai-call-no-answer`, etc.). Verify `x-retell-signature` header on all webhooks.

### Function B — Appointment reminder calls (T-24h and T-1h)
Why: reminders ~24h out plus a same-day touch can roughly double show rates ([source](https://martal.ca/lead-generation-and-appointment-setting-lb/)).

Trigger options (pick **Option 1**; it's simpler and uses GHL as source of truth):
- **Option 1 (recommended): GHL Workflow** with trigger "Appointment Booked" → "Wait until 24 hours before appointment" → Custom Webhook `POST /webhook/retell/reminder` `{contact_id, appointment_id, start_time, type: "24h"}` → another wait until 1 hour before → same webhook with `type: "1h"`. GHL handles rescheduling/cancellation automatically (workflow re-evaluates).
- Option 2 (fallback): APScheduler in FastAPI polls GHL calendar events every 10 min and schedules calls itself. More code, needed only if GHL workflow waits prove unreliable.

Server then: checks appointment still exists & not cancelled (GHL API), checks calling hours, fires Retell `create-phone-call` with reminder agent + dynamic variables `{first_name, appointment_time_local, timezone, zoom_link_sent: true, type}`.

**Call script structure (research-backed best practice):**
- **24h call** (~30–45s): warm greeting by name → confirm identity → "quick reminder you have your strategy call with Direct Sales Network tomorrow at {time} {tz}" → confirm they'll attend → if conflict, offer reschedule via the `check_availability`/`book_appointment` tools (reschedule = book new + cancel old) → mention they'll get a Zoom link / check email → polite close.
- **1h call** (~20–30s): "your call is in about an hour at {time}; the Zoom link was sent to your email — {email}. Anything you need before then?" → if can't make it, reschedule on the spot. No voicemail rambling: leave one short voicemail if unanswered, plus the GHL SMS/email reminders continue as-is.
- Tone: friendly, brief, human; agent must disclose it's an AI assistant calling on behalf of DSN if asked (and ideally up front — safer for compliance).

## 4. Knowledge base from Zoom transcripts

Retell supports **Knowledge Bases** linked to agents (retrieval at response time, 1–10 chunks): [docs](https://docs.retellai.com/build/knowledge-base), API: `POST /create-knowledge-base` with `knowledge_base_texts` / `knowledge_base_files` (max 25 files, 50MB each, chunk size 600–6000 chars).

**Recommended pipeline (do NOT dump raw transcripts — distill them):**
1. New script `server/scripts/export_transcripts.py`: reuse `zoom_service` auth + recordings API with a wide `days_back` (e.g. 365) to bulk-download all VTT transcripts to `server/data/transcripts/`.
2. Distill with Claude (reuse `claude.py` client): batch transcripts → extract (a) common objections + best rebuttals, (b) FAQ about DSN's offer/pricing/process, (c) qualification questions that worked, (d) ideal call openings/closings. Output 5–10 clean markdown docs (e.g. `objections.md`, `offer_faq.md`, `discovery_questions.md`).
3. Upload distilled docs via `create-knowledge-base`, link KB to both agents in Retell dashboard (or via update-agent API).
4. Optional later: re-run distillation monthly via cron as new transcripts accumulate.

Rationale: raw sales transcripts are noisy, contain client PII, and waste retrieval chunks; distilled docs give the voice agent crisp, citable answers with low latency.

## 5. Database — Supabase (DECIDED)

**Decision (Ayoub, 2026-06-11): Supabase is the single source of truth.** Rationale: the orchestrator (and other Railway services) get direct full DB access — easier to query/inspect than going through the GHL API every time, and it matches how TFG's `fb-lead-orchestrator` already works.

Account state (verified via Supabase MCP): org `lgthmmpjkoyvgczeycuc` has 2 active projects — `TFG - Floor Visualizer` (`ewoftdovrrhcvliijyrl`, used by fb-lead-orchestrator) and `dealmachine-leads` (`gyhsbfcjdgvcycbgbhiz`). That's the free-tier ceiling → **Ayoub must upgrade to Supabase Pro (~$25/mo) so we can create a dedicated DSN project.** Do NOT put DSN tables in either TFG project.

**DONE (2026-06-11):** Project `dsn-orchestrator` created in org `lgthmmpjkoyvgczeycuc` (TFG org, confirmed correct by Ayoub), project ID `kygcxlteriyctkzcpzvk`, region us-east-1.
- DB host: `db.kygcxlteriyctkzcpzvk.supabase.co`
- Supabase URL: `https://kygcxlteriyctkzcpzvk.supabase.co`
- Schema in `dsn-orchestrator/supabase-setup.sql` — applied via migration after project came ACTIVE_HEALTHY.
- `SUPABASE_URL` + `SUPABASE_SECRET_KEY` must be added to the new Railway service env vars.

Schema (minimal):
```sql
create table call_jobs (
  id uuid primary key default gen_random_uuid(),
  contact_id text not null,
  phone text not null,
  function text not null,          -- 'speed_to_lead' | 'reminder_24h' | 'reminder_1h'
  appointment_id text,
  attempt int default 0,
  max_attempts int default 6,
  next_attempt_at timestamptz,
  status text default 'pending',   -- pending|calling|answered|booked|exhausted|cancelled|done
  created_at timestamptz default now()
);
create table call_logs (
  id uuid primary key default gen_random_uuid(),
  retell_call_id text unique,
  job_id uuid references call_jobs(id),
  contact_id text, direction text, status text,
  disconnection_reason text, transcript text, analysis jsonb,
  created_at timestamptz default now()
);
create table dnc (phone text primary key, reason text, created_at timestamptz default now());
```

## 6. New code to write — standalone repo/service `dsn-call-orchestrator`

New repo (suggested: `dsn-call-orchestrator`), new Railway project of the same name. FastAPI, same conventions as the existing DSN server. **First step: read TFG's `fb-lead-orchestrator` source and mirror it.**

```
app/main.py                  # FastAPI app, health check, router registration
app/config.py                # env settings
app/routes/webhooks.py       # /webhook/new-lead, /webhook/reminder (from GHL workflows)
app/routes/retell_events.py  # /webhook/retell/events (call_started/ended/analyzed; verify x-retell-signature)
app/routes/tools.py          # /tools/availability, /tools/book — Retell custom functions hit these
app/services/retell.py       # create_phone_call(), signature verification, agent IDs from env
app/services/ghl.py          # port contact/availability/booking logic from DSN-main netlify/functions/booking.js + server/app/services/ghl.py
app/services/supabase.py     # supabase-py client; call_jobs/call_logs/dnc/leads/appointments
app/services/scheduler.py    # APScheduler every 30s: process call_jobs where next_attempt_at <= now and status='pending'
scripts/export_transcripts.py    # Zoom bulk export (port auth from DSN-main server/app/services/zoom.py)
scripts/build_knowledge_base.py  # distill via Claude + upload to Retell KB
railway.toml / Procfile / requirements.txt (fastapi, uvicorn, httpx, apscheduler, supabase, anthropic)
```

New env vars (add to `.env.example` too):
```
RETELL_API_KEY=
RETELL_FROM_NUMBER=            # E.164, purchased in Retell dashboard
RETELL_AGENT_SPEED_TO_LEAD=    # agent_id
RETELL_AGENT_REMINDER=         # agent_id
RETELL_WEBHOOK_SECRET=         # for signature verification
SUPABASE_URL=                  # new dsn-orchestrator Supabase project
SUPABASE_SECRET_KEY=
GHL_API_KEY= / GHL_LOCATION_ID=NgduPjDbvABP3zFIqnt4 / GHL_CALENDAR_ID=DXh5uGCZVjFLPQNeKRZu
ANTHROPIC_API_KEY=             # for KB distillation
ZOOM_ACCOUNT_ID= / ZOOM_CLIENT_ID= / ZOOM_CLIENT_SECRET=   # transcript export
```

## 7. Manual setup steps (user / dashboard work — code can't do these)

1. **Retell account** (https://dashboard.retellai.com): buy/import a phone number (consider importing a Twilio number with DSN's caller ID; a local-presence number improves answer rates). Pricing ~ $0.07–0.12/min all-in.
2. Create two agents in Retell (Conversation Flow or single-prompt): "DSN Speed-to-Lead" and "DSN Reminder". Set agent-level `webhook_url` to `https://<railway-app>/webhook/retell/events`, events: `call_started, call_ended, call_analyzed`. Add the two Custom Functions pointing at the Railway tool endpoints. Link the knowledge base once built. Enable voicemail detection (hang up or leave configured voicemail message).
3. **GHL workflows**: (a) New-lead workflow → webhook to `/webhook/retell/new-lead` (exclude contacts with appointments); (b) Appointment workflow → wait-until-24h-before → webhook, wait-until-1h-before → webhook. Add a "DNC" tag check in both.
4. **Supabase**: upgrade org to Pro (or create separate DSN org) → create `dsn-orchestrator` project. **Railway**: create new project `dsn-call-orchestrator`, connect the new repo, set env vars.
5. **Compliance (US outbound AI calls):** only call leads who submitted their number (prior express consent — our forms qualify); disclose AI; honor opt-out ("stop calling" → add to `dnc` table + GHL DNC); respect 8am–9pm local-time window (TCPA); record-keeping via call_logs. Double-dial of a fresh inbound lead is standard practice and consent-covered, but do not exceed reasonable attempt caps.

## 8. Build order (checklist — update as you go)

- [x] 0. Pull & study TFG `fb-lead-orchestrator` / `heartfelt-expression` orchestrator source — done; all key patterns mirrored
- [x] 1a. Create `dsn-orchestrator` Supabase project — DONE (ID: kygcxlteriyctkzcpzvk)
- [x] 1b. Write schema SQL (`dsn-orchestrator/supabase-setup.sql`) — tables: leads, appointments, appointment_reminders, call_logs, lead_events, dnc, failed_webhook_events, cron_locks
- [x] 1c. Apply schema migration to Supabase project — DONE. All 8 tables verified: leads, appointments, appointment_reminders, call_logs, lead_events, dnc, failed_webhook_events, cron_locks
- [x] 2. Write orchestrator code (`dsn-orchestrator/index.js`) — Node.js/Express, 550 lines, syntax verified, server starts clean
- [x] 2a. Retell service: `triggerRetellCall()`, signature verification, dynamic variables
- [x] 2b. Tool endpoints: `/retell/function/check-availability` + `/retell/function/book-appointment` (calls GHL API)
- [x] 2c. Webhook endpoints: `/webhook/new-lead`, `/webhook/appointment-booked`, `/webhook/appointment-cancelled`, `/webhook/retell`
- [x] 2d. Cron endpoints: `/cron/speed-to-lead` (5-min safety net + follow-up attempts 3–6), `/cron/appointment-reminders`
- [x] 2e. Admin/debug endpoints: `/admin/leads`, `/admin/call-logs`, `/admin/lead-events`, `/admin/reminders`, `/admin/failed-webhooks`, `/admin/dnc`
- [x] 2f. TCPA calling-hours guard + area-code timezone lookup (full US map)
- [x] 2g. Double-dial with atomic `eq('double_dialed', false)` guard (prevents race conditions)
- [x] 2h. Distributed cron lock via `cron_locks` table (prevents duplicate cron runs across instances)
- [x] 2i. Dead-letter queue: every failed webhook saved to `failed_webhook_events` for debugging
- [x] 2j. Immutable audit trail: every state transition logged to `lead_events`
- [x] 2k. Health endpoint reports all service connection states (Supabase/GHL/Retell/agents)
- [x] 3. Create Retell conversation flows via API — DONE
  - Speed-to-lead flow: `conversation_flow_9ef584e2f263`
  - Reminder flow: `conversation_flow_68c0252a092d`
  - Both tool URLs set to `https://dsn-call-orchestrator-production.up.railway.app/retell/function/`
- [x] 4. Create Retell agents via API — DONE
  - Speed-to-lead agent: `agent_d7bffee08f5962e2a0c5789fcd` ("Morgan — DSN Speed to Lead")
  - Reminder agent: `agent_1cf55115cf9e5477adb445c754` ("Morgan — DSN Reminder")
  - Both use voice `11labs-Adrian`, claude-4.5-sonnet model
- [x] 5. Supabase service-role key added as `SUPABASE_SECRET_KEY` in Railway
- [x] 6. Railway project `dsn-call-orchestrator` deployed — `https://dsn-call-orchestrator-production.up.railway.app`
- [x] 7. Railway cron jobs running — speed-to-lead every 5min, appointment-reminders every 5min
- [x] 8a. Flow tool URLs updated (no longer placeholder) — both flows patched to live Railway URL
- [ ] **8b. Buy DSN phone number in Retell dashboard** → then:
  ```bash
  railway variables set RETELL_FROM_NUMBER=+1XXXXXXXXXX --service dsn-call-orchestrator
  ```
- [x] 9. Retell agent webhook URL set: `https://dsn-call-orchestrator-production.up.railway.app/webhook/retell`
- [ ] **10. Wire 3 GHL webhooks** (GHL → Settings → Integrations → Custom Webhooks):
  - New lead created → `POST https://dsn-call-orchestrator-production.up.railway.app/webhook/new-lead`
  - Appointment booked → `POST https://dsn-call-orchestrator-production.up.railway.app/webhook/appointment-booked`
  - Appointment cancelled → `POST https://dsn-call-orchestrator-production.up.railway.app/webhook/appointment-cancelled`
  - Header on all three: `x-webhook-secret: 3b4cf74321aff6778ece459be74646127ffcaef642dbb536`
- [x] 11. Knowledge base — DONE. `scripts/build_playbook.py` synthesized 16 real Zoom strategy call transcripts (via Claude two-pass extraction → Opus synthesis) into a playbook injected into the speed-to-lead agent's `global_prompt`. Re-run anytime: `python scripts/build_playbook.py`
- [x] 11a. 17 audit fixes applied (2026-06-12) — TCPA, cron lock, outcomes, flow edges, schema indexes. See commit `bb22627`.
- [ ] **12. End-to-end test:** submit test lead → confirm call fires within 90s → book slot → confirm reminder rows appear in Supabase → confirm reminder calls fire at T-24h and T-1h
- [ ] 13. Set up UptimeRobot monitor on `/ping`

## 9. Audit fixes applied 2026-06-12 (commit bb22627)

17 distinct fixes across `index.js`, both Retell flow JSONs, and `supabase-setup.sql`. Key ones:

| Fix | File | What changed |
|---|---|---|
| Timing-safe webhook secret | `index.js` | `crypto.timingSafeEqual()` — prevents timing oracle attack |
| Cron lock fallback removed | `index.js` | `.lt()` after `.upsert()` was silently ignored by Supabase JS client; now returns false if RPC fails |
| Agent ID guard | `index.js` | Guard `RETELL_AGENT_ID_SPEED_TO_LEAD` + `RETELL_FROM_NUMBER` before setting lead to `status='calling'` |
| New outcomes | `index.js` | `callback_requested`, `rescheduled`, `confirmed` were silently unhandled in `handleCallOutcome` |
| Exhausted lead fix | `index.js` | `step > 6` no longer sets `next_followup_at` — exhausted leads stay out of cron queue |
| `disconnection_reason` primary signal | `index.js` | `extractOutcome` uses `voicemail_reached`, `dial_no_answer`, etc. before LLM summary parsing |
| TCPA calling hours on reminders | `index.js` | `msUntilCallable()` check happens BEFORE claiming reminder row (can't un-claim a 'sent' row) |
| DLQ for appointment-cancelled | `index.js` | Missing `appointment_id` or unknown appointment ID → dead-letter queue instead of silent drop |
| Old appointment cancel on reschedule | `index.js` | Reminder flow reschedule now cancels old appointment row + skips old reminders |
| `endAt` on upsertAppointment | `index.js` | Passes `appt.endTime \|\| appt.end_time` — was always null before |
| Timezone in `check_slots` | `retell-flow-speed-to-lead.json` | Explicit `timezone={{timezone}}, days_ahead=5` in tool call instruction |
| `slot_iso` retention | both flow JSONs | CRITICAL instruction added to `pick_time` / `reschedule_pick_time` nodes to retain exact ISO string |
| Error edges for tool failures | both flow JSONs | Book node + reschedule_book node now have fallback edge when tool call fails |
| Silence/hangup edge | `retell-flow-speed-to-lead.json` | `e4b` on intro node — silent/dropped call → `not_interested` instead of hanging |
| Confused-lead edge | `retell-flow-speed-to-lead.json` | `e7b` on qualify node — wrong contact / disputes form fill → `not_interested` |
| Indecisive lead handling | `retell-flow-reminder.json` | Offer email follow-up if lead keeps saying 'maybe' instead of looping forever |
| Schema indexes | `supabase-setup.sql` | `idx_leads_cron_query` now composite with `followup_step`; new `idx_leads_phone` for DNC checks |

## 10. Key references
- Create Phone Call API: https://docs.retellai.com/api-references/create-phone-call (`POST /v2/create-phone-call`, Bearer auth, `retell_llm_dynamic_variables`, `metadata`)
- Webhooks: https://docs.retellai.com/features/webhook-overview (call_started/ended/analyzed, `x-retell-signature`)
- Knowledge Base: https://docs.retellai.com/build/knowledge-base + `POST /create-knowledge-base`
- Retell × GHL: https://www.retellai.com/integrations/go-high-level
- GHL appointment booking for voice agents: https://help.gohighlevel.com/support/solutions/articles/155000005293
- Speed-to-lead stats: https://www.calldrip.com/speed-to-lead · https://www.chilipiper.com/article/speed-to-lead-statistics
