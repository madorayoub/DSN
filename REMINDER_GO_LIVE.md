# Turning on Morgan's appointment reminders

State as of 2026-09-04. Everything below was verified against live systems, not inferred
from notes.

**The headline: reminders can go live on their own.** They do not depend on
`New Lead → Retell AI`, and turning them on does not start any outbound prospecting.
`/webhook/appointment-booked` calls `findOrCreateLead` itself, so it creates the lead row
it needs. One workflow, one webhook, done.

That makes this the smallest safe way to get real traffic through the system for the first
time — every call Morgan makes is to someone who already booked a meeting with us.

---

## What's already true (nothing to do here)

- Orchestrator healthy, 13 days uptime, all three crons live, dead-letter queue empty.
- Reminder agent `agent_1cf55115cf9e5477adb445c754` → flow `conversation_flow_68c0252a092d`,
  v3 draft (correct — the draft is what serves calls). 16 nodes, no dangling edges, all four
  farewell nodes carrying `skip_response_edge`. Committed snapshot is byte-identical to live.
- Schema migration applied — `call_logs.outcome` accepts `language_barrier`, `lead_events`
  accepts all four new event types.
- All four `/webhook/*` routes are live and fail closed with a bare `403` on a bad secret.
- Reminder cron already handles: GHL cancel/reschedule reconciliation, past-appointment
  skip, DNC recheck at fire time, and TCPA calling-hours deferral.

---

## 1. Decide this first

**You already have three published reminder workflows** — `DSN Appts Reminders`,
`DSN Appts Reminders - Follow up`, and `Salesman Zoom Appointment Reminders`. They are live
right now and touching booked leads.

Publishing `Appointment Booked → Retell AI` means a booked lead gets those SMS/email
touches **and** a phone call from Morgan at T-24h and T-1h.

- [ ] Decide: is the call *in addition to* the existing touches, or does one of those
      workflows get paused first?

GHL's API returns workflow names and status only — never their steps — so I can't read what
those three actually send. This one needs your eyes in the UI.

---

## 2. The trap that would make publishing do nothing

The funnels now book on the round-robin calendar `WZwIrG0g3gk7AzOJcYXX`
("DSN - Strategy Zoom Call"). The orchestrator still books on Brian's
`DXh5uGCZVjFLPQNeKRZu` — deliberately, per your call.

So if `Appointment Booked → Retell AI` is filtered to the old "Free Consultation" calendar,
publishing it covers Morgan's own bookings and **misses every funnel booking** — which is
where the real volume is.

- [ ] Open the workflow's trigger and confirm it is either unfiltered, or scoped to include
      **"DSN - Strategy Zoom Call"**.

Same class of problem as section 3 of `ROUND_ROBIN_MIGRATION_TASKS.md`.

---

## 3. The webhook action

Workflow: **`Appointment Booked → Retell AI`** (`c20dda70-a41e-4943-8e0a-b42d926ac68d`),
currently `draft` v4, untouched since 2026-06-13.

| Setting | Value |
|---|---|
| Action | Custom Webhook |
| Method | `POST` |
| URL | `https://dsn-call-orchestrator-production.up.railway.app/webhook/appointment-booked` |
| Header | `x-webhook-secret` = the value of Railway var `WEBHOOK_SECRET` |

Required fields — the webhook drops the payload to the dead-letter queue without them:

- `contact_id`
- `appointment_id`
- `start_time`

Optional but worth sending: `end_time`, `zoom_link`, `timezone`, `phone`, `email`,
`first_name`, `last_name`.

The handler reads each field from the top level **or** from `customData`, so GHL's custom
values landing under `customData` is fine either way.

- [ ] Confirm the URL is exactly the above. The old build doc claimed
      `/webhook/retell/new-lead`; that route has never existed and returns **404**.
- [ ] Confirm the secret header is present. `requireWebhookSecret` fails closed with a bare
      `403`, no log line and no dead-letter row — a wrong secret looks exactly like
      "nothing happened."

### Do not add wait steps

Reminders come from the orchestrator's own 5-minute in-process cron, off the single
immediate `appointment-booked` webhook. It computes T-24h and T-1h itself and skips any
that are already in the past.

- [ ] Make sure the workflow has **no** wait-24h / wait-1h branches. Adding them would
      double every reminder call.

---

## 4. Verify after publishing

Book a real test appointment on the round-robin calendar, more than 24 hours out.

```bash
curl -s -H "x-admin-password: $ADMIN_PASSWORD" \
  https://dsn-call-orchestrator-production.up.railway.app/admin/reminders?status=pending
```

- [ ] Two rows come back — one `reminder_24h`, one `reminder_1h` — with `trigger_at` at the
      right offsets and the lead's real timezone.
- [ ] `/health` still shows `dlq_unresolved: 0`. Anything above zero means the payload was
      missing a required field; read it with `/admin/failed-webhooks`.

If you book less than 24 hours out you'll correctly get only the `reminder_1h` row; under an
hour, neither. That's intended.

---

## 5. Watch items, not blockers

- **A real reschedule may write a benign dead-letter row.** GHL reschedules by deleting the
  original appointment and creating a new one, re-firing "Appointment Booked" without ever
  firing "Appointment Cancelled." The handler correctly supersedes the old appointment and
  skips its reminders, but it also calls `ghlCancelAppointment` on an ID GHL may have already
  deleted — that would 404 and land in the dead-letter queue. Harmless to the reminder
  itself, but it makes `dlq_unresolved` a noisier health signal than it looks. Worth watching
  on the first real reschedule before treating it as a bug.
- **The no-hangup fix has still never been proven on a live answered call.** All four
  farewell nodes are structurally correct, but every verification attempt so far hit
  voicemail. To prove it: answer, talk, take it to a goodbye, expect a clean `agent_hangup`
  right after the farewell line. Reminders going live will produce these calls naturally.

---

## Deploy note

`railway up` deploys the **working tree**, not a commit. Run it from inside
`dsn-orchestrator/`, never the repo root. As of 2026-09-04 `main` and
`feat/round-robin-calendar-migration` both contain everything that is running in production,
so either checkout is safe — but check that again before any future deploy.
