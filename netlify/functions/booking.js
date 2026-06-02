// /.netlify/functions/booking
// GET  ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&timezone=...  → available slots
// POST { name, email, phone, slot, timezone }                  → create appointment

const GHL_BASE    = 'https://services.leadconnectorhq.com';
const TOKEN       = process.env.GHL_PRIVATE_TOKEN;   // set in Netlify env vars
const LOCATION_ID = process.env.GHL_LOCATION_ID  || 'NgduPjDbvABP3zFIqnt4';
const CALENDAR_ID = process.env.GHL_CALENDAR_ID  || 'DXh5uGCZVjFLPQNeKRZu';

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
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
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

async function upsertContact({ name, email, phone }) {
  const { firstName, lastName } = splitName(name);

  const search = await fetch(
    `${GHL_BASE}/contacts/?locationId=${LOCATION_ID}&query=${encodeURIComponent(phone)}`,
    { headers: GHL_HEADERS }
  );
  if (!search.ok) throw new Error(`Contact search failed: ${search.status}`);
  const { contacts } = await search.json();

  if (contacts?.length) {
    const existing = contacts[0];
    const patch = await fetch(`${GHL_BASE}/contacts/${existing.id}`, {
      method: 'PUT', headers: GHL_HEADERS,
      body: JSON.stringify({ locationId: LOCATION_ID, firstName, lastName, email, phone }),
    });
    if (!patch.ok) {
      console.warn(`[booking] Contact update failed: ${patch.status} — proceeding with existing contact ${existing.id}`);
      return existing;
    }
    const patchData = await patch.json();
    // GHL PUT may return { contact: {...} } or the contact object directly
    return patchData.contact ?? (patchData.id ? patchData : existing);
  }

  const create = await fetch(`${GHL_BASE}/contacts/`, {
    method: 'POST', headers: GHL_HEADERS,
    body: JSON.stringify({ locationId: LOCATION_ID, firstName, lastName, email, phone, source: 'Landing Page' }),
  });
  if (!create.ok) {
    const text = await create.text();
    throw new Error(`Contact creation failed: ${create.status} — ${text}`);
  }
  return (await create.json()).contact;
}

async function createAppointment({ contactId, slot, timezone, name, email, phone }) {
  const startTime = new Date(slot).toISOString();
  const endTime   = new Date(new Date(slot).getTime() + 30 * 60 * 1000).toISOString(); // +30 min
  const res = await fetch(`${GHL_BASE}/calendars/events/appointments`, {
    method: 'POST', headers: GHL_HEADERS,
    body: JSON.stringify({
      calendarId: CALENDAR_ID, locationId: LOCATION_ID,
      contactId,  startTime, endTime,
      timezone,   title: `Strategy Call — ${name}`,
      appointmentStatus: 'confirmed', email, phone,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Appointment failed: ${res.status}`), { status: res.status, detail: text });
  }
  const data = await res.json();
  // GHL may return { id } or { appointment: { id } }
  return { id: data.id ?? data.appointment?.id ?? data.appointmentId };
}

// ── Handler ───────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
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
      return {
        statusCode: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ dates }),
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

    const { name, email, slot, timezone = 'America/Chicago' } = body;
    const missing = ['name', 'email', 'phone', 'slot'].filter(k => !body[k]);
    if (missing.length) return json(400, { error: `Missing: ${missing.join(', ')}` }, origin);
    if (!/^\S+@\S+\.\S+$/.test(email)) return json(400, { error: 'Invalid email' }, origin);
    if (name.length > 100) return json(400, { error: 'Name too long' }, origin);

    const slotDate = new Date(slot);
    if (isNaN(slotDate.getTime()) || slotDate < new Date()) {
      return json(400, { error: 'invalid_slot', message: 'Invalid or past appointment slot.' }, origin);
    }

    const phone = normPhone(body.phone);
    if (!phone) return json(400, { error: 'invalid_phone', message: 'Please enter a valid phone number.' }, origin);

    try {
      const contact = await upsertContact({ name, email, phone });
      if (!contact?.id) throw new Error('Contact creation returned no ID');
      const appointment = await createAppointment({ contactId: contact.id, slot, timezone, name, email, phone });
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
