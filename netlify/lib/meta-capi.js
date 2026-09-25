// Shared Meta Conversions API sender for the Netlify functions: capi.js relays the
// page events the browser fires, booking.js sends Schedule for a confirmed booking.
// Lives outside netlify/functions/ so Netlify doesn't deploy it as a function.

const crypto = require('crypto');

const PIXEL_ID = '1109170245610201';
// This used v19.0, which Meta retired for the Marketing API (CAPI included) on
// 2025-02-04 — it only kept working because Meta now auto-upgrades expired calls.
const GRAPH_VERSION = 'v25.0';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// Meta's normalisation, applied before hashing. A value that isn't normalised the
// same way Meta normalises its own users hashes differently and never matches.
const NORMALISE = {
  em:          (v) => v.trim().toLowerCase(),
  ph:          (v) => v.replace(/\D/g, '').replace(/^0+/, ''),
  fn:          (v) => v.toLowerCase().replace(/[^\p{L}]/gu, ''),
  ln:          (v) => v.toLowerCase().replace(/[^\p{L}]/gu, ''),
  external_id: (v) => v.trim(),
};

// Raw contact details → the hashed user_data fields Meta expects.
function hashedUserData(details) {
  const out = {};
  for (const [key, normalise] of Object.entries(NORMALISE)) {
    const value = details[key] == null ? '' : normalise(String(details[key]));
    if (value) out[key] = [sha256(value)];
  }
  return out;
}

function parseCookies(header = '') {
  const cookies = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const name = part.slice(0, i).trim();
    try { cookies[name] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* skip malformed */ }
  }
  return cookies;
}

// What the request itself says about the visitor. _fbp and _fbc are the pixel's
// first-party cookies, and they arrive here because the site calls its functions
// same-origin. They are what ties a server event to the person and to the ad
// click; without them Meta has only IP and user agent to go on.
function requestContext(headers = {}, sourceUrl = '') {
  const cookies = parseCookies(headers.cookie);
  const ip = headers['x-nf-client-connection-ip']
    || (headers['x-forwarded-for'] || '').split(',')[0].trim()
    || headers['client-ip'];

  // No _fbc cookie (pixel blocked, or it hadn't loaded yet) but the page was
  // reached from an ad: build it from the fbclid in the URL, in Meta's format.
  let fbc = cookies._fbc;
  if (!fbc) {
    try {
      const fbclid = new URL(sourceUrl).searchParams.get('fbclid');
      if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    } catch { /* no usable URL */ }
  }

  const context = {
    client_ip_address: ip,
    client_user_agent: headers['user-agent'],
    fbp: cookies._fbp,
    fbc,
  };
  for (const key of Object.keys(context)) if (!context[key]) delete context[key];
  return context;
}

// Sends one event. Never throws: tracking must not be able to break the caller.
async function sendEvent(event, { timeoutMs = 3000, testEventCode } = {}) {
  const token = process.env.META_PIXEL_ACCESS_TOKEN;
  if (!token) {
    console.error('[meta-capi] META_PIXEL_ACCESS_TOKEN is not set');
    return { ok: false, status: 500, error: 'not_configured' };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The token goes in the body, not the query string, so it stays out of URL logs.
      body: JSON.stringify({
        data: [{ event_time: Math.floor(Date.now() / 1000), action_source: 'website', ...event }],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
        access_token: token,
      }),
      signal: ctrl.signal,
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) console.error(`[meta-capi] ${event.event_name} rejected (${res.status})`, JSON.stringify(result));
    return { ok: res.ok, status: res.status, result };
  } catch (err) {
    const error = err.name === 'AbortError' ? 'timeout' : err.message;
    console.error(`[meta-capi] ${event.event_name} failed:`, error);
    return { ok: false, status: 502, error };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { hashedUserData, requestContext, sendEvent };
