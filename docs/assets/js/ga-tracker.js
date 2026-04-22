/**
 * GA4 Comprehensive Tracker
 * Automatically tracks button clicks, link clicks, form submissions, and funnel stages.
 */

(function () {
  'use strict';

  // Ensure window.gtag exists. It should be initialized by the GA4 base snippet.
  // FIX #1: reference window.dataLayer explicitly so it isn't lost inside the IIFE scope.
  if (typeof window.gtag !== 'function') {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
  }

  /**
   * 1. Funnel Stage Tracking
   * Evaluate the URL path to determine which funnel stage the user is currently viewing.
   */
  var path = window.location.pathname.toLowerCase();
  var funnelStage = 'Other';

  // FIX #2: Use more precise matching so sub-directory index.html pages
  // (e.g. /commercial/reviews/index.html) don't get labelled "Homepage".
  if (path === '/' || path === '/index.html' || path.match(/\/docs\/?$/) || path.match(/\/docs\/index\.html$/)) {
    funnelStage = 'Homepage';
  } else if (path.includes('/commercial/offer')) {
    funnelStage = 'Commercial - Offer';
  } else if (path.includes('/commercial/pre-call')) {
    funnelStage = 'Commercial - Pre-Call';
  } else if (path.includes('/commercial/callconfirmed')) {
    funnelStage = 'Commercial - Call Confirmed';
  } else if (path.includes('/commercial/thankyou')) {
    funnelStage = 'Commercial - Thank You';
  } else if (path.includes('/commercial/reschedule')) {
    funnelStage = 'Commercial - Reschedule';
  } else if (path.includes('/commercial/checklist')) {
    funnelStage = 'Commercial - Checklist';
  } else if (path.includes('/commercial/reviews')) {
    funnelStage = 'Commercial - Reviews';
  } else if (path.includes('/commercial/sla')) {
    funnelStage = 'Commercial - SLA';
  } else if (path.includes('/trial/offer')) {
    funnelStage = 'Trial - Offer';
  } else if (path.includes('/trial/pre-call')) {
    funnelStage = 'Trial - Pre-Call';
  } else if (path.includes('/trial/callconfirmed')) {
    funnelStage = 'Trial - Call Confirmed';
  } else if (path.includes('/trial/thankyou')) {
    funnelStage = 'Trial - Thank You';
  } else if (path.includes('/trial/reschedule')) {
    funnelStage = 'Trial - Reschedule';
  } else if (path.includes('/book-a-call')) {
    funnelStage = 'Book a Call';
  } else if (path.includes('/about')) {
    funnelStage = 'About';
  } else if (path.includes('/contact')) {
    funnelStage = 'Contact';
  } else if (path.includes('/services-and-solutions')) {
    funnelStage = 'Services & Solutions';
  } else if (path.includes('/industries')) {
    funnelStage = 'Industries';
  } else if (path.includes('/case-studies')) {
    funnelStage = 'Case Studies';
  } else if (path.includes('/faq')) {
    funnelStage = 'FAQ';
  }

  // Fire funnel stage view event
  window.gtag('event', 'funnel_stage_view', {
    'funnel_stage': funnelStage,
    'page_path': path
  });

  /**
   * 2. Global Click Tracking
   * Uses event delegation to catch all clicks on links and buttons.
   */
  document.addEventListener('click', function (e) {
    var target = e.target.closest('a, button, input[type="submit"], input[type="button"]');
    if (!target) return;

    // FIX #3: Strip SVG and hidden element text to get a clean label.
    // Clones the node, removes all SVG children, then reads innerText.
    var labelEl = target.cloneNode(true);
    var svgs = labelEl.querySelectorAll('svg, [aria-hidden="true"]');
    svgs.forEach(function (s) { s.remove(); });
    var rawText = (labelEl.innerText || labelEl.textContent || '').replace(/\s+/g, ' ').trim();

    var label = rawText
      || target.value
      || target.getAttribute('aria-label')
      || target.id
      || 'unknown_button';
    label = label.substring(0, 100); // Truncate if too long

    var destinationUrl = target.href || '';
    var elementId = target.id || '';
    var elementClasses = (typeof target.className === 'string') ? target.className : '';

    window.gtag('event', 'interaction_click', {
      'event_category': 'Engagement',
      'event_label': label,
      'link_url': destinationUrl,
      'element_id': elementId,
      'element_classes': elementClasses,
      'funnel_stage': funnelStage
    });
  });

  /**
   * 3. Global Form Submission Tracking
   * Catches all form submissions.
   */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    var formId = form.id || form.name || form.getAttribute('action') || 'unknown_form';

    window.gtag('event', 'form_submit', {
      'event_category': 'Engagement',
      'event_label': formId,
      'form_id': formId,
      'funnel_stage': funnelStage
    });
  });

})();
