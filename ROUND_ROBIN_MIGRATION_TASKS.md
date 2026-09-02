# Round-robin calendar migration — what's left for you

Code side is done and committed on `feat/round-robin-calendar-migration`
(`35a62a6`, `91c16a6`). **Nothing is deployed.** Production still books onto
Brian's personal calendar.

**Moving from:** `DXh5uGCZVjFLPQNeKRZu` — "Free Consultation", Brian only
**Moving to:** `WZwIrG0g3gk7AzOJcYXX` — "DSN - Strategy Zoom Call", round robin, Brian B + Dan A

Everything below needs an account I can't reach from here. Sections 1–3 block
go-live. Section 4 is decisions. Section 5 is the deploy itself.

---

## 1. Dan connects Zoom — the actual blocker

Right now Brian is wired to Zoom on the round-robin calendar and **Dan is not**.
GHL alternates between them, so roughly half of all bookings would go out with an
empty meeting link. The product is the Zoom call, so this has to land first.

I checked every calendar in the account — Dan has no Zoom connection anywhere,
so there's nothing to copy across. It OAuths his own Zoom account, which means
only Dan can do it.

- [ ] **Dan connects his Zoom** to the "DSN - Strategy Zoom Call" calendar
      (GHL → Calendars → that calendar → team members → his meeting location → Zoom)
- [ ] If Dan is slow: paste his **Zoom personal room URL** as a custom location
      instead. Unblocks immediately, but every call lands in the same room, so
      back-to-back meetings can collide. Treat as temporary.

**Verify** — both members must come back `zoom_conference`, not `custom`:

```bash
cd server && TOK=$(grep '^GHL_API_KEY=' .env | cut -d= -f2-) && curl -s "https://services.leadconnectorhq.com/calendars/WZwIrG0g3gk7AzOJcYXX" -H "Authorization: Bearer ${TOK}" -H "Version: 2021-04-15" -A "Mozilla/5.0" | python3 -c "import json,sys; [print(t.get('userId'), (t.get('locationConfigurations') or [{}])[0].get('kind')) for t in json.load(sys.stdin)['calendar']['teamMembers']]"
```

---

## 2. Netlify env var

`GHL_CALENDAR_ID` in the Netlify dashboard **silently overrides** the calendar in
the code. If it's set to the old calendar, the deploy will look completely fine
and still book Brian only.

directsales.network is on Netlify, but the CLI on this machine is logged into the
Task Force Garage account, which doesn't contain that site — so I can't read or
change it.

- [ ] Log into the Netlify account that owns **directsales.network**
- [ ] Site settings → Environment variables → find `GHL_CALENDAR_ID`
- [ ] Either set it to `WZwIrG0g3gk7AzOJcYXX`, or delete it and let the code default win

---

## 3. Workflows — check what they're pinned to

GHL's API only returns workflow names and status, never their trigger config, so
there's no way for me to check this programmatically. It needs eyes in the UI.

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

---

## 4. Decisions — not broken, but you should choose

- [ ] **Booking window is 5 days, was 10.** Halves how far ahead ad traffic can
      book. Fine if deliberate (tighter windows usually show up better), but it's
      a real change to how the funnel behaves.
- [ ] **`googleInvitationEmails` is now ON** (it was off). Leads may get a Google
      calendar invite *and* GHL's own confirmation. Decide if you want both.
- [ ] **Contacts aren't assigned to whoever takes the call**
      (`shouldAssignContactToTeamMember: false`). Not a regression — already false —
      but it didn't matter with one closer. Now Dan can run the call while the
      contact record ownership doesn't follow him, which affects follow-up and
      pipeline ownership.
- [ ] **Reschedule behaviour.** GHL has a per-calendar setting for whether a
      reschedule reassigns through the round robin or keeps the original owner.
      It's UI-only, I can't read it. If a lead already spoke to Brian, you probably
      want it staying with Brian.

I deliberately left all four alone rather than "fixing" them — they're config
choices, and GHL's calendar update endpoint can clobber adjacent fields like team
config and open hours.

---

## 5. Deploy and verify

Deploy is a push to `main` (Netlify builds from the repo — there's no GitHub
Actions workflow). Do this **after** sections 1–3.

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
      notifications to Brian and Dan.
- [ ] Book a **second** one and check it goes to the *other* closer — that's the
      only way to prove the split is actually working.
- [ ] Confirm reminders fire for a booking on the new calendar (section 3 check,
      but end-to-end).

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
