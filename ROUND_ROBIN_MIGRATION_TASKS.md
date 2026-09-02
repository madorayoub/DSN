# Round-robin calendar migration — what's left for you

Code side is done and committed on `feat/round-robin-calendar-migration`
(`35a62a6`, `91c16a6`). **Nothing is deployed.** Production still books onto
Brian's personal calendar.

**Moving from:** `DXh5uGCZVjFLPQNeKRZu` — "Free Consultation", Brian only
**Moving to:** `WZwIrG0g3gk7AzOJcYXX` — "DSN - Strategy Zoom Call", round robin, Brian B + Dan A

Section 2 is confirmed resolved. **Section 0 is the one that would cost you money
if it shipped as-is**, then section 3. Neither depends on Dan. Section 4 is
decisions, section 5 is the deploy.

---

## 0. Raise the booking window from 5 days to 10 — do this before deploying

**As configured, this migration cuts bookable inventory on the ad funnel by about
two thirds.** Measured against the exact 14-day range the commercial funnel's
booking overlay requests:

| | old calendar | new round robin |
|---|---|---|
| clickable dates (of 14) | **9** | **4** |
| total bookable slots | **35** | **11** |
| furthest bookable date | Sep 11 | Sep 5 |

The cause is `allowBookingFor`, which is **5 days on the new calendar and 10 on the
old one**. It's the cap doing this, not the closers' availability — asking for 21
days out still hard-stops the new calendar at Sep 5.

This has nothing to do with Dan being off the rotation, and adding him back does
not fix it: his availability only helps within those same 5 days.

- [ ] Set **`allowBookingFor` to 10 days** (or more) on "DSN - Strategy Zoom Call"
      so it at least matches what the old calendar offered

I left this for you rather than doing it over the API — it's one field in the UI,
and GHL's calendar update endpoint can clobber adjacent fields like team config and
open hours, which isn't a risk worth taking on the live booking calendar.

**Verify** — should return 9-ish live dates rather than 4:

```bash
cd server && TOK=$(grep '^GHL_API_KEY=' .env | cut -d= -f2-) && S=$(python3 -c "import time;print(int(time.time()*1000))") && E=$(python3 -c "import time;print(int((time.time()+13*86400)*1000))") && curl -s "https://services.leadconnectorhq.com/calendars/WZwIrG0g3gk7AzOJcYXX/free-slots?startDate=${S}&endDate=${E}&timezone=America%2FChicago" -H "Authorization: Bearer ${TOK}" -H "Version: 2021-04-15" -A "Mozilla/5.0" | python3 -c "import json,sys,re; d=json.load(sys.stdin); days={k:len(v.get('slots') or []) for k,v in d.items() if re.match(r'^\d{4}-\d{2}-\d{2}$',k)}; print('live dates:',sum(1 for n in days.values() if n),'| slots:',sum(days.values()))"
```

---

## 1. Dan's Zoom — keep him out of the rotation until he does it

Brian is wired to Zoom on the round-robin calendar; Dan is not. GHL alternates
between them, so with Dan live, roughly half of all bookings go out with an empty
meeting link. I checked every calendar in the account — Dan has no Zoom connection
anywhere to copy across, and it OAuths his own account, so only he can do it.

Since that's on his schedule, don't let it hold the migration. **Take Dan out of
the calendar's team members for now** and the round robin runs Brian-only — same
as today, but on the new calendar. Then everything else here gets done, tested and
deployed without waiting, and the day Dan connects his Zoom you add him back: one
toggle in the UI, no code change, no deploy.

- [ ] **Remove Dan from the "DSN - Strategy Zoom Call" team members** for now
      (GHL → Calendars → that calendar → team members)
- [ ] Later, when Dan connects Zoom: add him back and re-check the split

Two things to know about this: while Dan is out, availability is Brian's 14 slots
rather than the combined 21, so you don't get the extra-slot benefit until he's on.
And adding or removing a team member resets GHL's meeting counts — harmless here,
since this calendar optimises for availability rather than equal distribution.

If you'd rather have Dan taking calls before he sorts Zoom out, the other option
is pasting his **Zoom personal room URL** as a custom location. Works immediately,
but every call lands in the same room, so back-to-back meetings collide. Temporary
only.

**Verify** — every member listed must come back `zoom_conference`, not `custom`.
While Dan is removed, expect one line (Brian). When he's back, expect two:

```bash
cd server && TOK=$(grep '^GHL_API_KEY=' .env | cut -d= -f2-) && curl -s "https://services.leadconnectorhq.com/calendars/WZwIrG0g3gk7AzOJcYXX" -H "Authorization: Bearer ${TOK}" -H "Version: 2021-04-15" -A "Mozilla/5.0" | python3 -c "import json,sys; [print(t.get('userId'), (t.get('locationConfigurations') or [{}])[0].get('kind')) for t in json.load(sys.stdin)['calendar']['teamMembers']]"
```

---

## 2. Netlify env var — ✅ RESOLVED, nothing to do

`GHL_CALENDAR_ID` in the Netlify dashboard would have **silently overridden** the
calendar in the code — a deploy that looks completely fine while still booking
Brian only.

Checked on the `dsn1` project (directsales.network) 2026-09-02: the only
environment variables set are `GHL_PRIVATE_TOKEN` and `META_PIXEL_ACCESS_TOKEN`.
**`GHL_CALENDAR_ID` is not set**, so the value in `netlify/functions/booking.js`
applies directly and the deploy will take effect as written.

Same for `GHL_LOCATION_ID` — also unset, also falling through to the code default.

No action needed. The post-deploy check in section 5 still confirms it outright.

---

## 3. Workflows — check what they're pinned to  *(you're taking this one)*

GHL's API only returns workflow names and status, never their trigger config — the
detail endpoints 404 — so there's no way for me to check this programmatically. It
needs eyes in the UI, and you said you'd handle it.

If a workflow's appointment trigger is filtered to "Free Consultation", then
bookings on the new calendar get **no reminders and no no-show handling** — they'd
just silently stop working.

Open each of these and check whether the trigger is scoped to a specific calendar.
If it is, add or switch to "DSN - Strategy Zoom Call":

- [ ] `DSN Appts Reminders`
- [ ] `DSN Appts Reminders - Follow up`
- [ ] `No-show`
- [ ] `Salesman Zoom Appointment Reminders`
- [ ] `Assign to M`

While you're in there — `Assign to M` was updated 2026-08-26 and I don't know what
it does. Worth confirming it doesn't fight the round-robin assignment.

Two things to watch for while you're in these, both from section 3b below:

- [ ] Confirm the confirmation email/SMS actually sends
      **`{{appointment.reschedule_link}}`**. That merge field only resolves inside a
      workflow with an appointment trigger — on any other trigger it renders blank
      and the lead gets a dead link.
- [ ] Know that a real GHL reschedule **deletes the original appointment and creates
      a new one, re-firing "Appointment Booked" without ever firing "Appointment
      Cancelled."** So reminder/no-show workflows will re-trigger on reschedules.

---

## 3b. The reschedule page doesn't reschedule anything

**This one undercuts the "keep the original closer" decision, so it's worth reading.**

`/commercial/reschedule` (and the trial one) embeds a plain GHL booking widget. Every
link pointing at it — from `thankyou`, `pre-call` and `callconfirmed` — is a bare
`href="reschedule"` with no appointment id, and the page reads no query parameters.

So it cannot move an existing appointment. It books a **brand new one** and leaves the
original sitting on the calendar, still blocking that slot.

The live data shows the pattern. Appointment titles identify the source: the funnel
overlay writes `Strategy Call — Name`, the widget writes just `Name`. Of 83
appointments across 72 contacts, 9 contacts hold more than one, and one — Teje Pierre
— held **two simultaneously confirmed** appointments (Jul 30 and Jul 31, both from the
widget) on top of an earlier no-show. Most of the rest were cleaned up by hand, which
is the real ongoing cost.

**Round robin makes this materially worse.** Today Brian sees both the original and the
duplicate and tidies up. With two closers, the duplicate is a fresh booking that the
round robin can hand to Dan, while Brian still holds the original — and neither of them
knows the other exists. That is also exactly why "keep the original closer" can't help
here: through this page nothing is a reschedule, it's just a new booking.

There is no URL I can hardcode to fix it. GHL issues a **unique tokenised link per
appointment** via `{{appointment.reschedule_link}}`; a calendar id is not enough to
build one.

- [ ] Send leads to `{{appointment.reschedule_link}}` from an appointment-triggered
      workflow (confirmation email/SMS) instead of to this page
- [ ] Then decide what `/commercial/reschedule` should be: removed, redirected, or
      rewritten to say "your reschedule link is in your confirmation email"

I've left the page alone for now — if the confirmation emails don't already carry that
link, replacing the widget today would leave leads with no way to move a call at all.
Confirm the link goes out first, then it's safe to change.

---

## 4. Decisions — not broken, but you should choose

- [x] ~~Booking window is 5 days, was 10.~~ Promoted to **section 0** — measured,
      it's a two-thirds cut in bookable slots, not a stylistic choice.
- [ ] **`googleInvitationEmails` is now ON** (it was off). Leads may get a Google
      calendar invite *and* GHL's own confirmation. Decide if you want both.
- [ ] **Contacts aren't assigned to whoever takes the call**
      (`shouldAssignContactToTeamMember: false`). Not a regression — already false —
      but it didn't matter with one closer. Now Dan can run the call while the
      contact record ownership doesn't follow him, which affects follow-up and
      pipeline ownership.
**Decided 2026-09-02 — both still need doing in the GHL UI:**

- [ ] **Allow 2 bookings per time slot.** Set `appointmentPerSlot` to 2 on
      "DSN - Strategy Zoom Call" so Brian and Dan can each take a lead at the same
      hour. At 1, a second closer only widens *which* times exist — it never doubles
      capacity at any given time. No code change needed; the funnel already handles a
      slot filling up (it re-checks and shows "that slot was just taken" on a 409).
      **Do this after Dan's Zoom is connected** — at 2 per slot, a bad Zoom config
      hits two leads in the same hour instead of one.
- [ ] **Reschedules keep the original closer**, not re-rotated. Set this in the
      calendar's reschedule/advanced settings. Note this only takes effect for *real*
      reschedules — see section 3b, the current reschedule page doesn't produce any.

I've deliberately not made these over the API: GHL's calendar update endpoint can
clobber adjacent fields like team config and open hours, and each is a single field
in the UI.

---

## 5. Deploy and verify

Deploy is a push to `main` — the `dsn1` project deploys from GitHub, and there's no
GitHub Actions workflow in the repo. Note the site's last deploy was **Jul 30**:
everything since has landed on branches rather than `main`, so merging this is what
triggers the build. Do this **after** section 3.

- [ ] Merge `feat/round-robin-calendar-migration` into `main` and push
- [ ] Confirm prod is actually on the new calendar. Look for `calendarId` in the
      response: it should read `WZwIrG0g3gk7AzOJcYXX`. If it reads the old ID,
      section 2 wasn't done. If the field is **missing entirely**, the deploy
      hasn't gone out yet — that's what it looks like today:

```bash
curl -s "https://directsales.network/.netlify/functions/booking?startDate=2026-09-03&timezone=America/Chicago" -H "Origin: https://directsales.network" | python3 -m json.tool | head -20
```

- [ ] **Book one real test appointment** through the commercial funnel. Confirm it
      lands on the round-robin calendar, gets assigned to a closer, and comes back
      with a working Zoom link. I held off on this because it fires live
      notifications to the closers.
- [ ] Confirm reminders fire for a booking on the new calendar (section 3 check,
      but end-to-end).

Then, on the day Dan connects his Zoom and goes back on the calendar:

- [ ] Re-run the section 1 verify — both members should read `zoom_conference`
- [ ] Book **two** test appointments and confirm they go to *different* closers.
      One booking only proves the calendar works; two is the only thing that
      proves the split is actually rotating.

---

## Already handled — no action needed

- All funnel and reschedule pages repointed to the round-robin calendar
- The Netlify booking function now reports which calendar it's using, so a silent
  env override is visible instead of invisible
- Confirmed the booking function is written correctly for round robin: it omits
  `assignedUserId`, which is exactly what lets GHL distribute
- Trial funnel pages were pointing at a deleted calendar; repointed for tidiness,
  but you've confirmed that funnel is retired so it doesn't matter
- Voice orchestrator left on Brian's calendar, per your call
