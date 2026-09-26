// /.netlify/functions/meta-crm-sync — scheduled every 15 minutes (see netlify.toml).
//
// Reports DSN's leads to Meta as Conversions API CRM lead events: "New lead" when a lead
// from DSN's lead form arrives, then one event for each stage of the `sales` pipeline the
// lead moves into. Meta's "conversion leads" goal uses them to optimise Lead Ads for leads
// that book, not just leads that fill in the form, and it asks for every stage of the
// funnel, starting with the raw lead.
//
// A lead who lands in Booked also counts as a Schedule, the event the site sends when a
// lead books there. booking.js has already sent it for a site booking, so this covers the
// rest: leads booked by hand in GHL, or through GHL's own booking page.
//
// Meta counts every server event it receives (it only deduplicates browser-vs-server
// copies), so each stage change must go out exactly once. Each run covers the 15-minute
// slot before the schedule boundary it fires on, and consecutive slots don't overlap. A
// run that fails loses its slot's events rather than sending them twice.

const { hashedUserData, sendEvent } = require('../lib/meta-capi');

const GHL_BASE    = 'https://services.leadconnectorhq.com';
const LOCATION_ID = process.env.GHL_LOCATION_ID || 'NgduPjDbvABP3zFIqnt4';
const PIPELINE_ID = 'deeFJVq1U9SYR8WIvEkl'; // "sales"
const BOOKED      = '2b89c846-0623-4468-9fee-6dbe91a8802a';

// Stage id → the lead stage name Meta receives as event_name. Keyed by id so renaming a
// stage in GHL doesn't quietly change what Meta sees. Every stage but the first, "New
// lead": new leads don't get a card, so that one is reported when the lead arrives.
const STAGES = {
  '8f29b520-dae0-48e1-9c51-f396a1e21223': 'Response required',
  'ffe3e48b-bb6b-494a-8304-5c3ef707097d': 'Follow up',
  'c1f6630c-0614-4ce5-aed4-6e13146cb059': 'No-pickup',
  [BOOKED]:                               'Booked',
  'b22ef336-f6f1-463a-9184-06f7b4da81a0': 'No Show',
  '2cd994d5-8d0e-4075-9abf-1259b862875b': 'Booked - Followup',
  'b15c53b4-b293-417c-83a7-2397e8b87fd5': 'Invoice sent',
  '5b50380f-9dfd-4350-98f2-f6c9fda2ced6': 'Follow up - Long term',
  'f9ab0bd9-2757-45f4-b588-1dd44e320685': 'Proposal Sent',
  '4da0210c-127c-41ea-b9a9-e3ae5cd45e16': 'Paid - Deal Closed',
  '82242ea8-8937-4414-aab9-0b717849be5d': 'Unqualified',
};

// A new lead is a contact GHL's FB lead workflow tags as coming from DSN's lead form. The
// same Page runs another business's lead form, and Messenger chats also arrive as
// Facebook contacts; neither ever books with DSN, so neither is a DSN lead.
const NEW_LEAD_TAG      = 'dsnc_fb_lead';
// New leads are reported 30 minutes after they arrive, long after the workflow tags them.
const NEW_LEAD_DELAY_MS = 30 * 60 * 1000;
// Runs from here on report new leads. This one also sends the 6.5 days before it, so
// Meta's funnel starts with the leads whose later stages it already has.
const NEW_LEAD_LAUNCH   = Date.parse('2026-09-26T16:00:00Z');

const SLOT_MS       = 15 * 60 * 1000; // must match the schedule in netlify.toml
const LAG_MS        = 2 * 60 * 1000;  // gives GHL's search time to show a stage change
const MAX_OFFSET_MS = 3 * 60 * 1000;  // scheduled runs fire within seconds of a boundary

// A site booking this close to a card landing in Booked is what put it there: GHL's
// workflow moves the card 3.6–17 s after a booking (measured on live bookings).
const SITE_BOOKING_MS = 30 * 60 * 1000;
// How far past now to look for those bookings' start times. The site offers slots only a
// few days ahead (the calendar's booking window).
const LOOKAHEAD_MS    = 60 * 24 * 60 * 60 * 1000;

// Launch. Runs before LAUNCH send nothing. The LAUNCH run also sends the 6.5 days before
// it (Meta rejects events older than 7 days), so Meta starts with data. Later runs cover
// only their own slot.
const LAUNCH      = Date.parse('2026-09-26T13:30:00Z');
const BACKFILL_MS = 6.5 * 24 * 60 * 60 * 1000;

const GHL_HEADERS = {
  Authorization: `Bearer ${process.env.GHL_PRIVATE_TOKEN}`,
  Version: '2021-07-28',
};

// The stage changes this run reports, as { from, to }, or { skip } if it shouldn't send.
function slotFor(event, now) {
  let nextRun = NaN;
  try { nextRun = Date.parse(JSON.parse(event.body || '{}').next_run); } catch { /* no body */ }
  if (!Number.isFinite(nextRun)) return { skip: 'no next_run, so not a scheduled call' };

  // The boundary this run fires on. A run far from any boundary is the "Run now" button,
  // which would resend a slot the scheduled run already sent.
  const boundary = Math.round(now / SLOT_MS) * SLOT_MS;
  if (Math.abs(now - boundary) > MAX_OFFSET_MS) return { skip: 'not on the schedule ("Run now"?)' };
  if (boundary < LAUNCH) return { skip: 'before launch' };

  const to = boundary - LAG_MS;
  return { boundary, from: boundary === LAUNCH ? to - BACKFILL_MS : to - SLOT_MS, to };
}

// The arrivals this run reports as new leads: its slot, 30 minutes earlier. Consecutive
// windows don't overlap either, so each new lead goes out once.
function newLeadWindow(slot) {
  if (slot.boundary < NEW_LEAD_LAUNCH) return null;
  const to = slot.to - NEW_LEAD_DELAY_MS;
  return { from: slot.boundary === NEW_LEAD_LAUNCH ? to - BACKFILL_MS : to - SLOT_MS, to };
}

async function opportunitiesIn(stageId) {
  const found = [];
  for (let page = 1; page && page <= 20;) {
    const res = await fetch(
      `${GHL_BASE}/opportunities/search?location_id=${LOCATION_ID}&pipeline_id=${PIPELINE_ID}` +
      `&pipeline_stage_id=${stageId}&limit=100&page=${page}`,
      { headers: GHL_HEADERS, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`Opportunity search failed: ${res.status} — ${(await res.text()).slice(0, 200)}`);
    const { opportunities = [], meta = {} } = await res.json();
    found.push(...opportunities);
    page = opportunities.length === 100 && meta.nextPage ? meta.nextPage : null;
  }
  return found;
}

// When each contact booked on the site, going by the title booking.js gives its
// appointments ("Strategy Call — <name>"). GHL titles the ones it makes, by hand or on
// its own booking page, "<name> - Strategy Zoom Call".
async function siteBookingTimes(since) {
  const get = async (path) => {
    const res = await fetch(GHL_BASE + path, {
      headers: { ...GHL_HEADERS, Version: '2021-04-15' }, signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`${path.split('?')[0]} failed: ${res.status}`);
    return res.json();
  };
  const { calendars = [] } = await get(`/calendars/?locationId=${LOCATION_ID}`);
  const times = new Map();
  await Promise.all(calendars.map(async ({ id }) => {
    // GHL searches appointments by start time, and a booking starts after it's made.
    const { events = [] } = await get(
      `/calendars/events?locationId=${LOCATION_ID}&calendarId=${id}` +
      `&startTime=${since}&endTime=${Date.now() + LOOKAHEAD_MS}`
    );
    for (const appt of events) {
      if (!String(appt.title || '').startsWith('Strategy Call — ')) continue;
      times.set(appt.contactId, [...(times.get(appt.contactId) || []), Date.parse(appt.dateAdded)]);
    }
  }));
  return times;
}

// DSN's leads that arrived in [from, to).
async function newLeadsIn({ from, to }) {
  const found = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${GHL_BASE}/contacts/search`, {
      method: 'POST',
      headers: { ...GHL_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: LOCATION_ID, page, pageLimit: 100,
        // Searched a second wider each side, then cut exactly, whatever GHL does at the ends.
        filters: [{ field: 'dateAdded', operator: 'range', value: {
          gt: new Date(from - 1000).toISOString(), lt: new Date(to + 1000).toISOString(),
        } }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Contact search failed: ${res.status} — ${(await res.text()).slice(0, 200)}`);
    const { contacts = [] } = await res.json();
    found.push(...contacts);
    if (contacts.length < 100) break;
  }
  return found.filter((contact) => {
    const at = Date.parse(contact.dateAdded);
    return at >= from && at < to && (contact.tags || []).includes(NEW_LEAD_TAG);
  });
}

function userData(opp) {
  const { name, email, phone } = opp.contact || {};
  const [firstName = '', ...rest] = String(name || '').trim().split(/\s+/);
  return hashedUserData({ em: email, ph: phone, fn: firstName, ln: rest.join(' '), external_id: opp.contactId });
}

function newLeadEvent(contact) {
  const addedAt = Date.parse(contact.dateAdded);
  // Hashed exactly as the lead's later stage events are, from the full name.
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
  return {
    event_name: 'New lead',
    event_time: Math.floor(addedAt / 1000),
    event_id: `${contact.id}-new-lead`,
    action_source: 'system_generated',
    user_data: userData({ contact: { name, email: contact.email, phone: contact.phone }, contactId: contact.id }),
    custom_data: { event_source: 'crm', lead_event_source: 'GoHighLevel' },
  };
}

function stageEvent(opp) {
  const changedAt = Date.parse(opp.lastStageChangeAt);
  return {
    event_name: STAGES[opp.pipelineStageId],
    event_time: Math.floor(changedAt / 1000),
    event_id: `${opp.id}-${changedAt}`,
    action_source: 'system_generated',
    user_data: userData(opp),
    custom_data: { event_source: 'crm', lead_event_source: 'GoHighLevel' },
  };
}

// The Schedule the site would have sent, for a lead booked some other way. It didn't
// happen on the website, so it goes out as "other" and is matched on the lead's details.
function scheduleEvent(opp) {
  const changedAt = Date.parse(opp.lastStageChangeAt);
  return {
    event_name: 'Schedule',
    event_time: Math.floor(changedAt / 1000),
    event_id: `${opp.id}-${changedAt}-schedule`,
    action_source: 'other',
    user_data: userData(opp),
    custom_data: { currency: 'USD', value: 0 },
  };
}

// A Schedule for each lead who landed in Booked without booking on the site. If the site
// bookings can't be read, none go out: one booking.js already sent would count twice.
async function schedulesFor(changes, since) {
  const booked = changes.filter((opp) => opp.pipelineStageId === BOOKED);
  if (!booked.length) return [];
  let site;
  try {
    site = await siteBookingTimes(since - SITE_BOOKING_MS);
  } catch (err) {
    console.error(`[meta-crm] no Schedule for ${booked.length} booked lead(s), site bookings unreadable:`, err.message);
    return [];
  }
  return booked
    .filter((opp) => {
      const at = Date.parse(opp.lastStageChangeAt);
      return !(site.get(opp.contactId) || []).some((t) => Math.abs(t - at) <= SITE_BOOKING_MS);
    })
    .map(scheduleEvent);
}

exports.handler = async (event) => {
  const slot = slotFor(event, Date.now());
  if (slot.skip) {
    console.log(`[meta-crm] skipped: ${slot.skip}`);
    return { statusCode: 200, body: '' };
  }
  const leads = newLeadWindow(slot);
  const iso = (ms) => new Date(ms).toISOString();
  const span = `${iso(slot.from)} → ${iso(slot.to)}` + (leads ? ` (new leads ${iso(leads.from)} → ${iso(leads.to)})` : '');
  if (!process.env.GHL_PRIVATE_TOKEN) {
    console.error('[meta-crm] GHL_PRIVATE_TOKEN is not set');
    return { statusCode: 500, body: '' };
  }

  try {
    const [byStage, newLeads] = await Promise.all([
      Promise.all(Object.keys(STAGES).map(opportunitiesIn)),
      // A failed search loses only this window's new leads, not the stage changes.
      leads ? newLeadsIn(leads).catch((err) => {
        console.error('[meta-crm] new leads lost, contact search failed:', err.message);
        return [];
      }) : [],
    ]);
    // Every card counts: all leads come from Meta, none are imported (Ayoub, 2026-09-26).
    // Until then only cards whose first touch GHL recorded as an instant form were sent.
    const changes = byStage.flat().filter((opp) => {
      const at = Date.parse(opp.lastStageChangeAt);
      return at >= slot.from && at < slot.to;
    });
    const events = [
      ...newLeads.map(newLeadEvent),
      ...changes.map(stageEvent),
      ...await schedulesFor(changes, slot.from),
    ];
    // In parallel: a launch run can carry dozens of events, and that many of sendEvent's
    // 3 s timeouts in a row would overrun the 30 s limit if Meta were slow.
    const results = await Promise.all(events.map((ev) => sendEvent(ev)));

    const sent = {};
    events.forEach((ev, i) => {
      if (results[i].ok) sent[ev.event_name] = (sent[ev.event_name] || 0) + 1;
      else console.error(`[meta-crm] ${ev.event_name} ${ev.event_id} not sent: ${results[i].error || results[i].status}`);
    });
    console.log(`[meta-crm] ${span}: sent ${results.filter((r) => r.ok).length}/${events.length}`, JSON.stringify(sent));
    return { statusCode: 200, body: '' };
  } catch (err) {
    console.error(`[meta-crm] ${span}: run failed, this slot's events are lost:`, err.message);
    return { statusCode: 500, body: '' };
  }
};
