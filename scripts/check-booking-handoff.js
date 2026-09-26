#!/usr/bin/env node
'use strict';

// Proves the offer page hands the booked time to the thank-you page, without booking anything.
//
//   node scripts/check-booking-handoff.js                               # local preview on :8788
//   node scripts/check-booking-handoff.js https://directsales.network   # the live site, after a deploy
//
// It drives the real offer page on a phone-sized screen: open the booking sheet, pick a time,
// fill the form, submit. Nothing that matters leaves the browser:
//   - the booking POST is answered here with a fake success, so no appointment is created,
//     no closer is notified and booking.js never sends Meta a Schedule;
//   - Meta, Google and the CAPI relay are blocked, so no PageView / Schedule / Lead is counted.
// Locally the slot list is faked too (serve docs/ with the `dsn-funnel-no-tracking` preview,
// .claude/preview-server.py). Against the live site the slots are the real GHL availability,
// the same read-only request every visitor's page makes.
//
// Then /commercial/thankyou must show "Add to calendar" with the exact time the offer page
// confirmed, and its Google / .ics links must carry that same slot. Without a booking in the
// tab, the button must stay hidden. Runs /commercial/offer and /commercial/offer-v2 in Chromium
// and WebKit (Safari's engine), in three time zones.

const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = (process.argv[2] || 'http://localhost:8788').replace(/\/$/, '');
const LIVE = !/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE);
const PAGES = ['/commercial/offer', '/commercial/offer-v2'];
const ZONES = ['America/New_York', 'America/Los_Angeles', 'Asia/Kolkata'];
const TRACKING = /facebook\.(com|net)|google-analytics\.com|googletagmanager\.com|doubleclick\.net|\/\.netlify\/functions\/capi/;

function loadPlaywright() {
  // The repo's @playwright/test after `npm install`, else a global `@playwright/cli` install.
  for (const id of ['playwright', '@playwright/test', '/usr/local/lib/node_modules/@playwright/cli/node_modules/playwright']) {
    try { return require(id); } catch (e) { /* try the next one */ }
  }
  throw new Error('Playwright not found. Run `npm install`, then `npx playwright install chromium webkit`.');
}

async function launch(browserType) {
  try {
    return await browserType.launch();
  } catch (err) {
    if (browserType.name() !== 'chromium' || !/Executable doesn't exist/.test(err.message)) throw err;
    // A Playwright update can expect a Chromium build that was never downloaded. Any installed one works.
    const cache = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
    const build = fs.existsSync(cache) && fs.readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-')).sort().pop();
    const dir = build && fs.readdirSync(path.join(cache, build)).find((d) => d.startsWith('chrome-headless-shell-'));
    if (!dir) throw err;
    return browserType.launch({ executablePath: path.join(cache, build, dir, 'chrome-headless-shell') });
  }
}

// Two days out, three slots a day, in Chicago time like GHL returns them.
function fakeSlots() {
  const dates = {};
  for (const plus of [2, 3]) {
    const d = new Date(Date.now() + plus * 86400000);
    const ymd = d.toISOString().slice(0, 10);
    dates[ymd] = ['09:00', '10:30', '15:00'].map((t) => `${ymd}T${t}:00-05:00`);
  }
  return dates;
}

const utc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

async function bookAndCheck(browser, device, offerPath, timezoneId) {
  const context = await browser.newContext({ ...device, timezoneId, locale: 'en-US' });
  let posted = null;
  await context.route(TRACKING, (route) => route.abort());
  await context.route('**/.netlify/functions/booking**', (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      posted = req.postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, test: true }) });
    }
    if (LIVE) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dates: fakeSlots() }) });
  });

  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  try {
    await page.goto(BASE + offerPath, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.querySelector('a[href="#book"]').click());
    const slotButton = page.locator('#bk-times button.bk-t').last();
    await slotButton.waitFor();
    const slot = await slotButton.getAttribute('data-iso');
    await slotButton.click();
    await page.locator('#bk-confirm').click();
    const chosen = (await page.locator('#bk-chosen-txt').textContent()).trim();
    await page.fill('#bk-name', 'Handoff Test');
    await page.fill('#bk-email', 'handoff-test@example.com');
    await page.fill('#bk-phone', '5555550100');
    await Promise.all([page.waitForURL(/\/commercial\/thankyou/), page.locator('#bk-sub').click()]);

    const got = await page.evaluate(async () => {
      const wrapper = document.querySelector('.cal-wrapper');
      const ics = await (await fetch(wrapper.querySelector('[data-type="apple"]').href)).text();
      return {
        shown: !wrapper.hidden,
        step: document.querySelector('[data-cal-step-text]').textContent.trim(),
        dates: new URL(wrapper.querySelector('[data-type="google"]').href).searchParams.get('dates'),
        icsStart: (ics.match(/DTSTART:(\S+)/) || [])[1],
      };
    });
    const start = new Date(slot);
    const want = `${utc(start)}/${utc(new Date(start.getTime() + 30 * 60000))}`;
    const problems = [];
    if (!posted || posted.slot !== slot) problems.push(`booked ${posted && posted.slot}, picked ${slot}`);
    if (!got.shown) problems.push('Add to calendar is hidden');
    if (got.step !== chosen) problems.push(`thank-you says "${got.step}", offer said "${chosen}"`);
    if (got.dates !== want) problems.push(`Google dates ${got.dates}, want ${want}`);
    if (got.icsStart !== utc(start)) problems.push(`.ics starts ${got.icsStart}, want ${utc(start)}`);
    return { ok: !problems.length, detail: problems.length ? problems.join('; ') : `"${chosen}"  (${want})` };
  } catch (err) {
    return { ok: false, detail: err.message.split('\n')[0] };
  } finally {
    await context.close();
  }
}

async function checkNoBooking(browser, device) {
  const context = await browser.newContext({ ...device, locale: 'en-US' });
  await context.route(TRACKING, (route) => route.abort());
  const page = await context.newPage();
  try {
    await page.goto(BASE + '/commercial/thankyou', { waitUntil: 'domcontentloaded' });
    const got = await page.evaluate(() => ({
      hidden: document.querySelector('.cal-wrapper').hidden,
      step: document.querySelector('[data-cal-step-title]').textContent.trim(),
    }));
    const ok = got.hidden && got.step === 'Accept the calendar invite';
    return { ok, detail: ok ? 'button hidden, step 1 points to the emailed invite' : JSON.stringify(got) };
  } finally {
    await context.close();
  }
}

(async () => {
  const { chromium, webkit, devices } = loadPlaywright();
  console.log(`Booking hand-off check against ${BASE} (${LIVE ? 'live slots' : 'fake slots'}; booking POST faked, tracking blocked)\n`);
  let failed = 0;
  for (const [browserType, device] of [[chromium, devices['Pixel 7']], [webkit, devices['iPhone 13']]]) {
    const browser = await launch(browserType);
    for (const offerPath of PAGES) {
      for (const zone of ZONES) {
        const r = await bookAndCheck(browser, device, offerPath, zone);
        if (!r.ok) failed++;
        console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${browserType.name().padEnd(8)} ${offerPath.padEnd(21)} ${zone.padEnd(19)} ${r.detail}`);
      }
    }
    const r = await checkNoBooking(browser, device);
    if (!r.ok) failed++;
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${browserType.name().padEnd(8)} /commercial/thankyou  no booking in tab   ${r.detail}`);
    await browser.close();
  }
  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
