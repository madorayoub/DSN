# Morgan (DSN) Voice Agent — Improvements Changelog

**Date:** 2026-06-19
**Scope:** Both DSN "Morgan" conversational agents in the shared Retell workspace, plus the DSN call orchestrator (Railway).
**Goal:** Make Morgan sound human (not like an AI), talk like a blue-collar contractor, stop being salesy, book a 15-minute Zoom with Brian reliably, in the lead's correct timezone, with low latency.

---

## Agents touched

| Agent | Purpose | Retell agent ID | Conversation flow ID |
|---|---|---|---|
| **Morgan — DSN Speed to Lead** | Outbound, books the call with Brian | `agent_d7bffee08f5962e2a0c5789fcd` | `conversation_flow_9ef584e2f263` |
| **Morgan — DSN Reminder** | Confirms / reschedules the booked call | `agent_1cf55115cf9e5477adb445c754` | `conversation_flow_68c0252a092d` |

- **DSN phone number:** `+15618340099` (outbound from-number; inbound is routed by GHL, so no Retell inbound agent is bound — intentional).
- **Voice (both):** `custom_voice_6740b699eb1facdfaa869f48d6` (same custom voice as the TFG "Alex" agents), `voice_temperature = 0.3`.
- **LLM (both):** `gpt-4.1` (changed from `claude-4.5-sonnet`).
- Agents are `is_published: false`, so the **draft is what runs live** — edits take effect on the next call with no publish step.

---

## 1. Voice & model

- **Voice** switched from stock `11labs-Adrian` → custom cloned voice `custom_voice_6740b699eb1facdfaa869f48d6`, with `voice_temperature 0.3` (more consistent delivery), matching the TFG Alex agents.
- **LLM** switched `claude-4.5-sonnet` → **`gpt-4.1`** for latency.
  - Measured: LLM response p50 **2,254 ms → 913 ms**; end-to-end p50 **~2,945 ms → ~1,717 ms**.

## 2. Sounds like a person, not an AI

- **No proactive AI disclosure.** Removed "I'm an AI assistant" from the intro and from both voicemails. Kept the honest-if-asked rule: if a lead sincerely asks "are you an AI?", Morgan says yes and moves on — it just never volunteers it.
- **Removed all "recorded call" references** (the salesy "send you the recorded meeting" promise and the "is this call recorded?" lines). *Note: Retell still records at the platform level via `data_storage_setting: "everything"` — the prompt simply no longer mentions it.*
- **"SOUND HUMAN, NOT AI" section** added: 2–4 disfluencies per turn (um, uh, lemme think), self-corrects, trail-offs; vary openers and sentence rhythm; don't over-use the lead's name; roll with interruptions; "sometimes 'yeah, pretty much' is the whole answer."
- **"DEAD AI TELLS" ban list** added: never say "I understand," "that's a great question," "I'd be happy to," "of course!/absolutely!/perfect!," "is there anything else I can help with," "feel free to," plus essay words (delve, comprehensive, robust, seamless, leverage, moreover…). Also pattern rules: don't echo the question back, don't over-validate feelings, don't give balanced two-sided answers, don't wrap turns in a tidy bow.

## 3. Blue-collar contractor language

- Tone rewritten to "fellow contractor catching up," heavy contractions, short punchy fragments, dry/easygoing, "I'll level with ya."
- **Words that work:** jobs on the books, keep the crew busy, keep the trucks moving, booked out, slammed, slow stretch, tire-kickers, no BS, straight up.
- **Trade talk** (use 1–2 per call, never a lecture): full-flake garage floors, poly/polyaspartic topcoats, one-day installs, grinding the slab, commercial/warehouse/showroom floors, man caves, hot-tire pickup, coatings that peel.
- **"companies," never "shops"** — they're concrete coating companies/businesses like yours. (Kept the idiom "talk shop" and the floor type "shop floors.")

## 4. Non-salesy framing

- Removed greed/FOMO/hype ("crushing it," "other guys are winning and you're missing out," ROI math).
- Sell **access**, low-key: "what I can do for ya is get you set up with Brian — he shares his screen and shows you how we line up commercial/industrial/residential coating jobs."
- Goal reframed: **a free 15-minute Zoom with Brian** (was a 30-min strategy call with "the team"); "Brian does the rest."
- **Yes-ladder open:** confirm the form → "you wanted more commercial/industrial/residential coating jobs — still the case?" → get the small yes first.
- **Assumptive close** (not a soft yes/no): "what I can do is get you in on the soonest open days — which works better?"

## 5. "How do you actually get the jobs?" answer

Added to both agents — three approaches, kept high-level, then bridged to Brian:
1. **Outreach** — cold calling, SMS/texts, cold email.
2. **Paid marketing** — Google, Facebook, Instagram, TikTok (mostly Google, where the bigger commercial work comes from).
3. **Bidding boards** — DSN watches the boards for new projects in the lead's service area and gets bids in fast.

## 6. Objection guide (replaced the old hard-sell playbook)

Removed: ROI/cost math, price/package quoting ($3,500, $1,250 tiers), the scale-of-1-to-10 / revenue interrogation questions, confrontational reframes, and the unverifiable "recorded meeting" promise.
Replaced with a low-pressure guide: hear them out → take the pressure off → point to the call with Brian as the no-risk way to see it → assume the booking. Price questions deflect to "Brian covers the numbers on the call — month-to-month, 90-day money-back, no real risk in taking a look."

## 7. Flow structure fixes

- **Greeting split (both agents):** a new dedicated `greeting` node is the start node. It says only *"Hey — is this {{name}}?"* and **stops/waits** for confirmation. Only after they confirm does `intro` run (introduction + yes-ladder / reminder). Fixes the bug where the agent ran the identity question and the pitch together in one breath.
- **"Confusion is not a no" (both agents):** a clarifying question ("what do you mean?", "huh?") now triggers a **clarification**, never an exit. Narrowed the `not_interested` edges so only an explicit decline ("no," "not interested," "stop calling," "remove me") exits. (Previously an edge literally said "Lead is confused → not_interested," which hung up on genuine questions.)

## 8. Calendar / booking reliability (orchestrator + flow)

### 8a. GHL free-slots bug — epoch-ms (commit `46bd965`)
`check_availability` was sending `startDate`/`endDate` as `YYYY-MM-DD` strings → GHL returned **HTTP 422 "startDate must be a number"** → handler returned `has_availability:false` → Morgan always fell back to "the team will follow up by email," so **booking could never complete.** Fixed to send **epoch-millisecond** timestamps. (Slot cache key bucketed to the hour so `check_slots` and `pick_time` still share a cache entry.)

### 8b. Pre-fetch slots before the call (commit `3ec30b8`)
To kill mid-call latency **and** the model hallucinating availability, `triggerRetellCall` now:
- resolves the lead's timezone (caller-provided or phone area code),
- pre-fetches open slots via `buildSlotVars()`,
- injects them as Retell dynamic variables: `available_slots_formatted`, `available_slots_iso`, `has_availability`.

The `check_slots` / `pick_time` (and reminder reschedule) nodes **read these variables directly** — no mid-call tool call. `check_availability` remains a **fallback** (blank vars or a different-day request). `book_appointment` stays live as the source of truth for actually reserving the slot.

### 8c. Anti-hallucination guard (both agents)
Global rule: "You do NOT know the calendar from memory… NEVER state, guess, or imply which days/times are open or booked unless it came back from the tool / pre-loaded slots." Plus a hard "calendar — never make it up" instruction in the slot nodes.

### 8d. Use real open days, not "today or tomorrow"
The assumptive close hardcoded "today or tomorrow," which contradicted the real availability (e.g., Mon/Tue) and confused leads. Now the agent names the **actual** soonest open days from `available_slots_formatted`.

## 9. Complete timezone coverage (commit `1f333f2`)

`AREA_CODE_TZ` expanded from **307 partial → all 416** NANP geographic area codes (US + Canada + Caribbean) so no lead's timezone silently defaults to Eastern. Curated per-code entries (split states like El Paso→Mountain, FL Panhandle→Central) preserved; gaps filled from an authoritative dataset; every IANA name validated.
The lead is **shown, booked, confirmed, and reminded** in their own local timezone; the booked calendar instant is always correct (DST handled via explicit offsets).

---

## Deploy / infrastructure

- **Orchestrator:** `dsn-call-orchestrator-production.up.railway.app` (Railway project `b15f53c2-10e3-48b1-a006-0557020f5499`, service `dsn-call-orchestrator`, env `production`). Deployed via `railway up`.
- **Repo:** `github.com/madorayoub/DSN`, branch `main`.
- **Orchestrator commits this session:** `46bd965` (epoch-ms), `3ec30b8` (pre-fetch), `1f333f2` (timezone map).
- **Prompt/flow edits** are made directly against the Retell conversation flows via the API (not stored in the repo).
- **GHL:** location `NgduPjDbvABP3zFIqnt4`, calendar `DXh5uGCZVjFLPQNeKRZu` (Free Consultation / Zoom with Brian).

---

## Test-call results (to +212610374007)

| # | Outcome |
|---|---|
| 1 | Booking failed → "team will follow up." Root cause: GHL epoch-ms bug (fixed in 8a). |
| 2 | Latency fixed (gpt-4.1). But agent **hallucinated** availability (tool skipped) → led to pre-fetch + guard (8b/8c). |
| 4 | **Greeting split worked** — waited for "yeah, this is Kevin" before pitching. But exited on "what do you mean" → fixed (7). |
| 5 | Confusion no longer exits (clarified and stayed). But "today or tomorrow" vs real Mon/Tue confused the lead → fixed (8d). |
| 6 | (latest) Verifying real-days fix + full booking. |

---

## Open items / next

- **Agent talks over the lead & is too booking-focused** *(addressed 2026-06-19)*: it pushed to get on the calendar more than it sold "what's in it for me." Fixed in three parts on the **live** Speed-to-Lead flow/agent (`conversation_flow_9ef584e2f263` / `agent_d7bffee08f5962e2a0c5789fcd`):
  - **Pacing (talking over) — agent settings:** `responsiveness` 1 → **0.5** (stops pouncing on natural pauses), `interruption_sensitivity` 0.7 → **0.95** (yields almost instantly when the lead starts talking), `backchannel_frequency` 0.6 → **0.3** (fewer "yeah/uh-huh" over the lead's speech). Settled on **0.95 not 1.0** on purpose: leads are often mid-job/in a truck, and 1.0 would chop the agent mid-sentence on background noise (a passive, constant failure) — worse than the occasional late yield. The prompt's "one short thought, then stop" brevity rule is the noise-proof complement that lets us stay off the max.
  - **Pacing — prompt:** added a **"LET THEM FINISH — do NOT talk over them"** section to the global prompt, hardened to: *the moment they start talking, STOP — cut yourself off mid-word, don't finish the sentence, don't talk over, then pick up from what THEY said.*
  - **WIIFM — prompt + flow:** reframed the opening goal from "ONLY goal: book… less friction better" to *lead with the upside first, then book*; restructured the `qualify` node into **STEP 1 (what's in it for them → pause & listen)** then **STEP 2 (assumptive close, unchanged)** so value lands before the calendar push.
  - **Reminder agent got the same pacing treatment:** `agent_1cf55115cf9e5477adb445c754` settings aligned to **0.5 / 0.95 / 0.3**, and the same hardened **"LET THEM FINISH"** block added to its flow (`conversation_flow_68c0252a092d`) — same busy/noisy audience, so the talking-over fix applies there too. Its prompt was otherwise left alone (no WIIFM/qualify change — it only confirms/reschedules).
  - Both stale local docs (`dsn-orchestrator/retell-flow-speed-to-lead.json` and `retell-flow-reminder.json`) were **re-synced from the live flows** in the same pass (both had drifted to the pre-improvement version — old model, missing `greeting` node and SOUND HUMAN section).
- **15-min vs 30-min** *(intentional, not a bug):* `ghlBookAppointment` books a **30-minute** slot even though the agent tells the lead 15 minutes — the extra buffer is for Brian. The code comment at [index.js:629](dsn-orchestrator/index.js:629) is authoritative.
- **Timezone accuracy ceiling:** area code is a good proxy but a **ported mobile** (number from one region, owner in another) can still be off. If the lead form captures **ZIP**, add ZIP-first timezone resolution on top of the area-code map.
- **Verification call** still needed to confirm `book_appointment` actually lands a booking end-to-end.

---

## Double-dial audit & fixes (2026-06-19)

Verified the double-dial behavior for **both** agents (3 parallel sub-agent reviews of `dsn-orchestrator/index.js`). Invariant under test: *if the lead picked up and we spoke on attempt 1, do NOT call again; if they didn't pick up, redial.*

**Speed-to-lead — core invariant holds.** When a human answers, the 45s double-dial is correctly suppressed (`handleSpeedToLeadCallEnded`), and the `call_analyzed` catch-all has a second guard so an answered-but-unclassified lead isn't put on the 45s cadence.

**Fixes shipped (code written + syntax-checked; pending Railway deploy):**
- **Answered-detection: denylist → allowlist.** The old check `!['voicemail_reached','dial_no_answer','dial_failed','dial_busy'].includes(reason)` treated **21 of Retell's 34** disconnection reasons (all `error_*`, telephony failures, `ivr_reached`, `concurrency_limit_reached`, `marked_as_spam`, `user_declined`…) as "answered" → **silently skipped the redial when no human was reached.** Replaced with a `HUMAN_ANSWERED_REASONS` **allowlist** (default = redial; fails safe for any new Retell reason). Note: `machine_detected` does **not** exist in Retell's enum — voicemail is `voicemail_reached` (already handled).
- **Reminder double-dial added — 1-hour only.** Reminders were **one-shot** (the `call_ended` webhook only handled `speed_to_lead`, and the row is marked `sent` before the call fires). Added: a `redialed` column on `appointment_reminders` (**migration applied** to Supabase `kygcxlteriyctkzcpzvk`), a `handleReminderCallEnded` handler, and a webhook branch for `reminder_1h`. The **24h reminder stays one-shot by design** (per decision — avoid over-calling). Mirrors the speed-to-lead pattern: allowlist guard + atomic claim on `redialed=false` + TCPA-aware delay + direct `triggerRetellCall` (the row is already `sent`, so it must not re-enter the `pending`-only cron).

**STL race conditions — DOCUMENTED, not fixed (per decision "report only"):**
1. **Stranded lead on restart:** the double-dial relies on an in-memory `setTimeout`; a Railway redeploy in the ~45s window loses it. Cron usually recovers via `next_followup_at`, but a crash *mid-claim* can leave `status='calling'` + `next_followup_at=NULL`, which cron's `lte('next_followup_at', now)` filter excludes → lead gets **no further calls**. Fix would be a reaper for `status='calling' AND next_followup_at IS NULL`.
2. **Possible duplicate dial:** the `if (!lead.next_followup_at)` null-check in `handleCallOutcome` (step===2) can re-arm `next_followup_at` after the setTimeout's claim nulled it → cron fires an extra dial. Fix would use an explicit attempt-fired marker, not a nullable timestamp.
3. **Non-idempotent `call_analyzed`:** duplicate webhook deliveries can double-advance `followup_step` (no per-`call_id` idempotency).

**Self-booking suppression — VERIFIED OK (no change needed).** If a lead self-books on the funnel we don't call them: checked at intake ([index.js:951](dsn-orchestrator/index.js:951) GHL appointment pre-check), on booking ([index.js:1156](dsn-orchestrator/index.js:1156) sets `booked` + `followup_paused`), and before **every** dial ([index.js:1048](dsn-orchestrator/index.js:1048)). Caveat: the first call fires ~90s after intake, so a self-book at 2–3 min lands *after* the first call already dialed (all later attempts are then suppressed). Relies on GHL firing the `appointment-booked` webhook for funnel bookings — worth confirming that automation is wired.

**Deploy status:** All orchestrator changes deployed to Railway 2026-06-22 (deployment `6de64bb9`). DB migrations are live:
- `redialed` column on `appointment_reminders` ✅
- `retell_reminder_redial_scheduled` added to `lead_events` event_type CHECK constraint ✅
- `updated_at` column on `leads` ✅

---

## Production audit & fixes (2026-06-22)

Deep technical audit across all four layers: codebase (`index.js`), Supabase DB (`kygcxlteriyctkzcpzvk`), Railway production logs, and Retell live agent configs. 19 issues identified; 10 fixed (the rest were intentional or deferred per decision).

### Runtime fixes (deployed to Railway, deployment `6de64bb9`)

- **`releaseCronLock` switched from RPC → direct table update** — PostgREST schema cache couldn't find `release_cron_lock(p_job_name)` (a `void`-returning function), logging "Could not find the function public.release_cron_lock(p_job_name) in the schema cache" on every cron tick despite the function existing in the DB. Replaced the `supabase.rpc('release_cron_lock', ...)` call with a direct `supabase.from('cron_locks').update({ locked_until: ... }).eq('job_name', jobName)` at [index.js:475-484](dsn-orchestrator/index.js:475). The `try_acquire_cron_lock` RPC (returns `boolean`) had no such issue and was left as-is.

- **`logEvent` now populates `lead_id` and `appointment_id` columns** — previously only wrote `event_type` + `payload`, leaving the indexed `lead_id`/`appointment_id` columns NULL. Now extracts both from the payload at [index.js:210-216](dsn-orchestrator/index.js:210), making `lead_events` actually queryable by lead.

- **Stranded lead recovery added to speed-to-lead cron** — two recovery queries run at the start of every cron tick:
  1. Recovers `status='calling'` + `next_followup_at IS NULL` (lost `setTimeout` after Railway restart)
  2. Recovers `status='new'` leads older than 1 hour (`scheduleSpeedToLeadCall` failed silently)
  
  Lead 1 (stranded 9 days in `new` status) was automatically recovered on the first tick after deploy.

- **DNC retry expanded to all three cron bodies** — `retryFailedDncUpserts()` now runs in `runAppointmentReminderCronBody` and `runNoShowCronBody`, not just `runSpeedToLeadCronBody`. Prevents failed DNC upserts from accumulating indefinitely.

- **Health endpoint now reports DLQ depth** — `/health` response includes `dlq_unresolved` count; status degrades to `"degraded"` when unresolved DLQ entries exceed 5. Enables monitoring of failed webhooks without querying the DB directly.

### Database fixes

- **`supabase-setup.sql` synced with production** — added missing `updated_at timestamptz not null default now()` column to the `leads` table CREATE statement. The column existed in production but wasn't reflected in the schema file.

### Retell configuration fixes

- **STL agent end-call silence timeout reduced** — `end_call_after_silence_ms` lowered from 45,000 → 20,000 on `agent_d7bffee08f5962e2a0c5789fcd`. The 45s timeout meant Morgan would hang on the line with dead air long after a human hung up; 20s is still generous for natural pauses.

### Documentation fixes

- **Flow JSON files deprecated** — added `_comment` fields to both `retell-flow-speed-to-lead.json` and `retell-flow-reminder.json` marking them as documentation-only snapshots. The live source of truth is Retell's conversation flows (IDs documented at the top of this file). These files had already drifted from live and were re-synced once; the notice prevents future confusion.

- **15-min vs 30-min booking confirmed intentional** — the agent tells leads 15 minutes but `ghlBookAppointment` books a 30-minute slot. The code comment at [index.js:629](dsn-orchestrator/index.js:629) is authoritative: the extra buffer is for Brian. Changelog entry corrected from "(fixed)" to "(intentional, not a bug)."

- **Speed-to-lead delay confirmed at 5 minutes** — `RETELL_SPEED_TO_LEAD_DELAY_MS` is 300000 (5 min), not the ~90s originally documented. This is intentional: the delay gives GHL webhooks time to fire and the lead's form submission to fully process before the call hits.

### Verified OK (no change needed)

- **Double-dial invariant** — speed-to-lead core invariant holds: answered calls suppress the redial, no-answer calls get redialed.
- **Self-booking suppression** — checked at intake, on booking, and before every dial.
- **TCPA calling windows** — area-code timezone map covers all 416 NANP codes; calls fire within local 9am–6pm.
- **Reminder 24h stays one-shot by design** — only 1-hour reminders double-dial.
- **Agents intentionally unpublished** — draft runs live by design per Retell workspace convention.

### Deferred / known limitations

- **STL race conditions** (stranded lead on restart, possible duplicate dial, non-idempotent `call_analyzed`) — documented in the double-dial audit section above; not fixed per decision.
- **Timezone accuracy ceiling** — area-code proxy fails for ported mobiles; ZIP-first resolution would be the next layer.
- **Self-booking race at ~90s** — first call fires before GHL `appointment-booked` webhook could suppress it; only subsequent calls are blocked.

---

## Voice regression diagnosed & fixed — global prompt restored (2026-06-22, later pass)

**What went wrong.** A prior automated pass tried to "add" Morgan's personality to the Retell flows, not realizing the tuned prompt already lived in the flow's `global_prompt` field — it was inspecting the wrong field (`global_instruction`, which is always `null`), so it never saw the real prompt it was about to destroy. Over several edits it:
1. **Overwrote** the 20,421-char STL prompt (8,591 on Reminder) with a ~3.7K rewrite that hard-coded **"use 2-4 disfluencies per turn: um, uh, lemme think, I mean, y'know, like."** A per-turn filler *quota* makes GPT-4.1 stuff "um/uh/like" into every line — the exact "glitchy," robotic stammer the client reported.
2. Then **blanked `global_prompt` entirely** and spun up two **new, published** agents (`agent_031358d59de6223ee872a5f434` STL, `agent_8e88826bbe711ac90e425dc11f` Reminder) pointing at empty flows, and repointed Railway to them. Live agents ended up with **zero** global prompt — no contractor voice, no "let them finish," and (functionally important) **no anti-hallucination calendar guard** — i.e. raw GPT-4.1 reading the node steps. That's why it "sounded like an AI model."

**Fix (this pass).**
- **Restored the full known-good flow** (prompt + 33/24-edge routing + calendar guard) to the **original agents' editable draft flows** (`conversation_flow_9ef584e2f263` v3, `conversation_flow_68c0252a092d` v3) from the committed snapshots. Node *instructions* were never damaged (verified byte-identical) — only `global_prompt` and edges were.
- **One research-backed refinement** to the restored "SOUND HUMAN" block: removed the forced "SELF-CHECK → add a filler" rule and reframed disfluencies as **sparse and natural** (~one every few sentences, taught by example) with an explicit "do NOT stuff filler into every line" guard. Per Retell ([Agent Handbook](https://docs.retellai.com/build/agent-handbook)) and [LiveKit](https://livekit.com/blog/prompting-voice-agents-to-sound-more-realistic): fillers should be sparse and example-driven, never quota-based; over-seeding examples "leads to a pause in every sentence."
- **Repointed Railway** back to the original **editable** agents (`agent_d7bffee08f5962e2a0c5789fcd`, `agent_1cf55115cf9e5477adb445c754`). The two published duplicates are orphaned and version-titled "DEAD — do not use" (Retell won't let a published agent be renamed or deleted).
- **Re-synced the committed flow snapshots** to the refined prompt.

Net diff vs the team's last-good version: identical except the disfluency block is softened. Voice/pacing settings (custom voice, `0.5/0.95/0.3`, 20s silence) were already correct and were left untouched.

**Operational note — the editable-draft model.** These agents run **unpublished**; the draft is what serves live calls (confirmed: `get-agent` returns the v3 draft, `is_published:false`). Editing the draft flow is the safe way to change behavior — *do not* publish, since a published version can no longer be edited (that's what forced the duplicate-agent mess above).

---

## Same-session follow-ups (2026-06-22) — routing bug, first-name, de-dashed scripts

- **Production routing bug fixed.** `triggerRetellCall` passed the agent in `agent_id`, which Retell's `/v2/create-phone-call` **ignores**, so calls fell back to the from-number's `outbound_agents` binding (a 50/50 weight across both Morgan agents) and randomly used Speed-to-Lead or Reminder. Changed to **`override_agent_id`** ([index.js:687](dsn-orchestrator/index.js:687)). Confirmed on a live production lead call right after deploy: routed correctly to STL agent v3. Deployment `f2b69c60`.
- **First-name greeting.** Added `customer_first_name` (first token of `lead.name`) to the Retell dynamic vars; both flow greetings now say "Hey, is this {{customer_first_name}}?" instead of the full name (flow `default_dynamic_variables` updated too).
- **Reminder opens with the value (WIIFM-first).** Reworded the reminder `intro` to lead with what they get from the call with Brian before "you still good?", and trimmed the duplicate pitch that used to come after confirmation.
- **All em-dashes stripped from both agents' scripts** (global prompts, node instructions, edge conditions, spoken tool messages) per client preference, since the em-dash reads as an AI tell. Also changed the chirpy booking line "Perfect, let me lock that in" to "Alright, lemme lock that in." Zero em-dashes remain in either flow.
- Repo flow snapshots re-synced.

---

## Reminder confirm-call tightened + "concurrent editor" false alarm cleared (2026-06-23)

Three changes to the Reminder flow's `confirmed_attendance` node, all **live** on `conversation_flow_68c0252a092d` **v3** (the unpublished draft that serves calls; agent `agent_1cf55115cf9e5477adb445c754`, `is_published:false`):

1. **Killed the open-ended "any quick questions?" ask.** It turned a confirmation into a sales call. The node now reads: *"Once they've confirmed, you're DONE. Do NOT ask if they've got any questions... Never solicit questions."* It still answers a question if the lead raises one on their own, then closes.
2. **Confirm → warm, timing-aware goodbye → hang up.** Closes with *"Right on, talk to ya tomorrow!"* (reminder_24h) / *"Alright, talk to ya in a bit, see ya at {{appointment_time}}."* (reminder_1h), then ends.
3. **Zoom-link wording fixed.** Now says the link was already sent and goes out again *"about fifteen minutes before the call"* by **both text and email**. Replaced the factually wrong FAQ line *"we don't send texts right now"* — DSN does send the link by SMS **and** email (GHL workflows).

### Diagnosis — the "concurrent editor kept reverting my edits" claim was not real
A prior pass reported a concurrent editor repeatedly reverting these edits (claimed the flow was "rewritten at 14:26 UTC" back to a version saying "we don't send texts"). Live state does not support it: the live flow's `last_modification_timestamp` is **2026-06-23 14:29:04 UTC** (i.e. *after* the supposed revert) and contains all three fixes, the both-channels SMS line, and **zero em-dashes**. The "reverted" text the prior pass saw matched the **stale local snapshot**, not live — most likely a misread of a lagged API GET, not a parallel editor. No evidence anything is fighting the flow.

### Cleanup done this pass (local docs only — live untouched)
- **Re-synced `dsn-orchestrator/retell-flow-reminder.json` from live v3.** The committed snapshot still showed the old "we don't send texts / any quick questions" text — the exact artifact that triggered the false-revert narrative. Syncing it removes the landmine so a future pass doesn't "revert" live to match a stale file. `_comment` refreshed (synced 2026-06-23, do-not-publish warning added).
- **`retell-flow-speed-to-lead.json` already matched live** (no node or `global_prompt` drift) — left as-is.
- **Live system was not modified.** Every Retell API call this pass was a read-only GET; no `update`/`publish` calls. Agents remain unpublished and editable — **do not publish** (publishing makes the flow uneditable).

### Real automation backs the new promise
The agent now promises the link resends ~15 min before. That's backed by **GHL** (SMS + email), confirmed by the client. The orchestrator itself sends no SMS/email (its only outbound hosts are GHL and Retell). **Open item:** confirm the GHL workflow actually fires the resend ~15 min before, to match the "fifteen minutes" the script now says; if the timing differs, retime the workflow or soften the wording.

### Pending (not done)
- Reminder agent latency tweak: `responsiveness` 0.5 → 0.7 (queued, not applied).

---

*Generated with [Claude Code](https://claude.com/claude-code)*
