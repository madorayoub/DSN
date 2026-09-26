// /.netlify/functions/meta-crm-sync — scheduled every 15 minutes (see netlify.toml).
//
// Reports Facebook instant-form leads that move into a booked or follow-up stage of the
// `sales` pipeline to Meta as Conversions API CRM lead events. Meta's "conversion leads"
// goal uses them to optimise Lead Ads for leads that book, not just leads that fill in
// the form. Closed deals aren't tracked in the CRM, so none are sent.
//
// Meta counts every server event it receives (it only deduplicates browser-vs-server
// copies), so each stage change must go out exactly once. Each run covers the 15-minute
// slot before the schedule boundary it fires on, and consecutive slots don't overlap. A
// run that fails loses its slot's events rather than sending them twice.

const { hashedUserData, sendEvent } = require('../lib/meta-capi');

const GHL_BASE    = 'https://services.leadconnectorhq.com';
const LOCATION_ID = process.env.GHL_LOCATION_ID || 'NgduPjDbvABP3zFIqnt4';
const PIPELINE_ID = 'deeFJVq1U9SYR8WIvEkl'; // "sales"

// Stage id → the lead stage name Meta receives as event_name. Keyed by id so renaming a
// stage in GHL doesn't quietly change what Meta sees.
const STAGES = {
  '2b89c846-0623-4468-9fee-6dbe91a8802a': 'Booked',
  '2cd994d5-8d0e-4075-9abf-1259b862875b': 'Booked - Followup',
  'ffe3e48b-bb6b-494a-8304-5c3ef707097d': 'Follow up',
  '5b50380f-9dfd-4350-98f2-f6c9fda2ced6': 'Follow up - Long term',
};

const SLOT_MS       = 15 * 60 * 1000; // must match the schedule in netlify.toml
const LAG_MS        = 2 * 60 * 1000;  // gives GHL's search time to show a stage change
const MAX_OFFSET_MS = 3 * 60 * 1000;  // scheduled runs fire within seconds of a boundary

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
  return { from: boundary === LAUNCH ? to - BACKFILL_MS : to - SLOT_MS, to };
}

// Conversion leads works only for instant-form leads. GHL records the form as the lead's
// first touch (medium "facebook", mediumId = the form id). Imported, website and
// calendar leads are left out; website bookings already reach Meta as Schedule.
function isInstantFormLead(opp) {
  const first = (opp.attributions || []).find((a) => a.isFirst) || {};
  return first.medium === 'facebook' && Boolean(first.mediumId);
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

function stageEvent(opp) {
  const { name = '', email, phone } = opp.contact || {};
  const [firstName = '', ...rest] = name.trim().split(/\s+/);
  const changedAt = Date.parse(opp.lastStageChangeAt);
  return {
    event_name: STAGES[opp.pipelineStageId],
    event_time: Math.floor(changedAt / 1000),
    event_id: `${opp.id}-${changedAt}`,
    action_source: 'system_generated',
    user_data: hashedUserData({ em: email, ph: phone, fn: firstName, ln: rest.join(' '), external_id: opp.contactId }),
    custom_data: { event_source: 'crm', lead_event_source: 'GoHighLevel' },
  };
}

exports.handler = async (event) => {
  const slot = slotFor(event, Date.now());
  if (slot.skip) {
    console.log(`[meta-crm] skipped: ${slot.skip}`);
    return { statusCode: 200, body: '' };
  }
  const span = `${new Date(slot.from).toISOString()} → ${new Date(slot.to).toISOString()}`;
  if (!process.env.GHL_PRIVATE_TOKEN) {
    console.error('[meta-crm] GHL_PRIVATE_TOKEN is not set');
    return { statusCode: 500, body: '' };
  }

  try {
    const byStage = await Promise.all(Object.keys(STAGES).map(opportunitiesIn));
    const changes = byStage.flat().filter((opp) => {
      const at = Date.parse(opp.lastStageChangeAt);
      return at >= slot.from && at < slot.to && isInstantFormLead(opp);
    });
    // In parallel: the launch run can carry a dozen events, and a dozen of sendEvent's
    // 3 s timeouts in a row would overrun the 30 s limit if Meta were slow.
    const results = await Promise.all(changes.map((opp) => sendEvent(stageEvent(opp))));

    const sent = {};
    changes.forEach((opp, i) => {
      const stage = STAGES[opp.pipelineStageId];
      if (results[i].ok) sent[stage] = (sent[stage] || 0) + 1;
      else console.error(`[meta-crm] ${stage} for opportunity ${opp.id} not sent: ${results[i].error || results[i].status}`);
    });
    console.log(`[meta-crm] ${span}: sent ${results.filter((r) => r.ok).length}/${changes.length}`, JSON.stringify(sent));
    return { statusCode: 200, body: '' };
  } catch (err) {
    console.error(`[meta-crm] ${span}: run failed, this slot's events are lost:`, err.message);
    return { statusCode: 500, body: '' };
  }
};
