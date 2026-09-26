/**
 * Meta Conversions API (CAPI) relay for page events.
 * Netlify serverless function — runs server-side, keeps the access token secret.
 *
 * POST /.netlify/functions/capi
 * Body: { event_name, event_id, event_source_url, custom_data?, test_event_code? }
 *
 * The browser fires the same event through the pixel with the same event_id, so
 * Meta counts it once. The server copy is what survives ad blockers and iOS. Its
 * user_data is built here from the request (IP, user agent, _fbp/_fbc cookies),
 * never taken from the body, so nobody can post fake identities into the pixel.
 *
 * test_event_code also shows the event in Events Manager → Test events. Meta still
 * processes it like any other event (its docs: test events "are not dropped"), so
 * only send real events with it, never made-up ones.
 *
 * Bookings don't come through here: booking.js sends Schedule itself, with the
 * booker's hashed contact details.
 */

const { requestContext, sendEvent } = require('../lib/meta-capi');

const ALLOWED_ORIGIN = 'https://directsales.network';
// The events the site fires. Anything else is someone posting junk into the pixel.
// Schedule stays in so a page cached from before booking.js sent it still gets through.
const ALLOWED_EVENTS = new Set(['PageView', 'ViewContent', 'Lead', 'Contact', 'CompleteRegistration', 'Schedule']);
const CUSTOM_DATA_KEYS = ['content_name', 'content_category', 'currency', 'value'];

exports.handler = async (event) => {
  const origin = event.headers?.origin || '';
  // Block other sites (an empty origin is a same-site request or a server-side test)
  if (origin && origin !== ALLOWED_ORIGIN) {
    return respond(403, { ok: false, error: 'Forbidden' });
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return respond(405, { ok: false, error: 'Method Not Allowed' });
  }
  if (!process.env.META_PIXEL_ACCESS_TOKEN) {
    console.error('META_PIXEL_ACCESS_TOKEN env var is not set');
    return respond(500, { ok: false, error: 'Server misconfiguration' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return respond(400, { ok: false, error: 'Invalid JSON' });
  }

  const { event_name, event_id, event_source_url, custom_data, test_event_code } = body;
  if (!event_name || !event_id) {
    return respond(400, { ok: false, error: 'Missing event_name or event_id' });
  }
  if (!ALLOWED_EVENTS.has(event_name)) {
    return respond(400, { ok: false, error: `Unknown event_name: ${event_name}` });
  }
  if (typeof event_id !== 'string' || event_id.length > 100) {
    return respond(400, { ok: false, error: 'Invalid event_id' });
  }

  const sourceUrl = typeof event_source_url === 'string' && event_source_url.startsWith(ALLOWED_ORIGIN)
    ? event_source_url.slice(0, 1000)
    : ALLOWED_ORIGIN;

  const customData = {};
  for (const key of CUSTOM_DATA_KEYS) {
    const value = custom_data?.[key];
    if (typeof value === 'string' || typeof value === 'number') customData[key] = value;
  }

  const sent = await sendEvent({
    event_name,
    event_id,
    event_source_url: sourceUrl,
    user_data: requestContext(event.headers, sourceUrl),
    custom_data: customData,
  }, {
    testEventCode: typeof test_event_code === 'string' ? test_event_code.slice(0, 50) : undefined,
  });

  return respond(sent.ok ? 200 : 502, { ok: sent.ok, result: sent.result, error: sent.error });
};

function respond(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}
