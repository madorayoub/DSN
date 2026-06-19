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
- **15-min vs 30-min:** the agent says "about 15 minutes," but `ghlBookAppointment` creates a **30-minute** GHL event. Decide which is correct and align the spoken duration with the actual calendar slot length.
- **Timezone accuracy ceiling:** area code is a good proxy but a **ported mobile** (number from one region, owner in another) can still be off. If the lead form captures **ZIP**, add ZIP-first timezone resolution on top of the area-code map.
- **Verification call** still needed to confirm `book_appointment` actually lands a booking end-to-end.

---

*Generated with [Claude Code](https://claude.com/claude-code)*
