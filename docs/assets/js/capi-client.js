/**
 * DSN Meta CAPI Client
 * Sends each event through the browser pixel and through the Netlify CAPI function
 * with the same event_id, so Meta counts it once whichever copies arrive.
 *
 * The Meta Pixel block in each page's <head> must run first. It fires the browser
 * PageView tagged with DSN._pageViewId, and it stubs DSN.trackEvent so calls made
 * before this file loads (it's deferred on most pages) queue in DSN._q instead of
 * being dropped. This file sends the server copy of that PageView and replays the queue.
 *
 * Bookings aren't tracked here: booking.js sends Schedule server-side.
 *
 * /assets/* is cached for a year (see _headers), so pages load this with a ?v=
 * query. Bump it on every change, or returning visitors keep the old copy.
 */

(function () {
  'use strict';

  var ENDPOINT = '/.netlify/functions/capi';

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

  /** Server-side copy via the Netlify function */
  function sendToServer(eventName, eventId, customData) {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        custom_data: customData || {},
      }),
      keepalive: true, // ensures request completes even if page navigates away
    }).catch(function (err) {
      console.warn('[DSN CAPI] Failed to send server-side event:', err);
    });
  }

  window.DSN = window.DSN || {};
  var queued = (window.DSN._q || []).slice();
  window.DSN._q = null; // signal: real impl is now active

  /**
   * Fire a Meta event via both browser pixel and CAPI.
   *
   * @param {string} eventName  - e.g. 'Lead', 'ViewContent', 'CompleteRegistration'
   * @param {object} [customData] - optional custom_data (content_name, currency, value)
   */
  window.DSN.trackEvent = function (eventName, customData) {
    var eventId = uuid();
    if (typeof fbq === 'function') {
      fbq('track', eventName, customData || {}, { eventID: eventId });
    }
    sendToServer(eventName, eventId, customData);
  };

  queued.forEach(function (args) {
    window.DSN.trackEvent.apply(window.DSN, args);
  });

  // The pixel sends one PageView per page and ignores any later one, so the server
  // copy has to reuse the id the <head> block tagged it with. A page without that id
  // sent its PageView untagged, and a server copy would be counted as a second view.
  if (window.DSN._pageViewId) {
    sendToServer('PageView', window.DSN._pageViewId);
  }
})();
