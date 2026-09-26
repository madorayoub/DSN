// /.netlify/functions/booking
// GET  ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&timezone=...  → available slots
// POST { name, email, phone, slot, timezone, event_id?, page_url? } → create appointment

const { hashedUserData, requestContext, sendEvent } = require('../lib/meta-capi');

const GHL_BASE    = 'https://services.leadconnectorhq.com';
const TOKEN       = process.env.GHL_PRIVATE_TOKEN;   // set in Netlify env vars
const LOCATION_ID = process.env.GHL_LOCATION_ID  || 'NgduPjDbvABP3zFIqnt4';
const CALENDAR_ID = process.env.GHL_CALENDAR_ID  || 'WZwIrG0g3gk7AzOJcYXX';

const ALLOWED_ORIGIN = 'https://directsales.network';

const GHL_HEADERS = {
  'Authorization': `Bearer ${TOKEN}`,
  'Version':       '2021-04-15',
  'Content-Type':  'application/json',
};

function corsHeaders(origin) {
  const allowed = (origin === ALLOWED_ORIGIN || !origin) ? origin || ALLOWED_ORIGIN : null;
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  // Only set the header when we have a valid allowed origin (never write "null")
  if (allowed) headers['Access-Control-Allow-Origin'] = allowed;
  return headers;
}

function json(statusCode, body, origin) {
  return {
    statusCode,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Connection': 'close' },
    body: JSON.stringify(body),
  };
}

// Fetch available slots for a date range.
// GHL returns: { "YYYY-MM-DD": { slots: ["ISO", ...] }, traceId: "..." }
async function getSlots(startDate, endDate, timezone) {
  // Expand range by 1 day each side so UTC+/- users don't miss slots at day boundaries.
  // GHL's timezone param handles correct date grouping; the frontend filters by date button.
  const startMs = new Date(`${startDate}T00:00:00Z`).getTime() - 24 * 60 * 60 * 1000;
  const endMs   = new Date(`${endDate}T23:59:59Z`).getTime()   + 24 * 60 * 60 * 1000;
  const url   = `${GHL_BASE}/calendars/${CALENDAR_ID}/free-slots`
    + `?startDate=${startMs}&endDate=${endMs}&timezone=${encodeURIComponent(timezone)}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  let res;
  try {
    res = await fetch(url, { headers: GHL_HEADERS, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error('GHL slots error'), { status: res.status, detail: text });
  }
  const data = await res.json();

  const result = {};
  for (const [key, val] of Object.entries(data)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    result[key] = val?.slots || [];
  }
  return result;
}

function normPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10)                       return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1')  return '+' + digits;
  if (digits.length >= 9 && digits.length <= 15)  return '+' + digits;
  return null;
}

function splitName(full) {
  const parts = (full || '').trim().split(/\s+/);
  return { firstName: parts[0] || 'Unknown', lastName: parts.slice(1).join(' ') || '' };
}

// Fill in only what the contact is missing, never overwrite. Most bookers are FB
// leads whose contact already holds the details they're known by, and the form can
// carry a typo or a first name only. (This used to send locationId, which GHL's
// update rejects with a 422, so until 2026-09-26 no booking updated a contact.)
async function fillMissing(existing, { firstName, lastName, email, phone }) {
  const updates = {};
  if (!existing.firstName && firstName !== 'Unknown') updates.firstName = firstName;
  if (!existing.lastName && lastName) updates.lastName = lastName;
  if (!existing.email && email) updates.email = email;
  if (!existing.phone && phone) updates.phone = phone;
  if (!Object.keys(updates).length) return existing;

  const patch = await fetch(`${GHL_BASE}/contacts/${existing.id}`, {
    method: 'PUT', headers: GHL_HEADERS,
    body: JSON.stringify(updates),
  }).catch(networkFailure);
  if (!patch.ok) {
    console.warn(`[booking] Contact update failed: ${patch.status} ${(await patch.text().catch(() => '')).slice(0, 200)} — proceeding with existing contact ${existing.id}`);
    return existing;
  }
  const patchData = await patch.json().catch(() => ({}));
  // GHL PUT may return { contact: {...} } or the contact object directly. Laid over what's
  // already known, so a partial reply can't hide the contact's owner or details.
  return { ...existing, ...updates, ...(patchData.contact ?? (patchData.id ? patchData : {})) };
}

// Stands in for a GHL reply when the request never got one, so a dropped connection is
// handled like any other failed call instead of throwing past the fallbacks.
function networkFailure(err) {
  return { ok: false, status: 0, text: async () => `network error: ${err.message}`, json: async () => ({}) };
}

// email and phone arrive only when they look usable (null otherwise). Nothing in here may
// stop a booking: every path ends with a contact to book on, unless GHL itself is down.
async function upsertContact({ name, email, phone }) {
  const { firstName, lastName } = splitName(name);

  // A failed search is no reason to fail the booking: creating the contact below still
  // lands on an existing one through GHL's duplicate check.
  const contacts = !phone ? [] : await fetch(
    `${GHL_BASE}/contacts/?locationId=${LOCATION_ID}&query=${encodeURIComponent(phone)}`,
    { headers: GHL_HEADERS }
  )
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`))))
    .then((data) => data.contacts || [])
    .catch((err) => { console.warn(`[booking] Contact search failed (${err.message}) — creating the contact instead`); return []; });

  if (contacts.length) {
    const existing = contacts[0];
    // The search matches phone text in other fields too. Only fill in a contact that
    // really has this number, so one lead's details never land on someone else.
    if (String(existing.phone || '').replace(/\D/g, '') !== phone.replace(/\D/g, '')) {
      console.warn(`[booking] Phone search matched contact ${existing.id}, whose phone differs — not updating it`);
      return existing;
    }
    return fillMissing(existing, { firstName, lastName, email, phone });
  }

  // GHL can still refuse an email or phone that looks fine here, so each refusal tries
  // again with less, down to the name alone.
  const attempts = [{ email, phone }, { email }, { phone }, {}]
    .map((fields) => Object.fromEntries(Object.entries(fields).filter(([, value]) => value)))
    .filter((fields, i, all) => all.findIndex((f) => Object.keys(f).join() === Object.keys(fields).join()) === i);
  let failure;
  for (const fields of attempts) {
    const create = await fetch(`${GHL_BASE}/contacts/`, {
      method: 'POST', headers: GHL_HEADERS,
      body: JSON.stringify({ locationId: LOCATION_ID, firstName, lastName, ...fields, source: 'Landing Page' }),
    }).catch(networkFailure);
    const text = await create.text().catch(() => '');
    let data = null;
    try { data = JSON.parse(text); } catch {}
    if (create.ok && data?.contact?.id) return data.contact;
    // The search above only finds a lead by phone. A lead who types a different number
    // than the one on file, or whose contact is too new to be searchable yet, lands here,
    // and GHL refuses a second contact with the same email or phone and names the one it
    // has. Book on that one. Until 2026-09-26 this failed the whole booking: a returning
    // FB lead got "Something went wrong" three times and had to be booked by hand.
    const duplicate = data?.meta;
    if (create.status === 400 && duplicate?.contactId) {
      console.warn(`[booking] Contact ${duplicate.contactId} already has this ${duplicate.matchingField || 'email or phone'} — booking on it`);
      const existing = await fetch(`${GHL_BASE}/contacts/${duplicate.contactId}`, { headers: GHL_HEADERS })
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => body?.contact)
        .catch(() => null);
      return existing?.id ? fillMissing(existing, { firstName, lastName, email, phone }) : { id: duplicate.contactId };
    }
    failure = `${create.status} — ${text.slice(0, 300)}`;
    console.warn(`[booking] Contact creation with ${Object.keys(fields).join(' + ') || 'the name only'} failed: ${failure}`);
  }
  throw new Error(`Contact creation failed: ${failure}`);
}

// meta-crm-sync tells site bookings apart by the "Strategy Call — " title, and sends
// Schedule itself for bookings made any other way. Change the title there too, or site
// bookings would reach Meta twice.
async function createAppointment({ contactId, slot, timezone, name, email, phone }) {
  const startTime = new Date(slot).toISOString();
  const endTime   = new Date(new Date(slot).getTime() + 30 * 60 * 1000).toISOString(); // +30 min
  const res = await fetch(`${GHL_BASE}/calendars/events/appointments`, {
    method: 'POST', headers: GHL_HEADERS,
    body: JSON.stringify({
      calendarId: CALENDAR_ID, locationId: LOCATION_ID,
      contactId,  startTime, endTime,
      timezone,   title: `Strategy Call — ${name || 'Unknown'}`,
      appointmentStatus: 'confirmed', email: email || undefined, phone: phone || undefined,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Appointment failed: ${res.status}`), { status: res.status, detail: text });
  }
  const data = await res.json();
  // GHL may return { id } or { appointment: { id } }
  return {
    id:             data.id ?? data.appointment?.id ?? data.appointmentId,
    assignedUserId: data.assignedUserId ?? data.appointment?.assignedUserId ?? null,
  };
}

// Round robin only assigns the APPOINTMENT. The contact keeps whoever the lead workflow
// gave it, and a few seconds after the booking (3.6–17s, measured on live bookings) a GHL
// workflow creates the pipeline card and copies the contact's owner onto it. Contact and
// card owners are decoupled in this account, so a later fix to the contact never reaches
// the card. The lead has to follow the closer here, before that card exists — otherwise
// both land on someone else, and a closer restricted to assigned data never sees them.
async function assignContact(contactId, userId) {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
    method: 'PUT', headers: GHL_HEADERS,
    body: JSON.stringify({ assignedTo: userId }),
  });
  if (!res.ok) throw new Error(`Contact assignment failed: ${res.status} — ${await res.text()}`);
}

// What the lead typed but the contact doesn't hold: an email or phone that wasn't usable,
// or one that differs from the details already on file. The closer sees it in a note.
function unsavedDetails(contact, typed) {
  const missed = [];
  const shown = (value) => value.replace(/[<>]/g, '');   // GHL notes can render HTML
  if (typed.email && String(contact.email || '').toLowerCase() !== typed.email.toLowerCase()) {
    missed.push(`email "${shown(typed.email)}"`);
  }
  const phone = normPhone(typed.phone);
  if (typed.phone && (!phone || String(contact.phone || '').replace(/\D/g, '') !== phone.replace(/\D/g, ''))) {
    missed.push(`phone "${shown(typed.phone)}"`);
  }
  return missed.length ? `Typed in the website booking form but not on this contact: ${missed.join(', ')}.` : null;
}

async function addNote(contactId, text) {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
    method: 'POST', headers: GHL_HEADERS,
    body: JSON.stringify({ body: text }),
  });
  if (!res.ok) throw new Error(`Note failed: ${res.status} — ${(await res.text()).slice(0, 200)}`);
}

// Reports the booking to Meta as Schedule. It goes from here rather than the browser
// because this only runs for a booking that really happened, an ad blocker can't strip
// it, and it has the booker's email and phone, which is what lets Meta tie the booking
// back to the ad click. The page fires the pixel's Schedule with the same event_id, so
// Meta counts it once. A page cached from before this existed sends no event_id and
// still tracks the booking itself, so nothing is sent for it here.
// The wait is capped so it can't push the response past the page's 10s abort.
async function trackBooking({ event, body, started, contactId, name, email, phone }) {
  const eventId = typeof body.event_id === 'string' && /^[\w-]{8,100}$/.test(body.event_id) ? body.event_id : null;
  if (!eventId) return;
  const pageUrl = [body.page_url, event.headers?.referer]
    .find((url) => typeof url === 'string' && url.startsWith(ALLOWED_ORIGIN)) || ALLOWED_ORIGIN;
  const { firstName, lastName } = splitName(name);
  const sent = await sendEvent({
    event_name: 'Schedule',
    event_id: eventId,
    event_source_url: pageUrl.slice(0, 1000),
    user_data: {
      ...requestContext(event.headers, pageUrl),
      ...hashedUserData({ em: email, ph: phone, fn: name ? firstName : null, ln: lastName, external_id: contactId }),
    },
    custom_data: { currency: 'USD', value: 0 },
  }, { timeoutMs: Math.min(2500, 8000 - (Date.now() - started)) });
  console.log(`[booking/capi] Schedule event_id=${eventId}`, sent.ok ? 'sent' : `not sent: ${sent.error || sent.status}`);
}

// ── Handler ───────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const started = Date.now();
  const origin = event.headers?.origin || event.headers?.Origin || '';

  // Block non-allowed origins (allow empty origin for same-site requests)
  if (origin && origin !== ALLOWED_ORIGIN) {
    return json(403, { error: 'Forbidden' }, origin);
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  // ── GET: fetch available slots ────────────────────────────────
  if (event.httpMethod === 'GET') {
    if (!TOKEN) return json(500, { error: 'Server misconfiguration' }, origin);
    const { startDate, endDate, timezone = 'America/Chicago' } = event.queryStringParameters || {};
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return json(400, { error: 'startDate param required (YYYY-MM-DD)' }, origin);
    }
    const end = endDate || startDate;
    try {
      const dates = await getSlots(startDate, end, timezone);
      // calendarId is echoed back purely so the calendar actually in use is verifiable
      // from outside. GHL_CALENDAR_ID in the Netlify env silently wins over the default
      // above, so a deploy that looks fine can still be booking the old calendar — and
      // slot data alone doesn't reveal which one answered. The frontend ignores this
      // field, and the id is already public in the widget embeds, so it leaks nothing.
      return {
        statusCode: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Connection': 'close' },
        body: JSON.stringify({ dates, calendarId: CALENDAR_ID }),
      };
    } catch (err) {
      const timedOut = err.name === 'AbortError';
      console.error('[booking/slots]', timedOut ? 'timeout' : err.message);
      return json(timedOut ? 504 : (err.status || 500), { error: timedOut ? 'timeout' : err.message }, origin);
    }
  }

  // ── POST: book appointment ────────────────────────────────────
  if (event.httpMethod === 'POST') {
    if (!TOKEN || !LOCATION_ID || !CALENDAR_ID) {
      return json(500, { error: 'Server misconfiguration' }, origin);
    }

    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON' }, origin); }

    const { slot, timezone = 'America/Chicago' } = body;
    const slotDate = new Date(slot);
    if (isNaN(slotDate.getTime()) || slotDate < new Date()) {
      return json(400, { error: 'invalid_slot', message: 'Invalid or past appointment slot.' }, origin);
    }

    // Nothing the lead types may stop a booking: a free time is all it takes. An email or
    // phone that doesn't look usable isn't sent to GHL as one, and anything typed that
    // doesn't end up on the contact reaches the closer in a note.
    const typed = {
      name:  String(body.name  ?? '').trim().slice(0, 100),
      email: String(body.email ?? '').trim().slice(0, 200),
      phone: String(body.phone ?? '').trim().slice(0, 50),
    };
    const name  = typed.name;
    const email = /^\S+@\S+\.\S+$/.test(typed.email) ? typed.email : null;
    const phone = normPhone(typed.phone);

    try {
      const contact = await upsertContact({ name, email, phone });
      const appointment = await createAppointment({ contactId: contact.id, slot, timezone, name, email, phone });
      // The booking has already succeeded at this point. A failed hand-off must not turn
      // it into an error page — the lead would retry and double-book — so log and move on.
      if (appointment.assignedUserId && appointment.assignedUserId !== contact.assignedTo) {
        await assignContact(contact.id, appointment.assignedUserId)
          .catch((err) => console.error('[booking/assign]', err.message));
      }
      const note = unsavedDetails(contact, typed);
      if (note) await addNote(contact.id, note).catch((err) => console.error('[booking/note]', err.message));
      await trackBooking({ event, body, started, contactId: contact.id, name, email, phone })
        .catch((err) => console.error('[booking/capi]', err.message));
      return json(200, { success: true, appointmentId: appointment.id }, origin);
    } catch (err) {
      console.error('[booking/book]', err.message, err.detail || '');
      const slotTaken = err.status === 409 || (err.detail || '').toLowerCase().includes('slot');
      if (slotTaken) return json(409, { error: 'slot_taken', message: 'That slot was just taken. Please pick another time.' }, origin);
      return json(500, { error: 'booking_failed', message: 'Something went wrong. Please try again.' }, origin);
    }
  }

  return json(405, { error: 'Method not allowed' }, origin);
};
