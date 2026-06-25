'use strict';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  DSN CALL ORCHESTRATOR — Direct Sales Network ONLY                         ║
// ║  DO NOT confuse with Task Force Garage (TFG) — separate company, separate  ║
// ║  Railway project, separate Retell agents, separate GHL + Supabase.         ║
// ║                                                                              ║
// ║  DSN identifiers (this file):                                               ║
// ║    Railway project : dsn-call-orchestrator                                  ║
// ║    GHL location    : NgduPjDbvABP3zFIqnt4                                  ║
// ║    GHL calendar    : DXh5uGCZVjFLPQNeKRZu  (Free Consultation)             ║
// ║    Supabase project: kygcxlteriyctkzcpzvk                                   ║
// ║    Retell STL agent: agent_d7bffee08f5962e2a0c5789fcd  (Morgan — STL)     ║
// ║    Retell reminder : agent_1cf55115cf9e5477adb445c754  (Morgan — Reminder) ║
// ║    Retell STL flow : conversation_flow_9ef584e2f263                         ║
// ║    Retell rem flow : conversation_flow_68c0252a092d                         ║
// ║                                                                              ║
// ║  TFG identifiers (NEVER touch for DSN):                                    ║
// ║    Railway project : fb-lead-orchestrator / heartfelt-expression            ║
// ║    GHL location    : EK2GwCXGAzUxIDjqhQ9C                                  ║
// ║    GHL calendar    : VbGrFLei6jzy154UaZaP                                   ║
// ║    Supabase project: ewoftdovrrhcvliijyrl                                   ║
// ║    Retell agents   : multi-city (Charlotte/Nashville/Scottsdale/Seattle)    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const express   = require('express');
const rateLimit = require('express-rate-limit');
const crypto    = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.set('trust proxy', 1);

// Capture raw bytes for Retell webhook/tool routes (needed for HMAC signature verification).
// Must be registered BEFORE express.json() so it runs first.
function rawBodyMiddleware(req, res, next) {
  express.raw({ type: 'application/json', limit: '2mb' })(req, res, err => {
    if (err) return next(err);
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
      req.body    = JSON.parse(req.body.toString('utf8') || '{}');
    }
    next();
  });
}

app.use('/webhook/retell',              rawBodyMiddleware);
app.use('/retell/function/',            rawBodyMiddleware);
app.use(express.json({ limit: '2mb' }));

// ── Env ───────────────────────────────────────────────────────────────────────
const {
  PORT                         = '3000',
  NODE_ENV                     = 'development',
  WEBHOOK_SECRET,
  CRON_SECRET,
  ADMIN_PASSWORD,
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  GHL_API_KEY,
  GHL_LOCATION_ID              = 'NgduPjDbvABP3zFIqnt4',
  GHL_CALENDAR_ID              = 'DXh5uGCZVjFLPQNeKRZu',
  RETELL_API_KEY,
  RETELL_FROM_NUMBER,
  RETELL_AGENT_ID_SPEED_TO_LEAD,
  RETELL_AGENT_ID_REMINDER,
  RETELL_WEBHOOK_KEY,
  RETELL_SPEED_TO_LEAD_DELAY_MS = '90000',
  RETELL_DOUBLE_DIAL_DELAY_MS   = '45000',
  MAX_CALLS_PER_HOUR            = '300',
  MAX_REMINDER_CALLS_PER_HOUR   = '100',
  CLOSER_NAME                   = 'Brian',
  ADMIN_ALLOWED_ORIGIN          = '*',
} = process.env;

// ── Startup checks ────────────────────────────────────────────────────────────
// RETELL_FROM_NUMBER is intentionally excluded — server starts without it, calls just won't fire until it's set
const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'GHL_API_KEY', 'RETELL_API_KEY', 'WEBHOOK_SECRET', 'CRON_SECRET', 'RETELL_WEBHOOK_KEY'];
const missing  = REQUIRED.filter(k => !process.env[k]);
if (missing.length && NODE_ENV === 'production') {
  console.error(`[startup] FATAL: Missing required env vars in production: ${missing.join(', ')}`);
  process.exit(1);
} else if (missing.length) {
  console.warn(`[startup] ⚠️  Missing env vars: ${missing.join(', ')}`);
}
if (!RETELL_AGENT_ID_SPEED_TO_LEAD) console.warn('[startup] ⚠️  RETELL_AGENT_ID_SPEED_TO_LEAD not set — speed-to-lead calls disabled');
if (!RETELL_AGENT_ID_REMINDER)      console.warn('[startup] ⚠️  RETELL_AGENT_ID_REMINDER not set — reminder calls disabled');

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = (SUPABASE_URL && SUPABASE_SECRET_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
  : null;
if (!supabase) console.warn('[startup] ⚠️  Supabase not configured — all DB operations will fail');

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Live-call tool routes (/retell/function/*) get a much higher limit — they fire
// during active calls and a 429 here means Morgan fails to book mid-conversation.
const webhookLimiter  = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
const toolCallLimiter = rateLimit({ windowMs: 60_000, max: 600, standardHeaders: true, legacyHeaders: false });
// Admin dashboard polls a handful of read endpoints — 30/min is generous for a human
// or dashboard refresh, but bounds brute-force attempts against the password check.
const adminLimiter    = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use('/webhook/', webhookLimiter);
app.use('/retell/function/', toolCallLimiter);
app.use('/retell/',  webhookLimiter);
app.use('/admin/',   adminLimiter);

// ── CORS ──────────────────────────────────────────────────────────────────────
// /webhook, /cron, /retell routes are server-to-server (secret-header auth) — CORS
// is inert there since no browser enforces it. /admin/* is fetched from a browser,
// so its origin can be locked down via ADMIN_ALLOWED_ORIGIN (defaults to '*').
app.use((req, res, next) => {
  const origin = req.path.startsWith('/admin/') ? ADMIN_ALLOWED_ORIGIN : '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-secret, x-cron-secret, x-admin-password');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

function requireWebhookSecret(req, res, next) {
  if (!WEBHOOK_SECRET) {
    console.error('[auth] WEBHOOK_SECRET not set — rejecting request (fail closed)');
    return res.status(503).json({ error: 'Webhook auth not configured' });
  }
  const provided = Buffer.from(req.headers['x-webhook-secret'] || '');
  const expected = Buffer.from(WEBHOOK_SECRET);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

function requireCronSecret(req, res, next) {
  if (!CRON_SECRET) {
    console.error('[auth] CRON_SECRET not set — rejecting request (fail closed)');
    return res.status(503).json({ error: 'Cron auth not configured' });
  }
  const provided = Buffer.from(req.headers['x-cron-secret'] || '');
  const expected = Buffer.from(CRON_SECRET);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireAdminPassword(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin not configured' });
  const provided = Buffer.from(req.headers['x-admin-password'] || '');
  const expected = Buffer.from(ADMIN_PASSWORD);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Retell signed-webhook verification (enable by setting RETELL_WEBHOOK_KEY to the
// Retell dashboard API key that has the "webhook" badge).
// IMPORTANT: must use raw request body bytes, not re-serialized JSON.
// The retell webhook route and tool function routes use express.raw() via rawBodyMiddleware.
//
// Header format: "v={timestamp_ms},d={hex_hmac_sha256}" where digest =
// HMAC-SHA256(rawBody + timestamp, key) hex-encoded, with a 5-minute replay window.
// This matches Retell's own SDK algorithm exactly:
// https://github.com/RetellAI/retell-python-sdk/blob/main/src/retell/lib/webhook_auth.py
// https://docs.retellai.com/features/secure-webhook
const RETELL_SIGNATURE_TIMEOUT_MS = 5 * 60 * 1000;

function validateRetell(req, res, next) {
  if (!RETELL_WEBHOOK_KEY) {
    console.error('[auth] RETELL_WEBHOOK_KEY not set — rejecting request (fail closed)');
    return res.status(503).json({ error: 'Retell webhook auth not configured' });
  }
  const sig = req.headers['x-retell-signature'];
  if (!sig) return res.status(401).json({ error: 'Missing x-retell-signature' });
  const rawBody = req.rawBody;
  if (!rawBody) return res.status(401).json({ error: 'Missing raw body for signature verification' });

  const match = /^v=(\d+),d=(.+)$/.exec(sig);
  if (!match) return res.status(401).json({ error: 'Malformed Retell signature' });
  const [, timestamp, digest] = match;

  if (Math.abs(Date.now() - Number(timestamp)) > RETELL_SIGNATURE_TIMEOUT_MS) {
    return res.status(401).json({ error: 'Retell signature timestamp expired' });
  }

  try {
    const expected = crypto.createHmac('sha256', RETELL_WEBHOOK_KEY)
      .update(rawBody.toString('utf8') + timestamp)
      .digest('hex');
    const sigBuf = Buffer.from(digest,   'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return res.status(401).json({ error: 'Invalid Retell signature' });
    }
  } catch {
    return res.status(401).json({ error: 'Signature verification failed' });
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY — LOGGING & DEBUGGING
// ─────────────────────────────────────────────────────────────────────────────

// logEvent: immutable audit trail — use this for EVERY state transition.
// Primary debugging tool: SELECT * FROM lead_events WHERE lead_id=X ORDER BY created_at;
async function logEvent(eventType, payload = {}) {
  if (!supabase) return;
  const { error } = await supabase.from('lead_events').insert({
    event_type: eventType,
    payload,
    lead_id:        payload.lead_id        || null,
    appointment_id: payload.appointment_id || null,
  });
  if (error) console.error(`[logEvent] Failed to write ${eventType}:`, error.message);
}

// dlq: dead-letter queue — saves failed webhook payloads for later inspection.
// Check failed_webhook_events table when calls aren't firing or reminders are stuck.
async function dlq(source, payload, err) {
  console.error(`[dlq] ${source}: ${err?.message || err}`);
  if (!supabase) return;
  await supabase.from('failed_webhook_events').insert({
    source,
    payload,
    error: err?.message || String(err),
  }).then(({ error: dbErr }) => {
    if (dbErr) console.warn('[dlq] Could not persist to failed_webhook_events:', dbErr.message);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY — TIME / TIMEZONE
// ─────────────────────────────────────────────────────────────────────────────

// Complete NANP (US + Canada + Caribbean) area-code -> IANA timezone map.
// Used to resolve a lead's timezone from their phone before a call. Any code not
// listed falls back to America/New_York in phoneToTimezone().
const AREA_CODE_TZ = {
  '201': 'America/New_York',  '202': 'America/New_York',  '203': 'America/New_York',
  '204': 'America/Winnipeg',  '205': 'America/Chicago',  '206': 'America/Los_Angeles',
  '207': 'America/New_York',  '208': 'America/Boise',  '209': 'America/Los_Angeles',
  '210': 'America/Chicago',  '212': 'America/New_York',  '213': 'America/Los_Angeles',
  '214': 'America/Chicago',  '215': 'America/New_York',  '216': 'America/New_York',
  '217': 'America/Chicago',  '218': 'America/Chicago',  '219': 'America/Chicago',
  '220': 'America/New_York',  '223': 'America/New_York',  '224': 'America/Chicago',
  '225': 'America/Chicago',  '226': 'America/Toronto',  '228': 'America/Chicago',
  '229': 'America/New_York',  '231': 'America/Detroit',  '234': 'America/New_York',
  '236': 'America/Vancouver',  '239': 'America/New_York',  '240': 'America/New_York',
  '242': 'America/Nassau',  '246': 'America/Barbados',  '248': 'America/Detroit',
  '249': 'America/Toronto',  '250': 'America/Vancouver',  '251': 'America/Chicago',
  '252': 'America/New_York',  '253': 'America/Los_Angeles',  '254': 'America/Chicago',
  '256': 'America/Chicago',  '260': 'America/Indiana/Indianapolis',  '262': 'America/Chicago',
  '263': 'America/Toronto',  '264': 'America/Anguilla',  '267': 'America/New_York',
  '268': 'America/Antigua',  '269': 'America/Detroit',  '270': 'America/Chicago',
  '272': 'America/New_York',  '276': 'America/New_York',  '279': 'America/Los_Angeles',
  '281': 'America/Chicago',  '284': 'America/Tortola',  '289': 'America/Toronto',
  '301': 'America/New_York',  '302': 'America/New_York',  '303': 'America/Denver',
  '304': 'America/New_York',  '305': 'America/New_York',  '306': 'America/Regina',
  '307': 'America/Denver',  '308': 'America/Chicago',  '309': 'America/Chicago',
  '310': 'America/Los_Angeles',  '312': 'America/Chicago',  '313': 'America/Detroit',
  '314': 'America/Chicago',  '315': 'America/New_York',  '316': 'America/Chicago',
  '317': 'America/Indiana/Indianapolis',  '318': 'America/Chicago',  '319': 'America/Chicago',
  '320': 'America/Chicago',  '321': 'America/New_York',  '323': 'America/Los_Angeles',
  '325': 'America/Chicago',  '326': 'America/New_York',  '330': 'America/New_York',
  '331': 'America/Chicago',  '332': 'America/New_York',  '334': 'America/Chicago',
  '336': 'America/New_York',  '337': 'America/Chicago',  '339': 'America/New_York',
  '340': 'America/Puerto_Rico',  '341': 'America/Los_Angeles',  '343': 'America/Toronto',
  '345': 'America/Cayman',  '346': 'America/Chicago',  '347': 'America/New_York',
  '351': 'America/New_York',  '352': 'America/New_York',  '354': 'America/Toronto',
  '360': 'America/Los_Angeles',  '361': 'America/Chicago',  '364': 'America/Kentucky/Louisville',
  '365': 'America/Toronto',  '367': 'America/Toronto',  '368': 'America/Edmonton',
  '380': 'America/New_York',  '382': 'America/Toronto',  '385': 'America/Denver',
  '386': 'America/New_York',  '387': 'America/Toronto',  '401': 'America/New_York',
  '402': 'America/Chicago',  '403': 'America/Edmonton',  '404': 'America/New_York',
  '405': 'America/Chicago',  '406': 'America/Denver',  '407': 'America/New_York',
  '408': 'America/Los_Angeles',  '409': 'America/Chicago',  '410': 'America/New_York',
  '412': 'America/New_York',  '413': 'America/New_York',  '414': 'America/Chicago',
  '415': 'America/Los_Angeles',  '416': 'America/Toronto',  '417': 'America/Chicago',
  '418': 'America/Toronto',  '419': 'America/New_York',  '423': 'America/New_York',
  '424': 'America/Los_Angeles',  '425': 'America/Los_Angeles',  '428': 'America/Halifax',
  '430': 'America/Chicago',  '431': 'America/Winnipeg',  '432': 'America/Chicago',
  '434': 'America/New_York',  '435': 'America/Denver',  '437': 'America/Toronto',
  '438': 'America/Toronto',  '440': 'America/New_York',  '441': 'Atlantic/Bermuda',
  '442': 'America/Los_Angeles',  '443': 'America/New_York',  '448': 'America/Chicago',
  '450': 'America/Toronto',  '458': 'America/Los_Angeles',  '463': 'America/Indiana/Indianapolis',
  '468': 'America/Toronto',  '469': 'America/Chicago',  '470': 'America/New_York',
  '473': 'America/Grenada',  '474': 'America/Regina',  '475': 'America/New_York',
  '478': 'America/New_York',  '479': 'America/Chicago',  '480': 'America/Phoenix',
  '484': 'America/New_York',  '501': 'America/Chicago',  '502': 'America/Kentucky/Louisville',
  '503': 'America/Los_Angeles',  '504': 'America/Chicago',  '505': 'America/Denver',
  '506': 'America/Halifax',  '507': 'America/Chicago',  '508': 'America/New_York',
  '509': 'America/Los_Angeles',  '510': 'America/Los_Angeles',  '512': 'America/Chicago',
  '513': 'America/New_York',  '514': 'America/Toronto',  '515': 'America/Chicago',
  '516': 'America/New_York',  '517': 'America/Detroit',  '518': 'America/New_York',
  '519': 'America/Toronto',  '520': 'America/Phoenix',  '530': 'America/Los_Angeles',
  '531': 'America/Chicago',  '534': 'America/Chicago',  '539': 'America/Chicago',
  '540': 'America/New_York',  '541': 'America/Los_Angeles',  '548': 'America/Toronto',
  '551': 'America/New_York',  '557': 'America/Chicago',  '559': 'America/Los_Angeles',
  '561': 'America/New_York',  '562': 'America/Los_Angeles',  '563': 'America/Chicago',
  '564': 'America/Los_Angeles',  '567': 'America/New_York',  '570': 'America/New_York',
  '571': 'America/New_York',  '572': 'America/Chicago',  '573': 'America/Chicago',
  '574': 'America/Indiana/Indianapolis',  '575': 'America/Denver',  '579': 'America/Toronto',
  '580': 'America/Chicago',  '581': 'America/Toronto',  '584': 'America/Winnipeg',
  '585': 'America/New_York',  '586': 'America/Detroit',  '587': 'America/Edmonton',
  '601': 'America/Chicago',  '602': 'America/Phoenix',  '603': 'America/New_York',
  '604': 'America/Vancouver',  '605': 'America/Chicago',  '606': 'America/New_York',
  '607': 'America/New_York',  '608': 'America/Chicago',  '609': 'America/New_York',
  '610': 'America/New_York',  '612': 'America/Chicago',  '613': 'America/Toronto',
  '614': 'America/New_York',  '615': 'America/Chicago',  '616': 'America/Detroit',
  '617': 'America/New_York',  '618': 'America/Chicago',  '619': 'America/Los_Angeles',
  '620': 'America/Chicago',  '623': 'America/Phoenix',  '626': 'America/Los_Angeles',
  '628': 'America/Los_Angeles',  '629': 'America/Chicago',  '630': 'America/Chicago',
  '631': 'America/New_York',  '636': 'America/Chicago',  '639': 'America/Regina',
  '640': 'America/New_York',  '641': 'America/Chicago',  '646': 'America/New_York',
  '647': 'America/Toronto',  '649': 'America/Grand_Turk',  '650': 'America/Los_Angeles',
  '651': 'America/Chicago',  '656': 'America/New_York',  '657': 'America/Los_Angeles',
  '658': 'America/Jamaica',  '659': 'America/Chicago',  '660': 'America/Chicago',
  '661': 'America/Los_Angeles',  '662': 'America/Chicago',  '664': 'America/Montserrat',
  '667': 'America/New_York',  '669': 'America/Los_Angeles',  '670': 'Pacific/Saipan',
  '671': 'Pacific/Guam',  '672': 'America/Vancouver',  '678': 'America/New_York',
  '680': 'America/New_York',  '681': 'America/New_York',  '682': 'America/Chicago',
  '683': 'America/Toronto',  '684': 'Pacific/Pago_Pago',  '689': 'America/New_York',
  '701': 'America/Chicago',  '702': 'America/Los_Angeles',  '703': 'America/New_York',
  '704': 'America/New_York',  '705': 'America/Toronto',  '706': 'America/New_York',
  '707': 'America/Los_Angeles',  '708': 'America/Chicago',  '709': 'America/St_Johns',
  '712': 'America/Chicago',  '713': 'America/Chicago',  '714': 'America/Los_Angeles',
  '715': 'America/Chicago',  '716': 'America/New_York',  '717': 'America/New_York',
  '718': 'America/New_York',  '719': 'America/Denver',  '720': 'America/Denver',
  '721': 'America/Lower_Princes',  '724': 'America/New_York',  '725': 'America/Los_Angeles',
  '726': 'America/Chicago',  '727': 'America/New_York',  '730': 'America/Chicago',
  '731': 'America/Chicago',  '732': 'America/New_York',  '734': 'America/Detroit',
  '737': 'America/Chicago',  '740': 'America/New_York',  '742': 'America/Toronto',
  '743': 'America/New_York',  '747': 'America/Los_Angeles',  '753': 'America/Toronto',
  '754': 'America/New_York',  '757': 'America/New_York',  '758': 'America/St_Lucia',
  '760': 'America/Los_Angeles',  '762': 'America/New_York',  '763': 'America/Chicago',
  '765': 'America/Indiana/Indianapolis',  '767': 'America/Dominica',  '769': 'America/Chicago',
  '770': 'America/New_York',  '772': 'America/New_York',  '773': 'America/Chicago',
  '774': 'America/New_York',  '775': 'America/Los_Angeles',  '778': 'America/Vancouver',
  '779': 'America/Chicago',  '780': 'America/Edmonton',  '781': 'America/New_York',
  '782': 'America/Halifax',  '784': 'America/St_Vincent',  '785': 'America/Chicago',
  '786': 'America/New_York',  '787': 'America/Puerto_Rico',  '801': 'America/Denver',
  '802': 'America/New_York',  '803': 'America/New_York',  '804': 'America/New_York',
  '805': 'America/Los_Angeles',  '806': 'America/Chicago',  '807': 'America/Toronto',
  '808': 'Pacific/Honolulu',  '809': 'America/Santo_Domingo',  '810': 'America/Detroit',
  '812': 'America/Indiana/Indianapolis',  '813': 'America/New_York',  '814': 'America/New_York',
  '815': 'America/Chicago',  '816': 'America/Chicago',  '817': 'America/Chicago',
  '818': 'America/Los_Angeles',  '819': 'America/Toronto',  '820': 'America/Los_Angeles',
  '825': 'America/Edmonton',  '826': 'America/New_York',  '828': 'America/New_York',
  '829': 'America/Santo_Domingo',  '830': 'America/Chicago',  '831': 'America/Los_Angeles',
  '832': 'America/Chicago',  '838': 'America/New_York',  '839': 'America/New_York',
  '840': 'America/Los_Angeles',  '843': 'America/New_York',  '845': 'America/New_York',
  '847': 'America/Chicago',  '848': 'America/New_York',  '849': 'America/Santo_Domingo',
  '850': 'America/Chicago',  '854': 'America/New_York',  '856': 'America/New_York',
  '857': 'America/New_York',  '858': 'America/Los_Angeles',  '859': 'America/Kentucky/Louisville',
  '860': 'America/New_York',  '862': 'America/New_York',  '863': 'America/New_York',
  '864': 'America/New_York',  '865': 'America/New_York',  '867': 'America/Edmonton',
  '868': 'America/Port_of_Spain',  '869': 'America/St_Kitts',  '870': 'America/Chicago',
  '872': 'America/Chicago',  '873': 'America/Toronto',  '876': 'America/Jamaica',
  '878': 'America/New_York',  '879': 'America/St_Johns',  '901': 'America/Chicago',
  '902': 'America/Halifax',  '903': 'America/Chicago',  '904': 'America/New_York',
  '905': 'America/Toronto',  '906': 'America/Detroit',  '907': 'America/Anchorage',
  '908': 'America/New_York',  '909': 'America/Los_Angeles',  '910': 'America/New_York',
  '912': 'America/New_York',  '913': 'America/Chicago',  '914': 'America/New_York',
  '915': 'America/Denver',  '916': 'America/Los_Angeles',  '917': 'America/New_York',
  '918': 'America/Chicago',  '919': 'America/New_York',  '920': 'America/Chicago',
  '925': 'America/Los_Angeles',  '927': 'America/New_York',  '928': 'America/Phoenix',
  '929': 'America/New_York',  '930': 'America/Indiana/Indianapolis',  '931': 'America/Chicago',
  '932': 'America/New_York',  '934': 'America/New_York',  '936': 'America/Chicago',
  '937': 'America/New_York',  '938': 'America/Chicago',  '939': 'America/Puerto_Rico',
  '940': 'America/Chicago',  '941': 'America/New_York',  '945': 'America/Chicago',
  '947': 'America/Detroit',  '948': 'America/New_York',  '949': 'America/Los_Angeles',
  '951': 'America/Los_Angeles',  '952': 'America/Chicago',  '954': 'America/New_York',
  '956': 'America/Chicago',  '959': 'America/New_York',  '970': 'America/Denver',
  '971': 'America/Los_Angeles',  '972': 'America/Chicago',  '973': 'America/New_York',
  '975': 'America/Chicago',  '978': 'America/New_York',  '979': 'America/Chicago',
  '980': 'America/New_York',  '984': 'America/New_York',  '985': 'America/Chicago',
  '986': 'America/Boise',  '989': 'America/Detroit'
};

function phoneToTimezone(phone) {
  const digits   = (phone || '').replace(/\D/g, '');
  const national = digits.startsWith('1') ? digits.slice(1) : digits;
  return AREA_CODE_TZ[national.slice(0, 3)] || 'America/New_York';
}

function toE164(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  if (digits.length >= 9 && digits.length <= 15) return `+${digits}`;
  return null;
}

// Calling-window policy (in the called party's LOCAL time). TCPA permits 8am–9pm
// any day; this is intentionally tighter per business preference:
//   - Hours: 8am up to (not including) 6pm
//   - Days:  Monday–Saturday. Sunday is fully blocked.
// All values are env-overridable so the window can be tuned without a code change.
const CALL_WINDOW_START_HOUR = parseInt(process.env.CALL_WINDOW_START_HOUR ?? '8', 10);   // inclusive, 24h
const CALL_WINDOW_END_HOUR   = parseInt(process.env.CALL_WINDOW_END_HOUR   ?? '18', 10);  // exclusive, 24h (18 = 6pm)
const BLOCKED_WEEKDAYS       = (process.env.CALL_BLOCKED_WEEKDAYS ?? 'Sunday')
  .split(',').map(s => s.trim()).filter(Boolean);

function isCallableHourDay(hour, weekday) {
  if (BLOCKED_WEEKDAYS.includes(weekday)) return false;
  return hour >= CALL_WINDOW_START_HOUR && hour < CALL_WINDOW_END_HOUR;
}

// How many ms until it is legal to call (window above, in the lead's local tz).
// Returns 0 if already within calling hours; positive ms to wait otherwise.
// Uses hour-stepping via Intl — DST-safe without requiring an external library.
function msUntilCallable(fromDate, tz) {
  const safeZone = tz || 'America/New_York';
  const target   = fromDate instanceof Date ? fromDate : new Date(fromDate);

  function localHourAndWeekday(d) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: safeZone, hour: 'numeric', weekday: 'long', hour12: false,
      }).formatToParts(d);
      const hour    = parseInt(parts.find(p => p.type === 'hour')?.value ?? 'NaN', 10);
      const weekday = parts.find(p => p.type === 'weekday')?.value ?? '';
      return { hour, weekday };
    } catch {
      return { hour: 10, weekday: 'Monday' }; // safe default: mid-morning weekday
    }
  }

  const { hour, weekday } = localHourAndWeekday(target);
  if (isNaN(hour)) return 0; // parse failure: allow the call rather than block forever

  if (isCallableHourDay(hour, weekday)) return 0;

  // Step forward 1 hour at a time until we land inside calling hours.
  // This correctly handles DST transitions (no manual offset arithmetic).
  for (let h = 1; h <= 72; h++) {
    const candidate = new Date(target.getTime() + h * 3_600_000);
    const { hour: cH, weekday: cW } = localHourAndWeekday(candidate);
    if (isCallableHourDay(cH, cW)) {
      return candidate.getTime() - target.getTime();
    }
  }

  return 72 * 3_600_000; // absolute fallback: 72h
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY — DISTRIBUTED CRON LOCK
// ─────────────────────────────────────────────────────────────────────────────

// Prevents two Railway instances running the same cron job simultaneously.
// Pattern: upsert a row with locked_until = now+intervalMs, only if the current lock is expired.
async function acquireCronLock(jobName, intervalMs = 5 * 60_000) {
  if (!supabase) return false;
  const lockUntil = new Date(Date.now() + intervalMs).toISOString();
  const { data, error } = await supabase.rpc('try_acquire_cron_lock', {
    p_job_name:    jobName,
    p_lock_until:  lockUntil,
  });
  if (error) {
    // RPC failed — skip this tick rather than risk two instances running simultaneously
    console.error(`[cron-lock] try_acquire_cron_lock RPC failed: ${error.message} — skipping tick`);
    return false;
  }
  return data === true;
}

// Releases a held lock immediately (sets locked_until = now()) so the next instance/tick
// doesn't have to wait out the full TTL. Best-effort — if this fails, the lock just
// expires naturally via its TTL.
// Uses a direct table update rather than the release_cron_lock RPC to avoid PostgREST
// schema-cache issues with void-returning functions (the RPC exists but may not be
// visible to PostgREST after certain migrations).
async function releaseCronLock(jobName) {
  if (!supabase) return;
  const { error } = await supabase.from('cron_locks')
    .update({ locked_until: new Date().toISOString() })
    .eq('job_name', jobName);
  if (error) {
    console.error(`[cron-lock] release_cron_lock RPC failed for ${jobName}: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GHL API HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const GHL_BASE = 'https://services.leadconnectorhq.com';

// retries: number of extra attempts on 429/5xx (with exponential backoff: 500ms, 1000ms, ...)
async function ghlRequest(method, path, body = null, { timeoutMs = 15_000, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 500 * attempt));
    let res;
    try {
      res = await fetch(`${GHL_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json',
          Version: '2021-07-28',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      lastErr = err;
      continue; // network/timeout error — retry
    }
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      lastErr = new Error(`GHL ${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
      continue; // retryable — try again
    }
    throw new Error(`GHL ${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  throw lastErr || new Error(`GHL ${method} ${path} failed after ${retries + 1} attempts`);
}

async function ghlGetContact(contactId) {
  const data = await ghlRequest('GET', `/contacts/${contactId}`);
  return data.contact || data;
}

// List a contact's appointments across all calendars. Used to check whether a
// brand-new lead already has a booking (e.g. from another funnel or a human rep)
// before we fire a cold "are you interested?" speed-to-lead call.
async function ghlGetContactAppointments(contactId) {
  const data = await ghlRequest('GET', `/contacts/${contactId}/appointments`);
  return data.events || data.appointments || (Array.isArray(data) ? data : []);
}

// Sync the resolved timezone onto the GHL contact record after an AI-driven booking.
// Self-booked leads get contact.timezone set automatically by GHL's booking widget;
// AI bookings don't, so the appointment-reminder agent (which reads contact.timezone
// via the appointment-booked webhook) would otherwise see a stale/empty value.
async function ghlUpdateContactTimezone(contactId, timezone) {
  return ghlRequest('PUT', `/contacts/${contactId}`, { timezone }, GHL_TOOL_CALL_OPTS);
}

// Tool-call paths (Retell custom functions must respond <3s) use a shorter timeout
// and no retries so a slow/down GHL doesn't stall a live call.
// 2,500ms keeps us under Retell's 3s expectation even accounting for network overhead.
const GHL_TOOL_CALL_OPTS = { timeoutMs: 2_500, retries: 0 };

// Fetch available slots for the GHL calendar. Returns array of ISO strings.
async function ghlGetSlots(startDate, endDate, timezone) {
  const tz  = encodeURIComponent(timezone || 'America/New_York');
  const url = `/calendars/${GHL_CALENDAR_ID}/free-slots?startDate=${startDate}&endDate=${endDate}&timezone=${tz}`;
  const data = await ghlRequest('GET', url, null, GHL_TOOL_CALL_OPTS);
  // Response: { _dates_: { "2025-01-20": { slots: [ "2025-01-20T09:00:00-05:00", ... ] } } }
  const grouped = data._dates_ || data.dates || data;
  const slots = [];
  for (const day of Object.values(grouped)) {
    if (Array.isArray(day?.slots)) slots.push(...day.slots);
  }
  return slots;
}

// Keep only top-of-the-hour slots (11:00, 1:00, 3:00 …) — the agent offers clean
// o'clock times, never :30 or :15. Minute is computed in the lead's local timezone
// so half-hour-offset zones (e.g. Newfoundland) are handled correctly. Falls back to
// the unfiltered list if filtering would leave nothing, so we never lose all slots.
function topOfHourSlots(slots, timezone) {
  const onHour = slots.filter(iso => {
    const parts = new Intl.DateTimeFormat('en-US', { minute: '2-digit', timeZone: timezone || 'America/New_York' })
      .formatToParts(new Date(iso));
    return parseInt(parts.find(p => p.type === 'minute')?.value ?? 'NaN', 10) === 0;
  });
  return onHour.length ? onHour : slots;
}

// In-memory slot cache for check-availability (key: timezone+date range, TTL: 90s).
// Prevents double GHL round-trips when pick_time re-fetches slots check_slots already loaded.
const _slotCache = new Map();
async function ghlGetSlotsWithCache(startDate, endDate, timezone) {
  // Bucket epoch-ms timestamps to the hour so the two calls in one booking
  // (check_slots then pick_time, seconds apart) still share the cache entry.
  const key = `${timezone}|${Math.floor(startDate / 3_600_000)}|${Math.floor(endDate / 3_600_000)}`;
  const hit = _slotCache.get(key);
  if (hit && Date.now() - hit.ts < 90_000) return hit.slots;
  const slots = await ghlGetSlots(startDate, endDate, timezone);
  _slotCache.set(key, { slots, ts: Date.now() });
  // Prune stale entries to cap memory usage
  if (_slotCache.size > 200) {
    const cutoff = Date.now() - 120_000;
    for (const [k, v] of _slotCache) if (v.ts < cutoff) _slotCache.delete(k);
  }
  return slots;
}

// Pre-fetch open slots BEFORE a call so the agent already has them in context as
// dynamic variables — no mid-call check_availability round-trip (latency) and nothing
// for the model to hallucinate. On any failure returns blank vars so the flow falls
// back to the live check_availability tool.
async function buildSlotVars(timezone) {
  try {
    const startMs = Date.now();
    const endMs   = startMs + 5 * 24 * 60 * 60 * 1000;
    const slots   = await ghlGetSlotsWithCache(startMs, endMs, timezone);
    if (!slots.length) {
      return { has_availability: 'false', available_slots_formatted: '', available_slots_iso: '' };
    }
    const top = topOfHourSlots(slots, timezone).slice(0, 8);
    // Group by day for a speakable summary, e.g.
    // "Monday, June 22: 2:00 PM, 3:30 PM | Tuesday, June 23: 10:00 AM, 12:00 PM"
    const byDay = new Map();
    for (const iso of top) {
      const d    = new Date(iso);
      const day  = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone });
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone });
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(time);
    }
    const formatted = [...byDay.entries()].map(([day, times]) => `${day}: ${times.join(', ')}`).join(' | ');
    return {
      has_availability:          'true',
      available_slots_formatted: formatted,    // speakable, lead's timezone
      available_slots_iso:       top.join(','), // exact ISO strings for book_appointment
    };
  } catch (err) {
    console.error('[retell/prefetch-slots] error:', err.message);
    return { has_availability: '', available_slots_formatted: '', available_slots_iso: '' };
  }
}

// Book a Zoom call with Brian in GHL calendar.
// INTENTIONAL: book a 30-min slot even though the agent tells the lead "15 minutes" —
// the extra buffer is for Brian. Do NOT "fix" this to 15 to match the script.
async function ghlBookAppointment({ contactId, name, email, phone, slotIso, timezone }) {
  const start = new Date(slotIso);
  const end   = new Date(start.getTime() + 30 * 60 * 1000);
  const body = {
    calendarId:  GHL_CALENDAR_ID,
    locationId:  GHL_LOCATION_ID,
    contactId,
    startTime:   start.toISOString(),
    endTime:     end.toISOString(),
    title:       `DSN Zoom Call with Brian — ${name || 'Lead'}`,
    appointmentStatus: 'confirmed',
    address:     'Zoom',
    ignoreDateRange:   false,
    toNotify:    true,
  };
  const data = await ghlRequest('POST', '/calendars/events/appointments', body, GHL_TOOL_CALL_OPTS);
  return data.appointment || data;
}

// Cancel an existing GHL appointment (used when rescheduling via the reminder agent).
async function ghlCancelAppointment(ghlAppointmentId) {
  return ghlRequest('PUT', `/calendars/events/appointments/${ghlAppointmentId}`, { appointmentStatus: 'cancelled' }, GHL_TOOL_CALL_OPTS);
}

// ─────────────────────────────────────────────────────────────────────────────
// RETELL API HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function triggerRetellCall({ lead, agentId, callType, dynamicVars = {}, appointmentId = null }) {
  if (!RETELL_API_KEY || !agentId) {
    console.warn(`[retell] Cannot fire call — RETELL_API_KEY or agentId missing (type: ${callType})`);
    return null;
  }

  const phone = toE164(lead.phone);
  if (!phone) {
    console.warn(`[retell] Invalid phone for lead ${lead.id}: ${lead.phone}`);
    await supabase?.from('leads').update({ status: 'invalid_phone', followup_paused: true, next_followup_at: null }).eq('id', lead.id);
    await dlq('triggerRetellCall/invalid-phone', { lead_id: lead.id, phone: lead.phone, call_type: callType }, new Error(`Invalid phone: ${lead.phone}`));
    return null;
  }

  // Resolve the lead's timezone (caller usually passes it; fall back to area code)
  // and pre-fetch open calendar slots so the agent has them in-context at call start.
  const tz = dynamicVars.timezone || phoneToTimezone(lead.phone) || 'America/New_York';
  const slotVars = await buildSlotVars(tz);

  const payload = {
    override_agent_id: agentId,   // Retell's create-phone-call ignores `agent_id`; must use override_agent_id
    from_number: RETELL_FROM_NUMBER,
    to_number:   phone,
    retell_llm_dynamic_variables: {
      customer_name:       lead.name  || '',
      customer_first_name: (lead.name || '').trim().split(/\s+/)[0] || 'there',
      customer_email:  lead.email || '',
      lead_id:         String(lead.id),
      call_type:       callType,
      callback_number: RETELL_FROM_NUMBER || '',
      ...dynamicVars,
      ...slotVars,
    },
    metadata: {
      lead_id:        lead.id,
      ghl_contact_id: lead.ghl_contact_id,
      call_type:      callType,
      appointment_id: appointmentId,
    },
  };

  const res = await fetch('https://api.retellai.com/v2/create-phone-call', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RETELL_API_KEY}` },
    body:    JSON.stringify(payload),
    signal:  AbortSignal.timeout(15_000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Retell API error ${res.status}: ${JSON.stringify(data)}`);

  console.log(`[retell] ${callType} call to ${phone} — call_id: ${data.call_id}`);
  await logEvent('retell_call_initiated', { lead_id: lead.id, call_id: data.call_id, call_type: callType, to: phone, appointment_id: appointmentId });

  // Seed call_logs row immediately so the webhook can update it on call_ended/analyzed
  if (supabase && data.call_id) {
    const { error: logErr } = await supabase.from('call_logs').insert({
      lead_id:        lead.id,
      appointment_id: appointmentId,
      call_type:      callType,
      retell_call_id: data.call_id,
      call_status:    'initiated',
    });
    if (logErr) {
      console.error(`[retell] Failed to seed call_logs for ${data.call_id}:`, logErr.message);
      await dlq('triggerRetellCall/call_logs', { lead_id: lead.id, call_id: data.call_id }, logErr);
    }
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAD HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function findOrCreateLead({ ghlContactId, name, phone, email, timezone, source }) {
  if (!supabase) throw new Error('Supabase not configured');

  // Try to find by GHL contact ID first (idempotent)
  const { data: existing } = await supabase
    .from('leads').select('*').eq('ghl_contact_id', ghlContactId).maybeSingle();
  if (existing) return { lead: existing, created: false };

  // Dedupe by phone — duplicate form submissions can create separate GHL contacts
  // for the same person. Reuse the active lead so the attempt cap and double-dial
  // state apply once per person, not once per duplicate contact.
  const e164ForDedupe = toE164(phone);
  if (e164ForDedupe) {
    const { data: byPhone } = await supabase
      .from('leads').select('*').eq('phone', e164ForDedupe)
      .in('status', ['new', 'calling'])
      .maybeSingle();
    if (byPhone) {
      console.log(`[lead] Duplicate phone ${e164ForDedupe} — reusing lead ${byPhone.id} (ghl_contact_id ${byPhone.ghl_contact_id}) instead of creating new for ${ghlContactId}`);
      return { lead: byPhone, created: false };
    }
  }

  // If the phone doesn't resolve to a valid E.164 number, don't let this lead enter the
  // speed-to-lead pipeline at all — mark it invalid_phone up front (same status
  // triggerRetellCall falls back to mid-pipeline) rather than relying on every caller
  // to notice next_followup_at never advances.
  const { data: created, error } = await supabase
    .from('leads').insert({
      ghl_contact_id: ghlContactId,
      name,
      phone,
      email,
      timezone: timezone || null,
      source:   source   || null,
      status:          e164ForDedupe ? 'new' : 'invalid_phone',
      followup_paused: !e164ForDedupe,
    }).select().single();

  if (error) throw new Error(`Could not create lead: ${error.message}`);
  if (!e164ForDedupe) console.warn(`[lead] Created lead ${created.id} with invalid/missing phone (${phone}) — status=invalid_phone`);
  console.log(`[lead] Created lead ${created.id} for GHL contact ${ghlContactId}`);
  await logEvent('lead_created', { lead_id: created.id, ghl_contact_id: ghlContactId, source });
  return { lead: created, created: true };
}

// Check if a phone number is on the DNC list
async function isOnDNC(phone) {
  if (!supabase || !phone) return false;
  const e164 = toE164(phone);
  const { data } = await supabase.from('dnc').select('phone').eq('phone', e164).maybeSingle();
  return !!data;
}

// Retry DNC upserts that failed in handleCallOutcome — a verbal opt-out where the lead
// row got marked 'dnc' but the shared dnc table insert failed (DLQ'd). Without this,
// the same phone number could re-enter as a new lead and get called again.
async function retryFailedDncUpserts() {
  if (!supabase) return;

  const { data: failed, error } = await supabase
    .from('failed_webhook_events')
    .select('id, payload')
    .eq('source', 'handleCallOutcome/dnc')
    .eq('resolved', false)
    .limit(20);

  if (error || !failed?.length) return;

  for (const entry of failed) {
    const phone = entry.payload?.phone;
    if (!phone) continue;

    const { error: dncErr } = await supabase.from('dnc')
      .upsert({ phone, reason: 'verbal opt-out', added_by: 'agent' }, { onConflict: 'phone' });

    if (!dncErr) {
      await supabase.from('failed_webhook_events').update({ resolved: true }).eq('id', entry.id);
      console.log(`[dnc-retry] Resolved DNC upsert for ${phone}`);
    } else {
      console.error(`[dnc-retry] Still failing for ${phone}:`, dncErr.message);
    }
  }
}

// Retry GHL appointment cancels that failed during a reschedule (retell/book-appointment).
// That cancel is deliberately fire-and-forget — awaiting it would add a full GHL round-trip
// to a live call's response time — but Supabase still marks the old appointment 'cancelled'
// immediately regardless of GHL's outcome. Without this retry, a transient GHL error there
// leaves the old slot live in GHL forever while Supabase already thinks it's gone.
async function retryFailedGhlCancels() {
  if (!supabase) return;

  const { data: failed, error } = await supabase
    .from('failed_webhook_events')
    .select('id, payload')
    .eq('source', 'retell/book-appointment/cancel-old')
    .eq('resolved', false)
    .limit(20);

  if (error || !failed?.length) return;

  for (const entry of failed) {
    const ghlAppointmentId = entry.payload?.ghl_appointment_id;
    if (!ghlAppointmentId) continue;

    try {
      await ghlCancelAppointment(ghlAppointmentId);
      await supabase.from('failed_webhook_events').update({ resolved: true }).eq('id', entry.id);
      console.log(`[ghl-cancel-retry] Resolved cancel for ${ghlAppointmentId}`);
    } catch (err) {
      console.error(`[ghl-cancel-retry] Still failing for ${ghlAppointmentId}:`, err.message);
    }
  }
}

// Circuit breaker: count Retell calls placed in the last hour, optionally filtered to
// specific call types. Each cron checks its own call-type budget so a speed-to-lead
// volume spike can't starve appointment reminders/confirmations, and vice versa.
async function getRecentCallCount(sinceMs = 60 * 60_000, callTypes = null) {
  if (!supabase) return 0;
  const since = new Date(Date.now() - sinceMs).toISOString();
  let query = supabase
    .from('call_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);
  if (callTypes) query = query.in('call_type', callTypes);
  const { count, error } = await query;
  if (error) {
    console.error('[circuit-breaker] Could not count recent calls:', error.message);
    return 0; // fail open — don't block calling on a count-query error
  }
  return count || 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Upsert appointment and generate (or replace) reminder rows.
async function upsertAppointment({ ghlAppointmentId, leadId, startAt, endAt, timezone, zoomLink }) {
  if (!supabase) throw new Error('Supabase not configured');

  const { data: appt, error } = await supabase
    .from('appointments')
    .upsert({
      ghl_appointment_id: ghlAppointmentId,
      lead_id:   leadId,
      start_at:  new Date(startAt).toISOString(),
      end_at:    endAt ? new Date(endAt).toISOString() : null,
      timezone:  timezone || 'America/New_York',
      zoom_link: zoomLink || null,
      status:    'booked',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'ghl_appointment_id' })
    .select().single();

  if (error) throw new Error(`Could not upsert appointment: ${error.message}`);

  // Delete old reminders and regenerate. Handles two cases:
  // (a) Reschedule: same appointment, new time — sent reminders must also be deleted so a fresh
  //     reminder fires at the new T-24h/T-1h rather than silently skipping (status='sent').
  // (b) Concurrent calls (book-appointment tool + GHL appointment-created webhook racing on the
  //     same appointment): both DELETE (second is a no-op), then upsert with ignoreDuplicates so
  //     the second INSERT does ON CONFLICT DO NOTHING instead of throwing a unique violation.
  await supabase.from('appointment_reminders').delete().eq('appointment_id', appt.id);

  const start   = new Date(startAt);
  const h24     = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const h1      = new Date(start.getTime() - 60 * 60 * 1000);
  const now     = new Date();

  const reminders = [];
  if (h24 > now) reminders.push({ appointment_id: appt.id, reminder_type: 'reminder_24h', trigger_at: h24.toISOString() });
  if (h1  > now) reminders.push({ appointment_id: appt.id, reminder_type: 'reminder_1h',  trigger_at: h1.toISOString() });

  if (reminders.length) {
    const { error: remErr } = await supabase.from('appointment_reminders')
      .upsert(reminders, { onConflict: 'appointment_id,reminder_type', ignoreDuplicates: true });
    if (remErr) console.warn('[appt] Could not upsert reminders:', remErr.message);
    else console.log(`[appt] Upserted ${reminders.length} reminder(s) for appt ${appt.id} (start: ${start.toISOString()})`);
  } else {
    console.log(`[appt] No reminders created — meeting too soon (< 1h from now)`);
  }

  await logEvent('appointment_upserted', { lead_id: leadId, appointment_id: appt.id, start_at: startAt });
  return appt;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK — POST /webhook/new-lead
// Triggered by GHL workflow when a new contact is created (form/opt-in).
// GHL workflow config: Trigger = "Contact Created" | Action = Webhook POST to this URL
// Payload expected: { contact_id, first_name, last_name, phone, email, timezone?, source? }
// GHL's "standard data" only reliably includes contact_id/first_name at the top level —
// last_name/phone/email/timezone/source must be added as Custom Data on the webhook action,
// which GHL nests under body.customData. Read both locations.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/webhook/new-lead', requireWebhookSecret, async (req, res) => {
  res.json({ received: true }); // Respond immediately to avoid GHL timeout
  const body = req.body;
  const cd   = body.customData || {};
  console.log('[webhook/new-lead] received:', JSON.stringify({ contact_id: body.contact_id, phone: body.phone || cd.phone }));

  try {
    const contact_id = body.contact_id;
    const first_name = body.first_name ?? cd.first_name;
    const last_name  = body.last_name  ?? cd.last_name;
    const phone      = body.phone      ?? cd.phone;
    const email      = body.email      ?? cd.email;
    const source     = body.source     ?? cd.source;

    if (!contact_id || !phone) {
      await dlq('webhook/new-lead', body, new Error('Missing contact_id or phone'));
      return;
    }

    // Validate phone — no point calling if it's garbage
    const e164 = toE164(phone);
    if (!e164) {
      await dlq('webhook/new-lead', body, new Error(`Invalid phone: ${phone}`));
      return;
    }

    // DNC check
    if (await isOnDNC(e164)) {
      console.log(`[webhook/new-lead] ${e164} is on DNC — skipping`);
      await logEvent('lead_dnc_skipped', { ghl_contact_id: contact_id, phone: e164 });
      return;
    }

    const name = [first_name, last_name].filter(Boolean).join(' ').trim()
      || cd.Full_name || cd.full_name || body.full_name || 'there';
    // Initial-call (speed-to-lead) agent: a brand-new lead has no booking history, so
    // GHL's contact.timezone isn't a reliable signal yet — derive from phone area code.
    const tz = phoneToTimezone(e164);

    const { lead, created } = await findOrCreateLead({
      ghlContactId: contact_id,
      name, phone: e164, email, timezone: tz, source,
    });

    if (!created) {
      // Lead already exists — could be a duplicate webhook; check if already called
      if (['calling', 'booked', 'exhausted', 'dnc'].includes(lead.status)) {
        console.log(`[webhook/new-lead] Lead ${lead.id} already in status ${lead.status} — skipping`);
        return;
      }
    }

    // A contact may already have an upcoming appointment booked outside this flow
    // (another funnel, or a human rep) with no matching `appointments` row yet —
    // skip the cold speed-to-lead call and treat them as already booked.
    // Fail-open: if GHL is unreachable or the lookup errors, proceed as normal.
    try {
      const ghlAppts = await ghlGetContactAppointments(contact_id);
      const upcoming = ghlAppts
        .filter(a => a.appointmentStatus !== 'cancelled' && new Date(a.startTime) > new Date())
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];

      if (upcoming) {
        console.log(`[webhook/new-lead] Lead ${lead.id} already has a GHL appointment (${upcoming.id}) — skipping speed-to-lead`);
        await supabase?.from('leads').update({
          status: 'booked', followup_paused: true, next_followup_at: null,
        }).eq('id', lead.id);
        await upsertAppointment({
          ghlAppointmentId: upcoming.id,
          leadId:   lead.id,
          startAt:  upcoming.startTime,
          endAt:    upcoming.endTime,
          timezone: tz,
          zoomLink: upcoming.address,
        });
        await logEvent('appointment_booked', { lead_id: lead.id, appointment_id: upcoming.id, source: 'pre_existing' });
        return;
      }
    } catch (err) {
      console.warn(`[webhook/new-lead] Could not check existing GHL appointments for ${contact_id}: ${err.message} — proceeding with speed-to-lead`);
    }

    // Schedule call: delay RETELL_SPEED_TO_LEAD_DELAY_MS then check calling hours
    scheduleSpeedToLeadCall(lead).catch(err =>
      dlq('speed-to-lead-schedule', { lead_id: lead.id }, err)
    );
  } catch (err) {
    await dlq('webhook/new-lead', body, err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SPEED-TO-LEAD CALL SCHEDULER
// ─────────────────────────────────────────────────────────────────────────────

async function scheduleSpeedToLeadCall(lead) {
  // Guard: don't transition to 'calling' if we can't actually make the call
  if (!RETELL_AGENT_ID_SPEED_TO_LEAD) {
    console.warn(`[speed-to-lead] RETELL_AGENT_ID_SPEED_TO_LEAD not set — not scheduling lead ${lead.id}`);
    return;
  }
  if (!RETELL_FROM_NUMBER) {
    console.warn(`[speed-to-lead] RETELL_FROM_NUMBER not set — not scheduling lead ${lead.id}`);
    return;
  }

  const baseDelayMs = parseInt(RETELL_SPEED_TO_LEAD_DELAY_MS, 10) || 90_000;
  const tz          = lead.timezone || phoneToTimezone(lead.phone);
  const callAt      = new Date(Date.now() + baseDelayMs);
  const extraDelay  = msUntilCallable(callAt, tz);
  const totalDelay  = baseDelayMs + extraDelay;

  const scheduledAt = new Date(Date.now() + totalDelay);
  const deferred    = extraDelay > 0;

  // Always seed next_followup_at in DB so the cron safety net catches server restarts.
  // Atomic claim: only proceed if this lead is still 'new' — prevents duplicate GHL
  // webhook deliveries from each scheduling their own setTimeout for attempt 1.
  const { data: claimed, error: claimErr } = await supabase?.from('leads').update({
    status:          'calling',
    followup_step:   1,
    next_followup_at: scheduledAt.toISOString(),
  }).eq('id', lead.id).eq('status', 'new').select('id') ?? {};

  if (claimErr || !claimed?.length) {
    console.log(`[speed-to-lead] Lead ${lead.id} already claimed (not 'new') — skipping duplicate schedule`);
    return;
  }

  await logEvent('speed_to_lead_scheduled', { lead_id: lead.id, scheduled_at: scheduledAt.toISOString(), deferred });

  if (deferred) {
    console.log(`[speed-to-lead] Lead ${lead.id} deferred to ${scheduledAt.toISOString()} (outside calling hours) — cron will fire`);
    return;
  }

  console.log(`[speed-to-lead] Lead ${lead.id} call in ${Math.round(totalDelay / 1000)}s`);
  setTimeout(() => fireSpeedToLeadCall(lead.id).catch(err =>
    dlq('speed-to-lead-timeout', { lead_id: lead.id }, err)
  ), totalDelay);
}

async function fireSpeedToLeadCall(leadId) {
  const { data: lead, error: fetchErr } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (fetchErr) {
    if (fetchErr.code === 'PGRST116') return console.warn(`[speed-to-lead] Lead ${leadId} not found`);
    throw new Error(`DB error fetching lead ${leadId}: ${fetchErr.message}`);
  }
  if (!lead) return console.warn(`[speed-to-lead] Lead ${leadId} not found`);
  if (lead.followup_paused || ['booked', 'not_interested', 'dnc', 'exhausted'].includes(lead.status)) {
    return console.log(`[speed-to-lead] Skipping lead ${leadId} — ${lead.status}`);
  }

  // DNC check — phone may have been added to the DNC list since this attempt was scheduled
  if (await isOnDNC(lead.phone)) {
    console.log(`[speed-to-lead] Lead ${leadId} phone is on DNC — pausing`);
    await supabase.from('leads').update({ status: 'dnc', followup_paused: true, next_followup_at: null }).eq('id', leadId);
    return;
  }

  // Atomic claim: setTimeout (from scheduleSpeedToLeadCall/double-dial) and the cron safety
  // net can both target this attempt. Whichever runs first clears next_followup_at; the
  // other sees it already null and skips, preventing a duplicate dial.
  const { data: claimed, error: claimErr } = await supabase.from('leads')
    .update({ next_followup_at: null })
    .eq('id', leadId)
    .eq('status', 'calling')
    .not('next_followup_at', 'is', null)
    .select('id');

  if (claimErr || !claimed?.length) {
    return console.log(`[speed-to-lead] Lead ${leadId} already claimed for this attempt — skipping`);
  }

  const tz = lead.timezone || phoneToTimezone(lead.phone);

  try {
    await triggerRetellCall({
      lead,
      agentId:   RETELL_AGENT_ID_SPEED_TO_LEAD,
      callType:  'speed_to_lead',
      dynamicVars: {
        call_attempt:    String(lead.followup_step || 1),
        previous_outcome: lead.last_call_outcome || '',
        source:          lead.source || 'web form',
        timezone:        tz || '',
      },
    });
  } catch (err) {
    // Claim above already cleared next_followup_at — if the call itself fails to
    // fire (e.g. Retell API down), restore it so the cron safety net retries this
    // lead instead of leaving it stuck in status='calling' forever.
    await supabase.from('leads').update({ next_followup_at: new Date(Date.now() + 5 * 60_000).toISOString() }).eq('id', leadId);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK — POST /webhook/appointment-booked
// Triggered by GHL when a lead books a strategy call (via calendar widget or agent).
// GHL workflow config: Trigger = "Appointment Created" → Webhook POST
// Payload: { contact_id, appointment_id, start_time (ISO), end_time (ISO), timezone, zoom_link? }
// ─────────────────────────────────────────────────────────────────────────────
app.post('/webhook/appointment-booked', requireWebhookSecret, async (req, res) => {
  res.json({ received: true });
  const body = req.body;
  const cd   = body.customData || {};
  console.log('[webhook/appointment-booked]', JSON.stringify({ contact_id: body.contact_id, appointment_id: body.appointment_id ?? cd.appointment_id, start: body.start_time ?? cd.start_time }));

  try {
    const contact_id     = body.contact_id ?? cd.contact_id;
    const appointment_id = body.appointment_id ?? cd.appointment_id;
    const start_time     = body.start_time     ?? cd.start_time;
    const end_time       = body.end_time       ?? cd.end_time;
    const zoom_link      = body.zoom_link      ?? cd.zoom_link;
    if (!contact_id || !appointment_id || !start_time) {
      await dlq('webhook/appointment-booked', body, new Error('Missing required fields'));
      return;
    }

    // Always fetch the GHL contact. For self-booked leads (30–80% of cases) GHL's booking
    // widget captures and stores the contact's local timezone — this is the most accurate source.
    // The webhook payload timezone may reflect the calendar's timezone, not the lead's.
    let ghlContact = null;
    try {
      ghlContact = await ghlGetContact(contact_id);
    } catch (err) {
      console.warn(`[appointment-booked] GHL contact fetch failed for ${contact_id}: ${err.message} — falling back to webhook payload`);
    }

    // Timezone priority chain:
    // 1. contact.timezone from GHL — set by booking widget from lead's browser locale (best for self-booked)
    // 2. timezone from webhook payload — GHL may include the appointment's timezone
    // 3. area-code lookup from phone — fallback when no GHL timezone available
    // 4. America/New_York — final fallback
    const contactPhone = toE164(ghlContact?.phone || ghlContact?.mobilePhone || body.phone || cd.phone);
    const rawTz        = ghlContact?.timezone || body.timezone || cd.timezone;
    const resolvedTz   = (rawTz && rawTz.includes('/')) ? rawTz
      : (contactPhone ? phoneToTimezone(contactPhone) : null)
      || 'America/New_York';

    const { lead } = await findOrCreateLead({
      ghlContactId: contact_id,
      name:  ghlContact
        ? [ghlContact.firstName, ghlContact.lastName].filter(Boolean).join(' ')
        : ([body.first_name, body.last_name].filter(Boolean).join(' ') || cd.Full_name || cd.full_name || body.full_name || undefined),
      phone: contactPhone,
      email: ghlContact?.email || body.email || cd.email,
      timezone: resolvedTz,
    });

    // Back-fill lead.timezone if the record was created without one (e.g. came through new-lead webhook earlier)
    if (resolvedTz && !lead.timezone) {
      await supabase?.from('leads').update({ timezone: resolvedTz }).eq('id', lead.id);
    }

    // Pause speed-to-lead follow-up now that they've booked
    await supabase?.from('leads').update({
      status:          'booked',
      followup_paused: true,
    }).eq('id', lead.id);

    await upsertAppointment({
      ghlAppointmentId: appointment_id,
      leadId:   lead.id,
      startAt:  start_time,
      endAt:    end_time,
      timezone: resolvedTz,
      zoomLink: zoom_link,
    });

    await logEvent('appointment_booked', { lead_id: lead.id, appointment_id, start_time, timezone: resolvedTz });
    console.log(`[appointment-booked] Lead ${lead.id}, appt ${appointment_id} at ${start_time} tz=${resolvedTz} — reminders scheduled`);
  } catch (err) {
    await dlq('webhook/appointment-booked', body, err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK — POST /webhook/appointment-cancelled
// Triggered by GHL when an appointment is cancelled or rescheduled.
// GHL workflow config: Trigger = "Appointment Status Changed (Cancelled)" → Webhook POST
// ─────────────────────────────────────────────────────────────────────────────
app.post('/webhook/appointment-cancelled', requireWebhookSecret, async (req, res) => {
  res.json({ received: true });
  const body = req.body;
  const cd   = body.customData || {};
  const appointment_id = body.appointment_id ?? cd.appointment_id;
  console.log(`[webhook/appointment-cancelled] appt: ${appointment_id}`);

  try {
    if (!appointment_id) {
      await dlq('webhook/appointment-cancelled', body, new Error('Missing appointment_id'));
      return;
    }

    const { data: appt } = await supabase?.from('appointments')
      .select('id, lead_id').eq('ghl_appointment_id', appointment_id).maybeSingle();

    if (!appt) {
      await dlq('webhook/appointment-cancelled', body, new Error(`Appointment ${appointment_id} not found in DB`));
      return;
    }

    // Cancel the appointment and delete all pending reminders
    await supabase?.from('appointments').update({
      status:       'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }).eq('id', appt.id);

    await supabase?.from('appointment_reminders')
      .update({ status: 'skipped' })
      .eq('appointment_id', appt.id)
      .eq('status', 'pending');

    // Resume follow-up for speed-to-lead if they were booked but now cancelled.
    // Reset followup_step and double_dialed so the lead restarts the full STL cadence
    // (attempt 1 → double-dial → 10min → 30min → 4h → 24h) rather than resuming mid-sequence
    // at whatever step they were at when they first booked, which could exhaust them in one call.
    await supabase?.from('leads').update({
      status:           'calling',
      followup_paused:  false,
      followup_step:    1,
      double_dialed:    false,
      next_followup_at: new Date().toISOString(),
    }).eq('id', appt.lead_id).eq('status', 'booked');

    await logEvent('appointment_cancelled', { lead_id: appt.lead_id, appointment_id });
  } catch (err) {
    await dlq('webhook/appointment-cancelled', body, err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK — POST /webhook/opt-out
// Triggered by GHL when a contact is marked DNC / opts out (e.g. SMS "STOP" reply,
// or a manual "Do Not Call" tag/workflow on the contact).
// GHL workflow config: Trigger = "Tag Added" (tag = "DNC" / "do-not-call") → Webhook POST
// ─────────────────────────────────────────────────────────────────────────────
app.post('/webhook/opt-out', requireWebhookSecret, async (req, res) => {
  res.json({ received: true });
  const body = req.body;
  const cd   = body.customData || {};
  const contact_id = body.contact_id ?? cd.contact_id;
  const phone       = toE164(body.phone ?? cd.phone);
  console.log(`[webhook/opt-out] contact: ${contact_id}, phone: ${phone}`);

  try {
    if (!phone) {
      await dlq('webhook/opt-out', body, new Error('Missing phone'));
      return;
    }

    await supabase?.from('dnc')
      .upsert({ phone, reason: 'ghl_opt_out', added_by: 'ghl_webhook' }, { onConflict: 'phone' });

    const { data: lead } = await supabase?.from('leads')
      .update({ status: 'dnc', followup_paused: true, next_followup_at: null })
      .eq('phone', phone)
      .select('id').maybeSingle() ?? {};

    // Cancel any pending appointments and skip their reminders — an opted-out
    // lead shouldn't get an appointment-confirmation/reminder call either.
    if (lead?.id) {
      const { data: appts } = await supabase?.from('appointments')
        .select('id, ghl_appointment_id')
        .eq('lead_id', lead.id)
        .eq('status', 'booked') ?? {};

      for (const appt of appts || []) {
        if (appt.ghl_appointment_id) {
          try {
            await ghlCancelAppointment(appt.ghl_appointment_id);
          } catch (err) {
            console.error(`[webhook/opt-out] Failed to cancel GHL appointment ${appt.ghl_appointment_id}:`, err.message);
            await dlq('webhook/opt-out/cancel-ghl', { lead_id: lead.id, appointment_id: appt.id, ghl_appointment_id: appt.ghl_appointment_id }, err);
          }
        }

        await supabase?.from('appointments').update({
          status:       'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        }).eq('id', appt.id);

        await supabase?.from('appointment_reminders')
          .update({ status: 'skipped' })
          .eq('appointment_id', appt.id)
          .eq('status', 'pending');
      }
    }

    await logEvent('lead_dnc_opt_out', { ghl_contact_id: contact_id, phone, lead_id: lead?.id });
  } catch (err) {
    await dlq('webhook/opt-out', body, err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK — POST /webhook/retell
// Retell post-call webhook. Fires for call_started, call_ended, call_analyzed.
// Configure in Retell agent settings: webhook_url = https://<your-app>/webhook/retell
// ─────────────────────────────────────────────────────────────────────────────
app.post('/webhook/retell', validateRetell, async (req, res) => {
  res.json({ received: true });
  const { event, call } = req.body;
  if (!call) return;

  const { call_id, call_status, disconnection_reason, metadata = {}, transcript, call_analysis } = call;
  const { lead_id, call_type, appointment_id } = metadata;

  console.log(`[webhook/retell] event: ${event} | call_id: ${call_id} | lead_id: ${lead_id} | type: ${call_type}`);

  // Common identifying fields for call_logs — included in every upsert below so a
  // missing seed row (triggerRetellCall's insert failed/DLQ'd) self-heals instead of
  // silently updating 0 rows.
  const callLogIdentity = {
    retell_call_id: call_id,
    lead_id:        lead_id || null,
    appointment_id: appointment_id || null,
    call_type:      call_type || 'unknown',
  };

  try {
    if (event === 'call_started') {
      await supabase?.from('call_logs').upsert({
        ...callLogIdentity,
        call_status: 'ongoing',
        started_at:  new Date().toISOString(),
      }, { onConflict: 'retell_call_id' });
      return;
    }

    if (event === 'call_ended') {
      await supabase?.from('call_logs').upsert({
        ...callLogIdentity,
        call_status:          call_status,
        disconnection_reason: disconnection_reason,
        ended_at:             new Date().toISOString(),
      }, { onConflict: 'retell_call_id' });

      // Double-dial logic — only for speed_to_lead, attempt 1, not yet double-dialed
      if (call_type === 'speed_to_lead' && lead_id) {
        await handleSpeedToLeadCallEnded({ leadId: lead_id, callId: call_id, disconnectionReason: disconnection_reason });
      }

      // 1-hour reminder double-dial — redial once if the lead didn't pick up the 1h reminder.
      // The 24h reminder is intentionally one-shot (no redial).
      if (call_type === 'reminder_1h' && appointment_id) {
        await handleReminderCallEnded({ appointmentId: appointment_id, reminderType: call_type, callId: call_id, disconnectionReason: disconnection_reason });
      }
      return;
    }

    if (event === 'call_analyzed') {
      const summary  = call_analysis?.call_summary || '';
      const outcome  = extractOutcome(call_analysis, transcript, disconnection_reason);

      await supabase?.from('call_logs').upsert({
        ...callLogIdentity,
        call_status:  call_status,
        transcript:   formatTranscript(call?.transcript_object || []),
        summary,
        outcome,
        raw_payload:  call,
      }, { onConflict: 'retell_call_id' });

      if (lead_id) await handleCallOutcome({ leadId: lead_id, callId: call_id, callType: call_type, outcome, appointmentId: appointment_id });
      return;
    }

    // call_analyzed events from older firmware sometimes come as separate events
    console.log(`[webhook/retell] Ignoring non-terminal event: ${event}`);
  } catch (err) {
    await dlq('webhook/retell', req.body, err);
  }
});

// Retell disconnection_reason values that mean a real human actually engaged on the
// call — the ONLY cases where we must NOT double-dial. Everything else (no-answer, busy,
// voicemail, IVR, dial/telephony failures, capacity/billing/abuse, LLM/Retell errors, or
// any NEW reason Retell adds later) means we never reached a person → eligible for redial.
// Allowlist (not denylist) so unknown/new failure reasons fail safe toward "try again".
// Enum verified against https://docs.retellai.com/reliability/debug-call-disconnect (34 values).
const HUMAN_ANSWERED_REASONS = new Set([
  'user_hangup',          // user talked, then hung up
  'agent_hangup',         // agent ended after a conversation
  'call_transfer',        // agent transferred a live call
  'transfer_bridged',     // transfer completed, legs bridged
  'transfer_cancelled',   // a live call existed before the transfer was aborted
  'call_take_over',       // a human took over the call
  'inactivity',           // answered, then went silent past end_call_after_silence_ms
  'max_duration_reached', // answered and ran to the max-duration cap
  'manual_stopped',       // operator/API stopped the call — don't auto-redial
]);

// After a speed-to-lead call ends without reaching a human: schedule the double-dial.
async function handleSpeedToLeadCallEnded({ leadId, callId, disconnectionReason }) {
  const didAnswer = HUMAN_ANSWERED_REASONS.has(disconnectionReason);
  if (didAnswer) return; // A human engaged — don't double-dial

  const { data: lead } = await supabase.from('leads')
    .select('status, followup_step, followup_paused, double_dialed, timezone, phone')
    .eq('id', leadId).single();

  if (!lead || lead.followup_paused || lead.double_dialed || (lead.followup_step ?? 1) > 1) return;

  const doubleDialDelay = parseInt(RETELL_DOUBLE_DIAL_DELAY_MS, 10) || 45_000;
  const callableTz      = lead.timezone || phoneToTimezone(lead.phone);
  const extraMs         = msUntilCallable(new Date(Date.now() + doubleDialDelay), callableTz);
  const totalDelay      = doubleDialDelay + extraMs;

  // Atomic guard: only update if double_dialed is still false.
  // Must check count (not error) — Supabase returns error=null with 0 rows if condition not met.
  const { data: claimed, error } = await supabase.from('leads').update({
    double_dialed:   true,
    next_followup_at: new Date(Date.now() + totalDelay + 3 * 60_000).toISOString(),
  }).eq('id', leadId).eq('double_dialed', false).select('id');

  if (error || !claimed?.length) {
    console.log(`[double-dial] Race condition avoided for lead ${leadId} — already claimed or error: ${error?.message}`);
    return;
  }

  console.log(`[double-dial] Lead ${leadId}: redial in ${Math.round(totalDelay / 1000)}s`);
  await logEvent('retell_double_dial_scheduled', { lead_id: leadId, delay_ms: totalDelay });

  setTimeout(() => fireSpeedToLeadCall(leadId).catch(err =>
    dlq('double-dial', { lead_id: leadId }, err)
  ), totalDelay);
}

// After a 1-hour reminder call ends without reaching a human: redial it once.
// Mirrors the speed-to-lead double-dial. Only reminder_1h reaches here (see webhook branch);
// the 24h reminder stays one-shot. The redial fires triggerRetellCall directly — the reminder
// row is already 'sent', so it must NOT go back through the cron (which only reads 'pending').
async function handleReminderCallEnded({ appointmentId, reminderType, callId, disconnectionReason }) {
  const didAnswer = HUMAN_ANSWERED_REASONS.has(disconnectionReason);
  if (didAnswer) return; // A human engaged — don't redial

  const { data: reminder } = await supabase.from('appointment_reminders')
    .select('id, status, redialed, appointments(*, leads(*))')
    .eq('appointment_id', appointmentId).eq('reminder_type', reminderType).maybeSingle();

  if (!reminder || reminder.redialed || reminder.status !== 'sent') return;
  const appt = reminder.appointments;
  const lead = appt?.leads;
  if (!appt || !lead || appt.status === 'cancelled') return;

  const redialDelay = parseInt(RETELL_DOUBLE_DIAL_DELAY_MS, 10) || 45_000;
  const reminderTz  = appt.timezone || lead.timezone || phoneToTimezone(lead.phone) || 'America/New_York';
  const extraMs     = msUntilCallable(new Date(Date.now() + redialDelay), reminderTz);
  const totalDelay  = redialDelay + extraMs;

  // Atomic guard: only schedule if redialed is still false (defends against duplicate webhook deliveries).
  const { data: claimed, error } = await supabase.from('appointment_reminders')
    .update({ redialed: true })
    .eq('id', reminder.id).eq('redialed', false).select('id');

  if (error || !claimed?.length) {
    console.log(`[reminder-redial] Race avoided for reminder ${reminder.id} — already claimed or error: ${error?.message}`);
    return;
  }

  console.log(`[reminder-redial] Appt ${appt.id} (reminder_1h): redial in ${Math.round(totalDelay / 1000)}s`);
  await logEvent('retell_reminder_redial_scheduled', { appointment_id: appt.id, reminder_type: reminderType, delay_ms: totalDelay });

  setTimeout(() => {
    (async () => {
      const startLocal = new Date(appt.start_at).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', timeZone: reminderTz, timeZoneName: 'short',
      });
      const startDate = new Date(appt.start_at).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: reminderTz,
      });
      const callData = await triggerRetellCall({
        lead,
        agentId:       RETELL_AGENT_ID_REMINDER,
        callType:      reminderType,
        appointmentId: appt.id,
        dynamicVars: {
          appointment_time:  startLocal,
          appointment_date:  startDate,
          appointment_iso:   appt.start_at,
          timezone:          appt.timezone,
          zoom_link:         appt.zoom_link || '',
          reminder_type:     reminderType,
          closer_name:       CLOSER_NAME,
        },
      });
      if (callData?.call_id) {
        await supabase.from('appointment_reminders').update({ retell_call_id: callData.call_id }).eq('id', reminder.id);
      }
    })().catch(err => dlq('reminder-redial', { appointment_id: appt.id, reminder_type: reminderType }, err));
  }, totalDelay);
}

// After call_analyzed: update lead status based on what happened.
async function handleCallOutcome({ leadId, callId, callType, outcome, appointmentId }) {
  const leadUpdate = { last_call_outcome: outcome };

  if (outcome === 'booked') {
    leadUpdate.status         = 'booked';
    leadUpdate.followup_paused = true;
  } else if (outcome === 'not_interested') {
    leadUpdate.status         = 'not_interested';
    leadUpdate.followup_paused = true;
  } else if (outcome === 'dnc' || outcome === 'opt_out') {
    leadUpdate.status         = 'dnc';
    leadUpdate.followup_paused = true;
    // Add to DNC table — critical: failure here means they could be called again
    const { data: dncLead } = await supabase.from('leads').select('phone').eq('id', leadId).single();
    if (dncLead?.phone) {
      const { error: dncErr } = await supabase.from('dnc')
        .upsert({ phone: dncLead.phone, reason: 'verbal opt-out', added_by: 'agent' }, { onConflict: 'phone' });
      if (dncErr) {
        console.error(`[call-outcome] CRITICAL: Failed to add ${dncLead.phone} to DNC:`, dncErr.message);
        await dlq('handleCallOutcome/dnc', { lead_id: leadId, phone: dncLead.phone }, dncErr);
      }
    }
  } else if (outcome === 'callback_requested') {
    // Lead asked to be called back — reschedule 1 hour out, keep in calling rotation.
    // Advance followup_step so repeated callbacks count toward the exhaustion cap (step > 6).
    const { data: cbLead } = await supabase.from('leads').select('followup_step').eq('id', leadId).single();
    const cbStep = (cbLead?.followup_step || 1) + 1;
    if (cbStep > 6) {
      leadUpdate.status          = 'exhausted';
      leadUpdate.followup_paused = true;
    } else {
      leadUpdate.status           = 'calling';
      leadUpdate.followup_paused  = false;
      leadUpdate.followup_step    = cbStep;
      leadUpdate.next_followup_at = new Date(Date.now() + 60 * 60_000).toISOString();
    }
  } else if (outcome === 'rescheduled') {
    // Reminder flow rescheduled — new appointment already booked by book-appointment endpoint
    leadUpdate.status          = 'booked';
    leadUpdate.followup_paused = true;
  } else if (outcome === 'confirmed') {
    // Reminder confirmed attendance — no status change needed
  } else if (outcome === 'cancelled') {
    // Reminder flow: lead wants to cancel just this appointment (not full DNC).
    // Mirror /webhook/appointment-cancelled: cancel in GHL + Supabase, resume follow-up.
    if (appointmentId) {
      const { data: appt } = await supabase?.from('appointments').select('ghl_appointment_id').eq('id', appointmentId).maybeSingle();
      if (appt?.ghl_appointment_id) {
        try {
          await ghlCancelAppointment(appt.ghl_appointment_id);
        } catch (err) {
          console.error(`[call-outcome] Failed to cancel GHL appointment ${appt.ghl_appointment_id}:`, err.message);
          await dlq('handleCallOutcome/cancel-ghl', { appointment_id: appointmentId, ghl_appointment_id: appt.ghl_appointment_id }, err);
        }
      }

      await supabase?.from('appointments').update({
        status:       'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      }).eq('id', appointmentId);

      await supabase?.from('appointment_reminders')
        .update({ status: 'skipped' })
        .eq('appointment_id', appointmentId)
        .eq('status', 'pending');
    }

    leadUpdate.status          = 'calling';
    leadUpdate.followup_paused = false;
  } else if (callType === 'speed_to_lead') {
    // Advance the follow-up step so cron picks up the next attempt.
    // Covers no_answer/voicemail as well as any unrecognized/completed outcome —
    // without this catch-all, a lead could get stuck in status='calling' forever.
    const { data: lead } = await supabase.from('leads').select('followup_step, double_dialed, next_followup_at').eq('id', leadId).single();
    const step = (lead?.followup_step || 1) + 1;
    leadUpdate.followup_step = step;
    // Follow-up schedule: attempt 1 → 2 (45s, handled by double-dial), attempt 3 at T+10min, attempt 4 at T+30min, attempt 5 at T+4h, attempt 6 at T+24h
    const FOLLOWUP_DELAYS = [0, 0, 45_000, 10 * 60_000, 30 * 60_000, 4 * 60 * 60_000, 24 * 60 * 60_000];
    if (step > 6) {
      leadUpdate.status          = 'exhausted';
      leadUpdate.followup_paused = true;
      // Don't schedule next_followup_at — exhausted leads are not picked up by cron
    } else if (step === 2 && lead?.double_dialed) {
      // Attempt 2 is already scheduled via the double-dial setTimeout (handleSpeedToLeadCallEnded),
      // which set next_followup_at = now + 45s + 3min as a cron-collision buffer.
      // Only set next_followup_at if it is currently null — meaning call_ended hasn't committed
      // its write yet (rare race). If it's already set, don't overwrite: the setTimeout's claim
      // (which nulls it) plus cron safety net handle the rest. Overwriting could cause cron to
      // see a re-populated next_followup_at after the setTimeout claimed it and fire a duplicate.
      if (!lead.next_followup_at) {
        leadUpdate.next_followup_at = new Date(Date.now() + FOLLOWUP_DELAYS[2] + 3 * 60_000).toISOString();
      }
    } else if (step === 2) {
      // The lead picked up on attempt 1 (no double-dial fired — double_dialed is still
      // false) but the outcome still fell through to this catch-all, e.g. 'completed'
      // with no matching summary keyword, or a near-empty transcript. Don't apply the
      // 45s no-answer redial cadence to someone who just answered the phone — skip
      // ahead to the attempt-3 delay instead.
      leadUpdate.next_followup_at = new Date(Date.now() + FOLLOWUP_DELAYS[3]).toISOString();
    } else {
      const delay = FOLLOWUP_DELAYS[Math.min(step, FOLLOWUP_DELAYS.length - 1)] || 24 * 60 * 60_000;
      leadUpdate.next_followup_at = new Date(Date.now() + delay).toISOString();
    }
  }

  await supabase?.from('leads').update(leadUpdate).eq('id', leadId);

  // Mark appointment reminder as sent if this was a reminder call
  if (appointmentId && ['reminder_24h', 'reminder_1h'].includes(callType)) {
    await supabase?.from('appointment_reminders').update({ status: 'sent', sent_at: new Date().toISOString(), retell_call_id: callId })
      .eq('appointment_id', appointmentId).eq('reminder_type', callType);
  }

  await logEvent('call_outcome_processed', { lead_id: leadId, call_id: callId, call_type: callType, outcome });
}

// Parse Retell call_analysis to extract a normalised outcome label.
// disconnectionReason (from Retell) is the most reliable signal — use it first.
function extractOutcome(callAnalysis = {}, transcript = '', disconnectionReason = '') {
  // Priority 1: Retell disconnect reason — objective, not LLM-interpreted
  if (disconnectionReason === 'voicemail_reached') return 'voicemail';
  if (['dial_no_answer', 'dial_failed', 'dial_busy'].includes(disconnectionReason)) return 'no_answer';

  const summary = (callAnalysis?.call_summary || '').toLowerCase();
  const intent  = (callAnalysis?.user_sentiment || '').toLowerCase();

  // Priority 2: summary text patterns
  // DNC checked first — compliance-critical, must never be shadowed by an incidental mention
  if (summary.includes('stop') || summary.includes('do not call') || summary.includes('remove')) return 'dnc';
  // Rescheduled before cancel — reschedule summaries often contain "cancelled the previous appointment"
  if (summary.includes('rescheduled') || summary.includes('reschedule')) return 'rescheduled';
  // Cancel before booked — "cancel this appointment" contains "appointment" too
  if (summary.includes('cancel')) return 'cancelled';
  // 'booked'/'scheduled' only — 'appointment' alone is too broad (voicemail summaries say "left a message about scheduling an appointment")
  if (summary.includes('booked') || summary.includes('scheduled')) return 'booked';
  if (summary.includes('confirmed') || summary.includes('see you then')) return 'confirmed';
  if (summary.includes('callback') || summary.includes('call back') || summary.includes('call me back')) return 'callback_requested';
  if (summary.includes('wrong number') || summary.includes('wrong person')) return 'not_interested';
  if (summary.includes('not interested') || summary.includes('no thanks') || intent === 'negative') return 'not_interested';
  if (summary.includes('voicemail') || summary.includes('left a message')) return 'voicemail';
  if (summary.includes('no answer') || summary.includes('didn\'t answer')) return 'no_answer';

  // Priority 3: transcript length as last resort.
  // Only treat a short/empty transcript as 'no_answer' if disconnectionReason is also
  // empty/unknown — if it's set and wasn't caught by Priority 1, the call WAS answered
  // (e.g. user_hangup, agent_hangup) and just ended quickly or analysis is incomplete.
  const t = (transcript || '').trim();
  if (!t || t.length < 50) return disconnectionReason ? 'completed' : 'no_answer';
  return 'completed';
}

function formatTranscript(transcriptObject = []) {
  return transcriptObject
    .map(t => `[${t.role?.toUpperCase() || 'UNKNOWN'}]: ${t.content}`)
    .join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// RETELL CUSTOM FUNCTION TOOLS
// Called by the Retell agent DURING a live call. Must respond quickly (<3s).
// Configure in Retell agent: Custom Function → URL = https://<your-app>/retell/function/...
// ─────────────────────────────────────────────────────────────────────────────

// POST /retell/function/check-availability
// Agent calls this to get open calendar slots before offering times to the lead.
// Args: { timezone?, days_ahead? }
app.post('/retell/function/check-availability', validateRetell, async (req, res) => {
  const { args = {} } = req.body;
  const timezone  = args.timezone || 'America/New_York';
  const daysAhead = Math.min(parseInt(args.days_ahead || '5', 10), 14);

  try {
    // GHL free-slots requires epoch-millisecond timestamps, NOT YYYY-MM-DD strings
    // (a date string returns HTTP 422 "startDate must be a number conforming to ...").
    const startMs = Date.now();
    const endMs   = startMs + daysAhead * 24 * 60 * 60 * 1000;

    const allSlots = await ghlGetSlotsWithCache(startMs, endMs, timezone);
    const slots    = topOfHourSlots(allSlots, timezone); // offer clean o'clock times only

    // Return up to 6 slots in natural language so agent can speak them
    const formatted = slots.slice(0, 6).map(iso => {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: timezone });
    });

    return res.json({
      slots_iso:       slots.slice(0, 6),
      slots_formatted: formatted,
      has_availability: slots.length > 0,
    });
  } catch (err) {
    console.error('[retell/check-availability] error:', err.message);
    return res.json({ has_availability: false, error: err.message });
  }
});

// POST /retell/function/book-appointment
// Agent calls this when the lead agrees to a time slot.
// Args: { slot_iso, timezone?, lead_id }
app.post('/retell/function/book-appointment', validateRetell, async (req, res) => {
  const { args = {}, call } = req.body;
  const { slot_iso, timezone, lead_id: argLeadId } = args;
  const leadId = argLeadId || call?.metadata?.lead_id;

  if (!slot_iso || !leadId) {
    return res.json({ success: false, error: 'slot_iso and lead_id are required' });
  }

  try {
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (!lead) {
      await dlq('retell/book-appointment', { args, lead_id: leadId }, new Error('Lead not found'));
      return res.json({ success: false, error: 'Lead not found' });
    }

    // If called from a reminder context, look up the old appointment but DON'T cancel it yet —
    // only cancel after the new booking succeeds, so a failed re-book never leaves the lead
    // with zero appointments.
    const oldAppointmentId = call?.metadata?.appointment_id;
    let oldAppt = null;
    if (oldAppointmentId) {
      const { data } = await supabase.from('appointments')
        .select('id, ghl_appointment_id').eq('id', oldAppointmentId).maybeSingle();
      oldAppt = data;
    }
    // Fallback by lead_id: metadata.appointment_id only travels through Retell's call
    // metadata, which this depends on being echoed back correctly. A lead only ever has
    // one live ('booked') appointment at a time by design, so if metadata didn't carry
    // an id (or pointed at a row that's gone), find it by lead_id instead — otherwise a
    // reschedule with missing metadata creates the new appointment and silently leaves
    // the old GHL slot live, i.e. a double-booking.
    if (!oldAppt) {
      const { data } = await supabase.from('appointments')
        .select('id, ghl_appointment_id').eq('lead_id', lead.id).eq('status', 'booked')
        .order('start_at', { ascending: false }).limit(1).maybeSingle();
      oldAppt = data;
    }

    const bookedTz = timezone || lead.timezone || 'America/New_York';

    const appt = await ghlBookAppointment({
      contactId: lead.ghl_contact_id,
      name:      lead.name,
      email:     lead.email,
      phone:     lead.phone,
      slotIso:   slot_iso,
      timezone:  bookedTz,
    });

    // Mirror to Supabase — include endAt from GHL response
    await upsertAppointment({
      ghlAppointmentId: appt.id,
      leadId:   lead.id,
      startAt:  slot_iso,
      endAt:    appt.endTime || appt.end_time || null,
      timezone: bookedTz,
    });

    // Sync to GHL contact — fire-and-forget so it doesn't add to the live-call response
    // time. Confirmation/reminder agent reads contact.timezone via the
    // appointment-booked webhook, so this keeps AI-booked leads on par with self-booked.
    ghlUpdateContactTimezone(lead.ghl_contact_id, bookedTz).catch(err => {
      console.error(`[retell/book-appointment] Failed to sync GHL contact timezone for ${lead.ghl_contact_id}:`, err.message);
      dlq('retell/book-appointment/sync-timezone', { lead_id: lead.id, timezone: bookedTz }, err);
    });

    // New booking succeeded — now safe to cancel the old appointment in GHL and Supabase.
    // GHL cancel is fire-and-forget: awaiting it adds a full extra GHL round-trip to the
    // live-call tool response. Supabase mirror still awaited (fast, <200ms total).
    if (oldAppt) {
      if (oldAppt.ghl_appointment_id) {
        ghlCancelAppointment(oldAppt.ghl_appointment_id).catch(cancelErr => {
          console.error(`[retell/book-appointment] Failed to cancel old GHL appointment ${oldAppt.ghl_appointment_id}:`, cancelErr.message);
          dlq('retell/book-appointment/cancel-old', { lead_id: lead.id, old_appointment_id: oldAppt.id, ghl_appointment_id: oldAppt.ghl_appointment_id }, cancelErr);
        });
      }
      await supabase.from('appointments').update({
        status:       'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      }).eq('id', oldAppt.id);
      await supabase.from('appointment_reminders')
        .update({ status: 'skipped', error: 'appointment rescheduled' })
        .eq('appointment_id', oldAppt.id)
        .in('status', ['pending', 'sent']);
      await logEvent('appointment_rescheduled_via_agent', { lead_id: lead.id, old_appointment_id: oldAppt.id, new_slot_iso: slot_iso });
    }

    // Pause follow-up since they just booked
    await supabase.from('leads').update({ status: 'booked', followup_paused: true }).eq('id', lead.id);

    const confirmTime = new Date(slot_iso).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
      timeZone: timezone || 'America/New_York',
    });

    console.log(`[retell/book-appointment] Lead ${leadId} booked at ${slot_iso}`);
    await logEvent('appointment_booked_via_agent', { lead_id: lead.id, slot_iso, ghl_appointment_id: appt.id });

    return res.json({ success: true, confirmation: confirmTime, appointment_id: appt.id });
  } catch (err) {
    console.error('[retell/book-appointment] error:', err.message);

    // Slot conflict — GHL rejected because the slot was taken between check-availability
    // (cached up to 90s) and this booking call. Clear the slot cache so the agent's
    // re-call to check-availability (it routes back to pick_time on success:false)
    // returns fresh slots instead of the same stale list still containing this slot.
    const isSlotConflict = /→ (400|409|422)\b/.test(err.message)
      && /(not available|unavailable|conflict|already booked|slot)/i.test(err.message);

    if (isSlotConflict) {
      _slotCache.clear();
      await dlq('retell/book-appointment/slot-conflict', { args, lead_id: leadId }, err);
      return res.json({ success: false, error: 'That time was just booked by someone else — please choose another time' });
    }

    await dlq('retell/book-appointment', { args, lead_id: leadId }, err);
    return res.json({ success: false, error: 'Could not book appointment — please try again' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CRON — POST /cron/speed-to-lead
// Runs every 5 min. Safety net for leads whose setTimeout was lost (server restart)
// and fires follow-up attempts 3–6 per the retry schedule.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/cron/speed-to-lead', requireCronSecret, async (req, res) => {
  res.json({ received: true });
  runSpeedToLeadCron().catch(err => console.error('[cron/speed-to-lead]', err.message));
});

async function runSpeedToLeadCron() {
  if (!await acquireCronLock('speed_to_lead_followup')) {
    return console.log('[cron/speed-to-lead] Lock held by another instance — skipping');
  }

  try {
    await runSpeedToLeadCronBody();
  } finally {
    await releaseCronLock('speed_to_lead_followup');
  }
}

async function runSpeedToLeadCronBody() {
  if (!supabase) return console.warn('[cron/speed-to-lead] Supabase not configured');

  await retryFailedDncUpserts();
  await retryFailedGhlCancels();

  // Circuit breaker — if call volume looks runaway (e.g. a lead looping without
  // followup_step advancing), pause firing new calls and flag it for review.
  // Scoped to speed_to_lead calls only — a flood here can't starve reminder/
  // confirmation calls, which have their own budget below.
  const maxCallsPerHour = parseInt(MAX_CALLS_PER_HOUR, 10) || 300;
  const recentCalls     = await getRecentCallCount(60 * 60_000, ['speed_to_lead']);
  if (recentCalls >= maxCallsPerHour) {
    console.error(`[cron/speed-to-lead] Circuit breaker: ${recentCalls} speed-to-lead calls in the last hour >= limit ${maxCallsPerHour} — skipping this tick`);
    await dlq('cron/speed-to-lead/circuit-breaker', { recent_calls: recentCalls, limit: maxCallsPerHour }, new Error('Call volume circuit breaker tripped'));
    return;
  }

  const now = new Date().toISOString();

  // Fetch leads due for a follow-up call
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'calling')
    .eq('followup_paused', false)
    .lte('next_followup_at', now)
    .lte('followup_step', 6)
    .order('next_followup_at')
    .limit(50);

  if (error) return console.error('[cron/speed-to-lead] DB error:', error.message);

  // Recover stranded leads: status='calling' with next_followup_at=NULL (e.g. lost
  // setTimeout after Railway restart). These are invisible to the normal cron query
  // which filters next_followup_at <= now() — NULLs never match.
  const { data: stranded, error: strandedErr } = await supabase
    .from('leads')
    .select('id, followup_step')
    .eq('status', 'calling')
    .eq('followup_paused', false)
    .is('next_followup_at', null)
    .lte('followup_step', 6)
    .limit(20);

  if (strandedErr) {
    console.error('[cron/speed-to-lead] Stranded-lead query error:', strandedErr.message);
  } else if (stranded?.length) {
    console.log(`[cron/speed-to-lead] Recovering ${stranded.length} stranded lead(s)`);
    // INFINITE-REDIAL GUARD (2026-06-23): advance the cadence on recovery instead of just
    // re-arming at the same step. A lead whose call outcome never came back (e.g. a missed
    // or rejected Retell webhook) otherwise sits at (status=calling, next_followup_at=null)
    // and gets re-armed to now() every tick — an endless redial (a real FB lead was called
    // 75x this way). Advancing followup_step makes it climb the normal cadence and exhaust
    // after 6 attempts, which is the intended behaviour even when outcomes are missing.
    const RECOVERY_DELAYS = [0, 0, 45_000, 10 * 60_000, 30 * 60_000, 4 * 60 * 60_000, 24 * 60 * 60_000];
    for (const s of stranded) {
      const nextStep = (s.followup_step || 1) + 1;
      if (nextStep > 6) {
        await supabase.from('leads').update({
          status: 'exhausted', followup_paused: true, next_followup_at: null,
        }).eq('id', s.id);
      } else {
        await supabase.from('leads').update({
          followup_step:    nextStep,
          next_followup_at: new Date(Date.now() + RECOVERY_DELAYS[nextStep]).toISOString(),
        }).eq('id', s.id);
      }
    }
  }

  // Recover leads stuck in 'new' for over 1 hour (scheduleSpeedToLeadCall failed silently).
  const newStaleCutoff = new Date(Date.now() - 60 * 60_000).toISOString();
  const { data: staleNew } = await supabase
    .from('leads')
    .select('id')
    .eq('status', 'new')
    .lte('created_at', newStaleCutoff)
    .limit(10);

  if (staleNew?.length) {
    console.log(`[cron/speed-to-lead] Recovering ${staleNew.length} stale 'new' lead(s)`);
    for (const s of staleNew) {
      await supabase.from('leads').update({
        status:           'calling',
        followup_step:    1,
        next_followup_at: new Date().toISOString(),
      }).eq('id', s.id).eq('status', 'new');
    }
  }

  if (!leads?.length) return console.log('[cron/speed-to-lead] No leads due');

  console.log(`[cron/speed-to-lead] Processing ${leads.length} leads`);

  for (const lead of leads) {
    try {
      // DNC check
      if (await isOnDNC(lead.phone)) {
        await supabase.from('leads').update({ status: 'dnc', followup_paused: true }).eq('id', lead.id);
        continue;
      }

      const tz      = lead.timezone || phoneToTimezone(lead.phone);
      const waitMs  = msUntilCallable(new Date(), tz);
      if (waitMs > 0) {
        // Outside calling hours — push next_followup_at to start of calling hours
        await supabase.from('leads').update({
          next_followup_at: new Date(Date.now() + waitMs).toISOString(),
        }).eq('id', lead.id);
        console.log(`[cron/speed-to-lead] Lead ${lead.id} deferred ${Math.round(waitMs / 60000)}min (calling hours)`);
        continue;
      }

      await fireSpeedToLeadCall(lead.id);
    } catch (err) {
      console.error(`[cron/speed-to-lead] Lead ${lead.id} error:`, err.message);
      await dlq('cron/speed-to-lead', { lead_id: lead.id }, err);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CRON — POST /cron/appointment-reminders
// Runs every 5 min. Fires reminder calls for appointments within their window.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/cron/appointment-reminders', requireCronSecret, async (req, res) => {
  res.json({ received: true });
  runAppointmentReminderCron().catch(err => console.error('[cron/appointment-reminders]', err.message));
});

async function runAppointmentReminderCron() {
  if (!await acquireCronLock('appointment_reminders')) {
    return console.log('[cron/appointment-reminders] Lock held by another instance — skipping');
  }

  try {
    await runAppointmentReminderCronBody();
  } finally {
    await releaseCronLock('appointment_reminders');
  }
}

async function runAppointmentReminderCronBody() {
  if (!supabase) return console.warn('[cron/appointment-reminders] Supabase not configured');

  await retryFailedDncUpserts();
  await retryFailedGhlCancels();

  if (!RETELL_AGENT_ID_REMINDER || !RETELL_FROM_NUMBER) {
    return console.warn('[cron/appointment-reminders] RETELL_AGENT_ID_REMINDER or RETELL_FROM_NUMBER not set — skipping (reminders stay pending)');
  }

  // Circuit breaker — separate budget from /cron/speed-to-lead so a speed-to-lead
  // volume spike can't block appointment reminders/confirmations.
  const maxReminderCallsPerHour = parseInt(MAX_REMINDER_CALLS_PER_HOUR, 10) || 100;
  const recentCalls             = await getRecentCallCount(60 * 60_000, ['reminder_24h', 'reminder_1h']);
  if (recentCalls >= maxReminderCallsPerHour) {
    console.error(`[cron/appointment-reminders] Circuit breaker: ${recentCalls} reminder calls in the last hour >= limit ${maxReminderCallsPerHour} — skipping this tick`);
    await dlq('cron/appointment-reminders/circuit-breaker', { recent_calls: recentCalls, limit: maxReminderCallsPerHour }, new Error('Call volume circuit breaker tripped'));
    return;
  }

  const now = new Date().toISOString();

  const { data: reminders, error } = await supabase
    .from('appointment_reminders')
    .select('*, appointments(*, leads(*))')
    .eq('status', 'pending')
    .lte('trigger_at', now)
    .order('trigger_at')
    .limit(30);

  if (error) return console.error('[cron/appointment-reminders] DB error:', error.message);
  if (!reminders?.length) return console.log('[cron/appointment-reminders] No reminders due');

  console.log(`[cron/appointment-reminders] Processing ${reminders.length} reminders`);

  for (const reminder of reminders) {
    const appt = reminder.appointments;
    const lead = appt?.leads;

    if (!appt || !lead) {
      await supabase.from('appointment_reminders').update({ status: 'skipped', error: 'missing appt or lead' }).eq('id', reminder.id);
      continue;
    }

    if (appt.status === 'cancelled') {
      await supabase.from('appointment_reminders').update({ status: 'skipped', error: 'appointment cancelled' }).eq('id', reminder.id);
      continue;
    }

    // DNC check — lead may have opted out (verbally or via GHL tag) after the appointment was booked
    if (await isOnDNC(lead.phone)) {
      await supabase.from('appointment_reminders').update({ status: 'skipped', error: 'lead on DNC list' }).eq('id', reminder.id);
      await supabase.from('leads').update({ status: 'dnc', followup_paused: true }).eq('id', lead.id);
      continue;
    }

    // TCPA: check calling hours BEFORE claiming — defer trigger_at if outside window.
    // Timezone priority: appointment.timezone (set from GHL contact at booking time)
    // → lead.timezone → area-code lookup → America/New_York
    const reminderTz = appt.timezone || lead.timezone || phoneToTimezone(lead.phone) || 'America/New_York';
    const waitMs = msUntilCallable(new Date(), reminderTz);
    if (waitMs > 0) {
      await supabase.from('appointment_reminders')
        .update({ trigger_at: new Date(Date.now() + waitMs).toISOString() })
        .eq('id', reminder.id).eq('status', 'pending');
      console.log(`[cron/appointment-reminders] Reminder ${reminder.id} deferred ${Math.round(waitMs / 60000)}min (outside calling hours)`);
      continue;
    }

    // Claim atomically: check returned rows (error=null with 0 rows if already claimed)
    const { data: claimed, error: claimErr } = await supabase.from('appointment_reminders')
      .update({ status: 'sent', sent_at: now })
      .eq('id', reminder.id).eq('status', 'pending')
      .select('id');

    if (claimErr || !claimed?.length) {
      console.log(`[cron/appointment-reminders] Reminder ${reminder.id} already claimed — skipping`);
      continue;
    }

    try {
      const startLocal = new Date(appt.start_at).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', timeZone: reminderTz,
        timeZoneName: 'short',
      });
      const startDate = new Date(appt.start_at).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: reminderTz,
      });

      const callData = await triggerRetellCall({
        lead,
        agentId:       RETELL_AGENT_ID_REMINDER,
        callType:      reminder.reminder_type,
        appointmentId: appt.id,
        dynamicVars: {
          appointment_time:  startLocal,
          appointment_date:  startDate,
          appointment_iso:   appt.start_at,
          timezone:          appt.timezone,
          zoom_link:         appt.zoom_link || '',
          reminder_type:     reminder.reminder_type,
          closer_name:       CLOSER_NAME,
        },
      });

      if (callData?.call_id) {
        await supabase.from('appointment_reminders').update({ retell_call_id: callData.call_id }).eq('id', reminder.id);
      }
    } catch (err) {
      console.error(`[cron/appointment-reminders] Reminder ${reminder.id} failed:`, err.message);
      // Reset to 'pending' so the next cron tick retries — 'failed' is never re-queried.
      // The retry window is naturally bounded by the appointment time (no-show cron takes over after).
      await supabase.from('appointment_reminders')
        .update({ status: 'pending', sent_at: null, error: err.message })
        .eq('id', reminder.id);
      await dlq('cron/appointment-reminders', { reminder_id: reminder.id, appointment_id: appt.id }, err);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CRON — POST /cron/no-show-check
// Runs every 15 min. Without this, a lead who books, gets reminders, and never
// joins stays status='booked'/followup_paused=true forever — they silently fall
// out of the pipeline. This marks the appointment 'no_show' and re-enters the
// lead into the speed-to-lead rotation for one more rebooking attempt.
// ─────────────────────────────────────────────────────────────────────────────
const NO_SHOW_GRACE_MS = 15 * 60_000; // wait 15min after appt start before declaring no-show

app.post('/cron/no-show-check', requireCronSecret, async (req, res) => {
  res.json({ received: true });
  runNoShowCron().catch(err => console.error('[cron/no-show-check]', err.message));
});

async function runNoShowCron() {
  if (!await acquireCronLock('no_show_check', 15 * 60_000)) {
    return console.log('[cron/no-show-check] Lock held by another instance — skipping');
  }

  try {
    await runNoShowCronBody();
  } finally {
    await releaseCronLock('no_show_check');
  }
}

async function runNoShowCronBody() {
  if (!supabase) return console.warn('[cron/no-show-check] Supabase not configured');

  await retryFailedDncUpserts();
  await retryFailedGhlCancels();

  const cutoff   = new Date(Date.now() - NO_SHOW_GRACE_MS).toISOString();
  // Lower bound avoids resurrecting long-stale 'booked' appointments whose reminder
  // pipeline broke days ago (e.g. server downtime) into a fresh calling cadence.
  const lookback = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

  const { data: appts, error } = await supabase
    .from('appointments')
    .select('id, lead_id, start_at, leads(phone, timezone, status)')
    .eq('status', 'booked')
    .lt('start_at', cutoff)
    .gt('start_at', lookback)
    .limit(50);

  if (error) return console.error('[cron/no-show-check] DB error:', error.message);
  if (!appts?.length) return console.log('[cron/no-show-check] No appointments to check');

  console.log(`[cron/no-show-check] Processing ${appts.length} appointment(s)`);

  for (const appt of appts) {
    try {
      // Atomic claim — avoids double-processing if two cron ticks overlap
      const { data: claimed, error: claimErr } = await supabase.from('appointments')
        .update({ status: 'no_show', updated_at: new Date().toISOString() })
        .eq('id', appt.id).eq('status', 'booked').select('id');

      if (claimErr || !claimed?.length) continue;

      await logEvent('appointment_no_show', { lead_id: appt.lead_id, appointment_id: appt.id, start_at: appt.start_at });

      const lead = appt.leads;
      if (!appt.lead_id || !lead) continue;

      // DNC check — lead may have opted out (verbally or via GHL tag) since booking
      if (await isOnDNC(lead.phone)) {
        await supabase.from('leads').update({ status: 'dnc', followup_paused: true, next_followup_at: null }).eq('id', appt.lead_id);
        continue;
      }

      // TCPA: requeue straight into the next legal calling window rather than `now()`,
      // so the lead isn't briefly "due" outside calling hours before the next cron tick.
      const tz     = lead.timezone || phoneToTimezone(lead.phone);
      const waitMs = msUntilCallable(new Date(), tz);

      // Re-enter the lead into speed-to-lead with a reduced cadence: skip the double-dial
      // (followup_step=2, double_dialed=true so the next no-answer goes straight to the
      // 10-min/30-min/4h/24h schedule rather than restarting from attempt 1).
      await supabase.from('leads').update({
        status:            'calling',
        followup_paused:   false,
        followup_step:     2,
        double_dialed:     true,
        next_followup_at:  new Date(Date.now() + waitMs).toISOString(),
        last_call_outcome: 'no_show',
      }).eq('id', appt.lead_id).eq('status', 'booked');
    } catch (err) {
      console.error(`[cron/no-show-check] Appointment ${appt.id} error:`, err.message);
      await dlq('cron/no-show-check', { appointment_id: appt.id, lead_id: appt.lead_id }, err);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN / DEBUG ENDPOINTS
// All require x-admin-password header. Use these to inspect system state.
// ─────────────────────────────────────────────────────────────────────────────

// GET /admin/leads?status=calling&limit=50
// Returns leads with their latest call log.
app.get('/admin/leads', requireAdminPassword, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const status = req.query.status;
  const limit  = Math.min(parseInt(req.query.limit || '50', 10), 200);
  let q = supabase.from('leads')
    .select('*, call_logs(id, call_type, call_status, outcome, created_at)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status) q = q.eq('status', status);
  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count, leads: data });
});

// GET /admin/call-logs?lead_id=123&limit=50
app.get('/admin/call-logs', requireAdminPassword, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const leadId = req.query.lead_id;
  const limit  = Math.min(parseInt(req.query.limit || '50', 10), 200);
  let q = supabase.from('call_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (leadId) q = q.eq('lead_id', leadId);
  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count, logs: data });
});

// GET /admin/lead-events?lead_id=123
// Primary debugging endpoint: full audit trail for any lead.
app.get('/admin/lead-events', requireAdminPassword, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const leadId = req.query.lead_id;
  if (!leadId) return res.status(400).json({ error: 'lead_id is required' });
  const { data, error } = await supabase.from('lead_events')
    .select('*').eq('lead_id', leadId).order('created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ events: data });
});

// GET /admin/reminders?status=pending
app.get('/admin/reminders', requireAdminPassword, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const status = req.query.status || 'pending';
  const { data, error } = await supabase.from('appointment_reminders')
    .select('*, appointments(ghl_appointment_id, start_at, timezone, leads(name, phone))')
    .eq('status', status).order('trigger_at').limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ reminders: data });
});

// GET /admin/failed-webhooks
// Check this when calls aren't firing or reminders are stuck.
app.get('/admin/failed-webhooks', requireAdminPassword, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const { data, error } = await supabase.from('failed_webhook_events')
    .select('*').eq('resolved', false).order('created_at', { ascending: false }).limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ failed: data });
});

// POST /admin/dnc   { phone }
app.post('/admin/dnc', requireAdminPassword, async (req, res) => {
  const { phone, reason } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  const e164 = toE164(phone);
  if (!e164) return res.status(400).json({ error: 'Invalid phone number' });
  const { error } = await supabase?.from('dnc').upsert({ phone: e164, reason, added_by: 'admin' }, { onConflict: 'phone' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, phone: e164 });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH / PING
// ─────────────────────────────────────────────────────────────────────────────

// Expected cron intervals — used to flag cron jobs that haven't run recently.
// locked_until is set to (now + interval) on each successful tick, so
// (now - locked_until) growing past ~2x the interval means the job has stalled.
const CRON_INTERVALS_MS = {
  speed_to_lead_followup: 5 * 60_000,
  appointment_reminders:  5 * 60_000,
  no_show_check:          15 * 60_000,
};

app.get('/health', async (_req, res) => {
  const base = {
    service:   'dsn-call-orchestrator',
    node:      process.version,
    env:       NODE_ENV,
    retell:    !!RETELL_API_KEY,
    from_number: !!RETELL_FROM_NUMBER,
    ghl:       !!GHL_API_KEY,
    agents: {
      speed_to_lead: !!RETELL_AGENT_ID_SPEED_TO_LEAD,
      reminder:      !!RETELL_AGENT_ID_REMINDER,
    },
    uptime: Math.round(process.uptime()),
  };

  if (!supabase) {
    return res.status(503).json({ ...base, status: 'error', supabase: false, error: 'Supabase not configured' });
  }

  try {
    const { error } = await supabase.from('leads').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) throw error;

    const cron = {};
    let cronStale = false;
    const { data: locks } = await supabase.from('cron_locks').select('job_name, locked_until');
    for (const lock of locks || []) {
      const interval  = CRON_INTERVALS_MS[lock.job_name] || 5 * 60_000;
      const staleMs   = Date.now() - new Date(lock.locked_until).getTime();
      const stale     = staleMs > interval * 2;
      if (stale) cronStale = true;
      cron[lock.job_name] = { locked_until: lock.locked_until, stale };
    }

    // Unresolved DLQ entries indicate webhook/processing failures that need attention
    const { count: dlqCount } = await supabase.from('failed_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('resolved', false);
    const dlqDegraded = (dlqCount || 0) > 5;

    const degraded = cronStale || dlqDegraded;
    res.json({ ...base, status: degraded ? 'degraded' : 'ok', supabase: true, cron, dlq_unresolved: dlqCount || 0 });
  } catch (err) {
    res.status(503).json({ ...base, status: 'error', supabase: false, error: err.message });
  }
});

app.get('/ping', (_req, res) => res.send('pong'));

// ─────────────────────────────────────────────────────────────────────────────
// IN-PROCESS SCHEDULER
// Drives the 3 cron jobs directly from this always-on process so they don't
// depend on an external trigger's schedule actually firing on time. The
// cron_locks distributed lock makes this safe to run alongside the
// /cron/* HTTP endpoints (GitHub Actions, manual curl, etc.) — whichever
// fires first wins each tick, the other skips.
// ─────────────────────────────────────────────────────────────────────────────
function startInProcessScheduler() {
  const jobs = [
    ['speed_to_lead_followup', runSpeedToLeadCron],
    ['appointment_reminders',  runAppointmentReminderCron],
    ['no_show_check',          runNoShowCron],
  ];
  for (const [name, fn] of jobs) {
    const interval = CRON_INTERVALS_MS[name];
    fn().catch(err => console.error(`[scheduler/${name}]`, err.message));
    setInterval(() => fn().catch(err => console.error(`[scheduler/${name}]`, err.message)), interval);
  }
  console.log('[startup] In-process scheduler started (speed_to_lead/appointment_reminders every 5min, no_show_check every 15min)');
}

// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[startup] DSN Call Orchestrator running on :${PORT} (${NODE_ENV})`);
  console.log(`[startup] Supabase: ${supabase ? 'connected' : 'MISSING'} | GHL: ${GHL_API_KEY ? 'configured' : 'MISSING'} | Retell: ${RETELL_API_KEY ? 'configured' : 'MISSING'}`);
  startInProcessScheduler();
});
