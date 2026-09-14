#!/usr/bin/env node
'use strict';

// Go/no-go check for the round-robin calendar migration.
//
//   node scripts/preflight-round-robin.js            # check only, never touches git
//   node scripts/preflight-round-robin.js --deploy   # check, then merge to main and push
//
// The point of this script is that the migration has one failure mode you cannot
// see from the outside: a closer sitting on the calendar with no Zoom link, taking
// half the bookings and handing every one of them nothing to join. That is a per
// team member setting, so "Dan connected Zoom" is not the thing to check — his
// locationConfigurations entry on THIS calendar is. Everything else here is cheap
// enough to re-verify on every run.
//
// --deploy refuses to run unless every blocking check passes, so it is safe to
// reach for before you know whether the closers are actually ready.
//
// Reads the GHL token from server/.env (GHL_API_KEY), same as the manual curls.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT        = path.join(__dirname, '..');
const CALENDAR_ID = 'WZwIrG0g3gk7AzOJcYXX';
const BRANCH      = 'feat/round-robin-calendar-migration';
const UA          = 'Mozilla/5.0';

// Closer names are resolved from GHL rather than hardcoded. A static map goes stale
// silently every time the roster changes — it printed Michael as a raw user id when he
// replaced Dan, which is exactly when you least want the output to be unreadable.
async function closerName(userId) {
  try {
    const d = await ghl(`/users/${userId}`, '2021-07-28');
    const u = d.user || d;
    return (u.name || u.firstName || '').trim() || userId;
  } catch {
    return userId;
  }
}

const deploy = process.argv.includes('--deploy');
const results = [];
const record = (level, name, detail) => {
  results.push({ level, name, detail });
  const tag = { block: 'BLOCK', warn: 'WARN ', ok: 'ok   ', info: 'info ' }[level];
  console.log(`  [${tag}] ${name}${detail ? ' — ' + detail : ''}`);
};

function env(key) {
  const file = path.join(ROOT, 'server', '.env');
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && line.slice(0, i).trim() === key) return line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  throw new Error(`${key} not found in server/.env`);
}

async function ghl(pathname, version = '2021-04-15') {
  const res = await fetch(`https://services.leadconnectorhq.com${pathname}`, {
    headers: { Authorization: `Bearer ${env('GHL_API_KEY')}`, Version: version, 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`GHL ${pathname} -> HTTP ${res.status}`);
  return res.json();
}

const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim();

(async () => {
  console.log('\nRound-robin migration preflight\n');

  // ── The gate: every closer on the calendar must have a real meeting link ──
  console.log('Calendar');
  const cal = (await ghl(`/calendars/${CALENDAR_ID}`)).calendar;
  const members = cal.teamMembers || [];

  if (!members.length) {
    record('block', 'team members', 'calendar has none');
  } else {
    for (const m of members) {
      const loc  = (m.locationConfigurations || [{}])[0];
      const who  = await closerName(m.userId);
      const good = loc.kind === 'zoom_conference' && !!loc.zoomOauthId;
      record(good ? 'ok' : 'block', `${who} meeting link`,
        good ? 'zoom_conference' : `kind "${loc.kind}" with no Zoom — bookings to ${who} go out with nothing to join`);
    }
    if (members.length < 2) record('warn', 'closer count', `only ${members.length} on the calendar — the split cannot rotate`);
  }

  // On a round robin calendar this is capacity PER TEAM MEMBER, not per slot. At 2, a
  // closer is not treated as unavailable until both of their places are filled, so GHL
  // books the same person twice in one hour instead of moving to the next closer. 1 is
  // what makes the rotation work: one booking fills that closer for the hour and the
  // next lead spills over to someone else.
  record(cal.appointmentPerSlot === 1 ? 'ok' : 'block', 'appointmentPerSlot',
    cal.appointmentPerSlot === 1
      ? '1 — a closer fills up after one booking, so the next lead rotates on'
      : `${cal.appointmentPerSlot} — this is per closer, so the same person gets double-booked in one hour. Set it to 1.`);

  // Without this, round robin moves the APPOINTMENT to a closer but leaves the CONTACT
  // owned by whoever the lead workflow assigned. With one closer that was invisible —
  // everything was Brian's either way. With two it means a closer runs calls on leads
  // that belong to someone else, and the pipeline shows the wrong owner.
  record(cal.shouldAssignContactToTeamMember ? 'ok' : 'block', 'contact follows the closer',
    cal.shouldAssignContactToTeamMember
      ? 'on — the lead is reassigned to whoever gets the appointment'
      : 'off — the appointment rotates but the lead stays with its original owner');
  record('info', 'booking window', `${cal.allowBookingFor} ${cal.allowBookingForUnit}`);

  // ── Availability actually comes back ──
  console.log('\nAvailability');
  const now = Date.now();
  const slots = await ghl(`/calendars/${CALENDAR_ID}/free-slots?startDate=${now}&endDate=${now + 13 * 864e5}&timezone=America%2FChicago`);
  const days  = Object.entries(slots).filter(([k]) => /^\d{4}-\d{2}-\d{2}$/.test(k));
  const total = days.reduce((a, [, v]) => a + (v.slots || []).length, 0);
  record(total > 0 ? 'ok' : 'block', 'bookable slots', `${days.filter(([, v]) => (v.slots || []).length).length} dates / ${total} slots`);

  // ── The funnel's own path, end to end ──
  console.log('\nFunnel');
  process.env.GHL_PRIVATE_TOKEN = env('GHL_API_KEY');
  const { handler } = require(path.join(ROOT, 'netlify/functions/booking.js'));
  const ymd = (d) => d.toISOString().slice(0, 10);
  const end = new Date(); end.setDate(end.getDate() + 28);
  const res = await handler({
    httpMethod: 'GET', headers: { origin: 'https://directsales.network' },
    queryStringParameters: { startDate: ymd(new Date()), endDate: ymd(end), timezone: 'America/Chicago' },
  });
  const body = JSON.parse(res.body);
  record(res.statusCode === 200 ? 'ok' : 'block', 'booking function', `HTTP ${res.statusCode}`);
  record(body.calendarId === CALENDAR_ID ? 'ok' : 'block', 'function calendar', body.calendarId || '(none)');

  const embeds = execSync(`grep -rho "widget/booking/[A-Za-z0-9]*" docs/`, { cwd: ROOT, encoding: 'utf8' })
    .trim().split('\n').filter(Boolean).map((s) => s.split('/').pop());
  const stray = [...new Set(embeds.filter((id) => id !== CALENDAR_ID))];
  record(stray.length ? 'block' : 'ok', 'funnel embeds',
    stray.length ? `${embeds.length} embeds, still on ${stray.join(', ')}` : `all ${embeds.length} on the new calendar`);

  // ── Repo is in a shippable state ──
  console.log('\nRepo');
  const dirty = git('status --porcelain').split('\n').filter((l) => l && !l.includes('.playwright-cli'));
  record(dirty.length ? 'block' : 'ok', 'working tree', dirty.length ? `${dirty.length} uncommitted change(s)` : 'clean');
  const branch = git('rev-parse --abbrev-ref HEAD');
  record(branch === BRANCH ? 'ok' : 'block', 'branch', branch);
  const ahead = git(`rev-list --count main..${branch}`);
  record(+ahead > 0 ? 'ok' : 'block', 'commits to ship', ahead);

  // ── Verdict ──
  const blockers = results.filter((r) => r.level === 'block');
  const warns    = results.filter((r) => r.level === 'warn');
  console.log('\n' + '─'.repeat(64));

  if (blockers.length) {
    console.log(`NOT READY — ${blockers.length} blocker(s):`);
    blockers.forEach((b) => console.log(`  • ${b.name}: ${b.detail}`));
    console.log('\nNothing was deployed.');
    process.exit(1);
  }

  console.log('READY TO DEPLOY' + (warns.length ? ` (${warns.length} warning(s), not blocking)` : ''));
  warns.forEach((w) => console.log(`  • ${w.name}: ${w.detail}`));

  if (!deploy) {
    console.log('\nChecks only. To actually ship:  node scripts/preflight-round-robin.js --deploy');
    return;
  }

  console.log('\nDeploying — merging to main and pushing (Netlify builds from main)…');
  git('checkout main');
  git(`merge --no-ff ${BRANCH} -m "Merge ${BRANCH}: move the funnels onto the round-robin calendar"`);
  git('push origin main');
  console.log('Pushed. Netlify will build; confirm with the calendarId check in section 5 of the checklist.');
})().catch((err) => {
  console.error('\npreflight failed:', err.message);
  process.exit(1);
});
