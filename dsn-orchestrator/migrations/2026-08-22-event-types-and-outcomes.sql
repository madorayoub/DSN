-- ── Migration 2026-08-22: new event types and call outcomes ───────────────────
-- Both of these columns carry CHECK constraints frozen at the value sets that existed when
-- they were written, and both silently punish additions:
--   * lead_events.event_type — logEvent() only console.errors on failure, so a new event type
--     is dropped without a trace. lead_events is described above as the primary debugging
--     tool, so losing rows there is worse than it looks.
--   * call_logs.outcome — a rejected value fails the whole write, and in the call_analyzed
--     path that write is also the idempotency claim, so the outcome would never be processed.
-- Idempotent: safe to re-run, and a no-op on a database that already has these values.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'lead_events' and constraint_name = 'lead_events_event_type_check'
  ) then
    alter table lead_events drop constraint lead_events_event_type_check;
  end if;
  alter table lead_events add constraint lead_events_event_type_check
    check (event_type in (
      'retell_call_initiated','lead_created','appointment_upserted','lead_dnc_skipped',
      'speed_to_lead_scheduled','appointment_booked','appointment_cancelled','lead_dnc_opt_out',
      'retell_double_dial_scheduled','retell_reminder_redial_scheduled','call_outcome_processed',
      'appointment_rescheduled_via_agent','appointment_booked_via_agent','appointment_no_show',
      -- added 2026-08-22
      'lead_details_updated',        -- contact details refreshed from a resubmission
      'lead_reengaged_on_resubmit',  -- non-'new' lead reset after filling the form again
      'lead_expired_unprocessed',    -- 'new' lead parked past the recovery window
      'human_followup_flagged'       -- Morgan promised a human; GHL note + tag written
    ));
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'call_logs' and constraint_name = 'call_logs_outcome_check'
  ) then
    alter table call_logs drop constraint call_logs_outcome_check;
  end if;
  alter table call_logs add constraint call_logs_outcome_check
    check (outcome in (
      'voicemail','no_answer','dnc','cancelled','booked','rescheduled',
      'confirmed','callback_requested','not_interested','completed',
      -- added 2026-08-22: lead could not hold the call in English. Distinct from
      -- callback_requested because it must NOT be re-dialled by the English agent.
      'language_barrier'
    ));
end;
$$;
