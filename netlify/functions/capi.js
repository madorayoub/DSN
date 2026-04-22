/**
 * Meta Conversions API (CAPI) Proxy
 * Netlify serverless function — runs server-side, keeps access token secure.
 *
 * POST /.netlify/functions/capi
 * Body: { event_name, event_id, event_source_url, user_data?, custom_data? }
 */

const PIXEL_ID = '1109170245610201';

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  const ACCESS_TOKEN = process.env.META_PIXEL_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    console.error('META_PIXEL_ACCESS_TOKEN env var is not set');
    return { statusCode: 500, headers: corsHeaders(), body: 'Server misconfiguration' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders(), body: 'Invalid JSON' };
  }

  const {
    event_name,
    event_id,
    event_source_url,
    user_data = {},
    custom_data = {},
  } = body;

  if (!event_name || !event_id) {
    return { statusCode: 400, headers: corsHeaders(), body: 'Missing event_name or event_id' };
  }

  // Extract real client IP (Netlify passes this via headers)
  const rawIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '';
  const clientIp = rawIp.split(',')[0].trim();
  const userAgent = event.headers['user-agent'] || '';

  const payload = {
    data: [
      {
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id,
        event_source_url: event_source_url || '',
        action_source: 'website',
        user_data: {
          client_ip_address: clientIp,
          client_user_agent: userAgent,
          ...user_data,
        },
        custom_data,
      },
    ],
  };

  try {
    const apiUrl = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    console.log(`CAPI [${event_name}] event_id=${event_id}`, JSON.stringify(result));

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: true, result }),
    };
  } catch (err) {
    console.error('CAPI fetch error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}
