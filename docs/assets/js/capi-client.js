/**
 * DSN Meta CAPI Client
 * Fires browser pixel + server-side CAPI in parallel, with deduplication via event_id.
 * Include this script on every funnel page AFTER the Meta Pixel base code.
 *
 * Call-queue safety: if an inline script calls DSN.trackEvent() before this
 * deferred script executes, those calls are stored in DSN._q and replayed here.
 */

// Pre-init stub — runs as soon as the parser sees this script (even with defer,
// this assignment happens before the IIFE runs, but we need it EARLIER;
// so pages with inline DSN.trackEvent calls should also set window.DSN={_q:[]} in
// their pixel <script> block. See queue replay below for the server-side safety net.

(function () {
  'use strict';

  /** Generate a UUID v4 for event deduplication */
  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  /**
   * Fire a Meta event via both browser pixel and CAPI.
   *
   * @param {string} eventName  - e.g. 'Lead', 'ViewContent', 'CompleteRegistration'
   * @param {object} [customData] - optional custom_data for CAPI
   * @param {object} [userData]   - optional hashed user_data for CAPI
   */
  window.DSN = window.DSN || {};

  // Replay any calls that were queued before this deferred script loaded
  var _queue = (window.DSN._q || []).slice();
  window.DSN._q = null; // signal: real impl is now active

  window.DSN.trackEvent = function (eventName, customData, userData) {
    var eventId = uuid();
    var sourceUrl = window.location.href;

    // 1️⃣ Browser-side pixel (already handles PageView — this is for standard events)
    if (typeof fbq === 'function') {
      fbq('track', eventName, customData || {}, { eventID: eventId });
    }

    // 2️⃣ Server-side CAPI via Netlify Function
    var payload = {
      event_name: eventName,
      event_id: eventId,
      event_source_url: sourceUrl,
      custom_data: customData || {},
      user_data: userData || {},
    };

    fetch('/.netlify/functions/capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true, // ensures request completes even if page navigates away
    }).catch(function (err) {
      console.warn('[DSN CAPI] Failed to send server-side event:', err);
    });
  };

  // Replay any calls queued before this deferred script loaded
  if (Array.isArray(_queue) && _queue.length) {
    _queue.forEach(function (args) {
      window.DSN.trackEvent.apply(window.DSN, args);
    });
  }

  /**
   * Auto-fire PageView via CAPI on every page load.
   * The browser pixel already fires fbq('track', 'PageView') — this sends
   * the same event server-side with the same event_id for deduplication.
   */
  window.DSN._pageViewId = uuid();

  if (typeof fbq === 'function') {
    // Re-fire PageView with an event_id so Meta can deduplicate with the CAPI call
    fbq('track', 'PageView', {}, { eventID: window.DSN._pageViewId });
  }

  fetch('/.netlify/functions/capi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: 'PageView',
      event_id: window.DSN._pageViewId,
      event_source_url: window.location.href,
    }),
    keepalive: true,
  }).catch(function () {});
})();
