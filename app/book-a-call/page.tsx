"use client";

import { useEffect, useRef } from "react";

const CALENDLY_SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";
const FALLBACK_SCHEDULER_URL = "https://calendly.com/direct-sales-network/30min";

type CalendlyWindow = Window & {
  Calendly?: {
    initInlineWidgets?: () => void;
  };
};

export default function BookACallPage() {
  const schedulerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const container = schedulerRef.current;

    if (!container) {
      return undefined;
    }

    container.innerHTML = "";

    const widget = document.createElement("div");
    widget.className = "calendly-inline-widget";
    widget.setAttribute(
      "data-url",
      process.env.NEXT_PUBLIC_SCHEDULING_URL || FALLBACK_SCHEDULER_URL,
    );
    widget.style.minWidth = "100%";
    widget.style.height = "720px";
    container.appendChild(widget);

    const initializeCalendly = () => {
      const calendly = (window as CalendlyWindow).Calendly;

      if (calendly?.initInlineWidgets) {
        calendly.initInlineWidgets();
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${CALENDLY_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      if (existingScript.dataset.initialized === "true") {
        initializeCalendly();
        return undefined;
      }

      const handleLoad = () => {
        existingScript.dataset.initialized = "true";
        initializeCalendly();
      };

      existingScript.addEventListener("load", handleLoad, { once: true });

      return () => {
        existingScript.removeEventListener("load", handleLoad);
      };
    }

    const script = document.createElement("script");
    script.src = CALENDLY_SCRIPT_SRC;
    script.async = true;

    const handleLoad = () => {
      script.dataset.initialized = "true";
      initializeCalendly();
    };

    script.addEventListener("load", handleLoad, { once: true });
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", handleLoad);
    };
  }, []);

  return (
    <div id="book-a-call" className="book-call-page">
      <section className="section hero-book" aria-labelledby="book-hero-title">
        <div className="container">
          <h1 id="book-hero-title" className="h1">
            Book a call with our experts
          </h1>
          <p className="lead">
            Schedule a free, no-obligation consultation to see how Direct Sales Network® can accelerate your pipeline with an omnichannel plan tailored to your ICP.
          </p>
        </div>
      </section>

      <section className="section section--elevated" aria-labelledby="schedule-time">
        <div className="container">
          <h2 id="schedule-time" className="h3">
            Choose a time that works for you
          </h2>
          <p className="muted">
            30-minute strategy session. It’s free, and you’ll leave with a clear action plan.
          </p>
          <div className="scheduler-frame" role="region" aria-label="Scheduling widget">
            <div ref={schedulerRef} aria-live="polite" />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="why-dsn">
        <div className="container">
          <h2 id="why-dsn" className="h3">
            Why growth leaders book with DSN
          </h2>
          <ul className="cards-grid cards-grid--four" role="list">
            <li className="card">
              <h3 className="card__title">Proven track record</h3>
              <p className="card__body">
                Playbooks that generate consistent pipeline for teams like yours.
              </p>
            </li>
            <li className="card">
              <h3 className="card__title">Omnichannel strategies</h3>
              <p className="card__body">
                Email, call, social, and paid motions working together for speed.
              </p>
            </li>
            <li className="card">
              <h3 className="card__title">Customized roadmaps</h3>
              <p className="card__body">
                Aligned to your ICP, buying committees, and revenue targets.
              </p>
            </li>
            <li className="card">
              <h3 className="card__title">No pressure — just insights</h3>
              <p className="card__body">
                Leave with actionable recommendations, whether we work together or not.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="teams-trust">
        <div className="container">
          <h2 id="teams-trust" className="h3">
            Teams trust DSN to keep their calendars full
          </h2>
          <ul className="cards-grid testimonials-grid" role="list">
            <li className="card quote">
              <blockquote>
                “Within the first quarter, DSN doubled qualified demos while keeping prospects excited to meet.”
              </blockquote>
              <footer className="quote__meta">Rob Domenico — CRO, Data Gammix</footer>
            </li>
            <li className="card quote">
              <blockquote>
                “Their omnichannel approach uncovered buying committees and reactivated stalled opportunities fast.”
              </blockquote>
              <footer className="quote__meta">Kateryna Bota — CMO, LEAFIO Inc</footer>
            </li>
            <li className="card quote">
              <blockquote>
                “We rely on DSN like an extension of our team—the insights we get from every session are gold.”
              </blockquote>
              <footer className="quote__meta">Patrick Benasillo — Co-Founder, Direct Placement®</footer>
            </li>
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="faq-title">
        <div className="container">
          <h2 id="faq-title" className="h3">
            Frequently asked questions
          </h2>
          <div className="accordion" role="list">
            <details className="accordion__item">
              <summary className="accordion__summary">What happens on the call?</summary>
              <div className="accordion__panel">
                A 30-minute strategy review: current pipeline, ICP, channels, benchmarks, and a recommended plan.
              </div>
            </details>
            <details className="accordion__item">
              <summary className="accordion__summary">How long is the consultation?</summary>
              <div className="accordion__panel">Typically 30 minutes.</div>
            </details>
            <details className="accordion__item">
              <summary className="accordion__summary">Do I have to sign anything afterwards?</summary>
              <div className="accordion__panel">
                No. You’ll get recommendations and next steps; partnering with Direct Sales Network® is entirely up to you.
              </div>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
