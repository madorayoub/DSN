-- DSN Call Orchestrator — Supabase Schema
-- Run this once on a fresh project: supabase db push or paste in Supabase SQL editor.
-- All tables have RLS enabled; service-role key bypasses RLS (server-to-server only).

-- ── leads ─────────────────────────────────────────────────────────────────────
-- Mirror of GHL contact. Keyed by ghl_contact_id so we never create duplicates
-- from repeated webhooks or double-triggers.
create table if not exists leads (
  id                  bigint generated always as identity primary key,
  ghl_contact_id      text unique not null,
  name                text,
  phone               text,                        -- E.164
  email               text,
  timezone            text,                        -- e.g. 'America/New_York'; null = derive from area code
  source              text,                        -- landing page / funnel
  status              text not null default 'new'
    check (status in ('new','calling','booked','not_interested','exhausted','dnc','invalid_phone')),
  followup_step       int  not null default 0,
  next_followup_at    timestamptz,
  followup_paused     boolean not null default false,
  double_dialed       boolean not null default false,
  last_call_outcome   text,                        -- booked|voicemail|no_answer|not_interested|callback_requested
  notes               text,
  created_at          timestamptz not null default now()
);
alter table leads enable row level security;

create index if not exists idx_leads_ghl_contact    on leads(ghl_contact_id);
create index if not exists idx_leads_next_followup  on leads(next_followup_at) where followup_paused = false;
create index if not exists idx_leads_status         on leads(status);

-- ── appointments ──────────────────────────────────────────────────────────────
-- Mirror of GHL appointment. Reminder rows are generated on insert.
create table if not exists appointments (
  id                  bigint generated always as identity primary key,
  ghl_appointment_id  text unique not null,
  lead_id             bigint references leads(id) on delete cascade,
  start_at            timestamptz not null,
  end_at              timestamptz,
  timezone            text not null default 'America/New_York',
  status              text not null default 'booked'
    check (status in ('booked','cancelled','no_show')),
  zoom_link           text,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table appointments enable row level security;

create index if not exists idx_appts_ghl         on appointments(ghl_appointment_id);
create index if not exists idx_appts_lead        on appointments(lead_id);
create index if not exists idx_appts_start       on appointments(start_at);

-- ── appointment_reminders ─────────────────────────────────────────────────────
-- One row per (appointment, type). Cron fires calls when trigger_at <= now() and status='pending'.
create table if not exists appointment_reminders (
  id              bigint generated always as identity primary key,
  appointment_id  bigint not null references appointments(id) on delete cascade,
  reminder_type   text   not null check (reminder_type in ('reminder_24h', 'reminder_1h')),
  trigger_at      timestamptz not null,
  status          text   not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  retell_call_id  text,
  sent_at         timestamptz,
  error           text,
  created_at      timestamptz not null default now(),
  unique (appointment_id, reminder_type)   -- prevents duplicate reminder rows
);
alter table appointment_reminders enable row level security;

create index if not exists idx_reminders_trigger on appointment_reminders(trigger_at) where status = 'pending';

-- ── call_logs ─────────────────────────────────────────────────────────────────
-- One row per Retell call. raw_payload stores the full Retell webhook body for debugging.
create table if not exists call_logs (
  id                    bigint generated always as identity primary key,
  lead_id               bigint references leads(id) on delete cascade,
  appointment_id        bigint references appointments(id) on delete cascade,
  call_type             text not null,              -- speed_to_lead|reminder_24h|reminder_1h
  retell_call_id        text unique,
  call_status           text,                       -- ended|error
  disconnection_reason  text,
  transcript            text,
  summary               text,
  outcome               text                        -- set by extractOutcome() in index.js
    check (outcome in ('voicemail','no_answer','dnc','cancelled','booked','rescheduled','confirmed','callback_requested','not_interested','completed')),
  started_at            timestamptz,
  ended_at              timestamptz,
  raw_payload           jsonb,                      -- full Retell call_analyzed payload for debugging
  created_at            timestamptz not null default now()
);
alter table call_logs enable row level security;

create index if not exists idx_call_logs_lead        on call_logs(lead_id);
create index if not exists idx_call_logs_retell_id   on call_logs(retell_call_id);
create index if not exists idx_call_logs_type        on call_logs(call_type);
create index if not exists idx_call_logs_created     on call_logs(created_at desc);

-- ── lead_events ───────────────────────────────────────────────────────────────
-- Immutable audit trail. Every state transition is appended here.
-- This is the primary debugging tool: SELECT * FROM lead_events WHERE lead_id=X ORDER BY created_at.
create table if not exists lead_events (
  id              bigint generated always as identity primary key,
  lead_id         bigint references leads(id) on delete cascade,
  appointment_id  bigint references appointments(id) on delete cascade,
  event_type      text not null
    check (event_type in ('retell_call_initiated','lead_created','appointment_upserted','lead_dnc_skipped','speed_to_lead_scheduled','appointment_booked','appointment_cancelled','lead_dnc_opt_out','retell_double_dial_scheduled','call_outcome_processed','appointment_rescheduled_via_agent','appointment_booked_via_agent','appointment_no_show')),
  payload         jsonb default '{}',
  created_at      timestamptz not null default now()
);
alter table lead_events enable row level security;

create index if not exists idx_lead_events_lead    on lead_events(lead_id);
create index if not exists idx_lead_events_appt    on lead_events(appointment_id);
create index if not exists idx_lead_events_created on lead_events(created_at desc);
create index if not exists idx_lead_events_type    on lead_events(event_type);

-- ── dnc ───────────────────────────────────────────────────────────────────────
-- Do-not-call list. Check before every outbound call.
create table if not exists dnc (
  phone       text primary key,
  reason      text,
  added_by    text,                   -- 'lead' | 'agent' | 'admin'
  created_at  timestamptz not null default now()
);
alter table dnc enable row level security;

-- ── failed_webhook_events ─────────────────────────────────────────────────────
-- Dead-letter queue. Any webhook that throws is saved here for inspection.
-- Check this table first when debugging missing calls or stuck reminders.
create table if not exists failed_webhook_events (
  id          bigint generated always as identity primary key,
  source      text not null,
  payload     jsonb,
  error       text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table failed_webhook_events enable row level security;

create index if not exists idx_failed_webhooks_resolved on failed_webhook_events(resolved) where resolved = false;

-- ── cron_locks ────────────────────────────────────────────────────────────────
-- Distributed cron lock: prevents two Railway instances running the same job simultaneously.
-- locked_until defaults to epoch so first acquire always succeeds.
create table if not exists cron_locks (
  job_name      text primary key,
  locked_until  timestamptz not null default '1970-01-01 00:00:00+00'
);
alter table cron_locks enable row level security;

-- Pre-seed lock rows so upsert never has to insert in a race
insert into cron_locks (job_name) values
  ('speed_to_lead_followup'),
  ('appointment_reminders'),
  ('no_show_check')
on conflict (job_name) do nothing;

-- ── try_acquire_cron_lock RPC ─────────────────────────────────────────────────
-- Returns true if this instance acquired the lock, false if another holds it.
-- Uses UPDATE WHERE to atomically claim the row — no SELECT then UPDATE race.
create or replace function try_acquire_cron_lock(p_job_name text, p_lock_until timestamptz)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update cron_locks
  set    locked_until = p_lock_until
  where  job_name     = p_job_name
    and  locked_until < now();

  return found;
end;
$$;

-- Only the orchestrator server (service_role) should call this — revoke the
-- default PUBLIC grant so anon/authenticated clients can't acquire/release locks.
revoke execute on function try_acquire_cron_lock(text, timestamptz) from public;
revoke execute on function try_acquire_cron_lock(text, timestamptz) from anon, authenticated;
grant execute on function try_acquire_cron_lock(text, timestamptz) to service_role;

-- ── Composite index for cron query ────────────────────────────────────────────
-- Supports: WHERE status='calling' AND followup_paused=false AND next_followup_at <= now() AND followup_step <= 6
create index if not exists idx_leads_cron_query
  on leads(next_followup_at, followup_step)
  where status = 'calling' and followup_paused = false;

-- ── Phone index for DNC checks ────────────────────────────────────────────────
-- DNC checks run on every inbound lead and every cron tick — needs an index.
create index if not exists idx_leads_phone on leads(phone);

-- ── Appointment index for call_logs lookups ──────────────────────────────────
create index if not exists idx_call_logs_appointment on call_logs(appointment_id);
