"use client";

import { useEffect } from "react";

const schedulerId = "hubspot-scheduler";

type SchedulerWindow = typeof window & {
  loadHubSpotScheduler?: (container: HTMLElement) => void;
};

export default function Page() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const schedulerElement = document.getElementById(schedulerId);

    if (!schedulerElement) {
      return;
    }

    const maybeLoadScheduler = (window as SchedulerWindow).loadHubSpotScheduler;

    if (typeof maybeLoadScheduler === "function") {
      maybeLoadScheduler(schedulerElement);
    }
  }, []);

  return (
    <div className="book-call">
      <section className="hero" aria-labelledby="book-call-title">
        <div className="container hero__layout">
          <div className="hero__content">
            <span className="hero__badge">Complimentary 30-minute strategy session</span>
            <h1 id="book-call-title">Book a call with our experts</h1>
            <p className="hero__lead">
              Discover how Direct Sales Network® builds predictable revenue engines across complex buying committees and long sales cycles.
            </p>
            <ul className="hero__list">
              <li>Assess your current pipeline health and outbound programs.</li>
              <li>Pinpoint the gaps that hold back consistent deal flow.</li>
              <li>Preview campaigns we&apos;ve launched for teams like yours.</li>
              <li>Outline an actionable 90-day plan to accelerate revenue.</li>
            </ul>
            <p className="hero__note">We meet you where you are today and map the path to your next growth milestone.</p>
          </div>
          <aside className="hero__stats" aria-label="Direct Sales Network impact metrics">
            <div className="stat-card">
              <span className="stat-card__figure">400+</span>
              <span className="stat-card__label">Qualified meetings added annually for top clients</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__figure">3.5x</span>
              <span className="stat-card__label">Average pipeline multiplier within the first two quarters</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__figure">94%</span>
              <span className="stat-card__label">Customer satisfaction score across ongoing retainers</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="section highlights" aria-labelledby="expect-title">
        <div className="container">
          <div className="section__header">
            <h2 id="expect-title">What you can expect from our session</h2>
            <p>We use this time to understand your goals, share benchmarks, and leave you with clarity on next steps—no pressure, no hard sell.</p>
          </div>
          <div className="grid highlights__grid">
            <article className="highlight-card">
              <h3>Revenue gap analysis</h3>
              <p>We review your current funnel, conversion metrics, and buyer engagement to identify the biggest opportunities for quick wins.</p>
            </article>
            <article className="highlight-card">
              <h3>Channel game plan</h3>
              <p>Our strategists outline how email, calling, LinkedIn, gifting, and events work together to surround your ideal buyers.</p>
            </article>
            <article className="highlight-card">
              <h3>Next-step blueprint</h3>
              <p>Walk away with a prioritized roadmap, clear resourcing needs, and the metrics we&apos;ll use to measure success together.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="schedule" className="section section--tight scheduler">
        <div className="container scheduler__layout">
          <div className="scheduler__intro">
            <h2>Choose a time that works for you</h2>
            <p>Pick a 30-minute slot that fits your schedule. Every consultation is free, actionable, and tailored to your revenue targets.</p>
            <ul>
              <li>Hosted on Zoom with sales and marketing strategists.</li>
              <li>We review existing assets in advance when you share them.</li>
              <li>Leave with meeting notes, benchmarks, and next-step recommendations.</li>
            </ul>
          </div>
          <div className="scheduler__embed" aria-live="polite">
            <div id={schedulerId} className="scheduler__placeholder" role="presentation">
              {/* TODO: Embed your scheduling widget here */}
              Your scheduling widget will load here. If nothing appears, refresh the page or email <a href="mailto:hello@directsalesnetwork.com">hello@directsalesnetwork.com</a> and we&apos;ll follow up right away.
            </div>
          </div>
        </div>
      </section>

      <section className="section trust">
        <div className="container">
          <div className="section__header">
            <h2>Why growth leaders book with DSN</h2>
            <p>
              Plug into a partner who brings proven systems, omnichannel specialists, and measurable outcomes to every engagement.
            </p>
          </div>
          <div className="grid trust__grid">
            <article className="trust-card">
              <span className="icon-circle" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6l8-4 8 4v6c0 5-3.33 9.67-8 10-4.67-.33-8-5-8-10V6z"></path>
                  <path d="M9 12l2 2 4-4"></path>
                </svg>
              </span>
              <h3>Proven track record</h3>
              <p>
                See how we deliver 100–400+ qualified appointments annually for brands across SaaS, logistics, and industrial
                markets.
              </p>
            </article>
            <article className="trust-card">
              <span className="icon-circle" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 5h18"></path>
                  <path d="M3 12h18"></path>
                  <path d="M3 19h18"></path>
                  <path d="M7 5v14"></path>
                  <path d="M17 5v14"></path>
                </svg>
              </span>
              <h3>Omnichannel strategies</h3>
              <p>Unify email, LinkedIn, calling, and gifting to surround your ideal buyers with helpful, relevant touchpoints.</p>
            </article>
            <article className="trust-card">
              <span className="icon-circle" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20l-7-6 7-6 7 6-7 6z"></path>
                  <path d="M5 14l7 6 7-6"></path>
                  <path d="M5 10l7-6 7 6"></path>
                </svg>
              </span>
              <h3>Customized roadmaps</h3>
              <p>Leave with a playbook tailored to your funnel, team structure, and revenue goals.</p>
            </article>
            <article className="trust-card">
              <span className="icon-circle" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 10h6"></path>
                  <path d="M9 14h6"></path>
                  <path d="M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"></path>
                  <path d="m9 6 3-3 3 3"></path>
                </svg>
              </span>
              <h3>No pressure—just insights</h3>
              <p>Expect a collaborative session focused on sharing benchmarks and next steps without contracts or commitments.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section process" aria-labelledby="process-title">
        <div className="container">
          <div className="section__header">
            <h2 id="process-title">How our team shows up for you</h2>
            <p>Consider this your preview of partnering with Direct Sales Network®. Every engagement follows a proven rhythm focused on outcomes.</p>
          </div>
          <ol className="process__steps">
            <li>
              <h3>Discovery &amp; alignment</h3>
              <p>We dig into ICPs, territories, current messaging, and historic performance to confirm the right foundation.</p>
            </li>
            <li>
              <h3>Campaign architecture</h3>
              <p>Our specialists design the multichannel plays, cadences, and enablement assets needed to surround prospects.</p>
            </li>
            <li>
              <h3>Launch &amp; optimization</h3>
              <p>We deploy quickly, then iterate weekly using performance data, rep feedback, and market signals.</p>
            </li>
            <li>
              <h3>Revenue reporting</h3>
              <p>Transparent dashboards show sourced pipeline, influenced deals, and lessons learned to keep growth compounding.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section testimonials" aria-labelledby="reviews-title">
        <div className="container">
          <div className="section__header">
            <h2 id="reviews-title">Leaders trust DSN to keep their calendars full</h2>
            <p>See why CROs, CMOs, and founders rely on DSN to keep their outbound engines firing.</p>
          </div>
          <div className="grid testimonials__grid">
            <figure className="testimonial-card">
              <blockquote>
                “In 90 days our SDR calendar was filled with qualified demos. DSN brought the exact messaging and systems we needed.”
              </blockquote>
              <figcaption>
                <span className="testimonial-card__name">Lena Howard</span>
                <span className="testimonial-card__role">VP of Revenue, TechNova</span>
              </figcaption>
            </figure>
            <figure className="testimonial-card">
              <blockquote>
                “Their omnichannel outreach helped us break into enterprise accounts we’d chased for years. The insights from the discovery call were invaluable.”
              </blockquote>
              <figcaption>
                <span className="testimonial-card__name">Caleb Martinez</span>
                <span className="testimonial-card__role">Head of Growth, Summit Logistics</span>
              </figcaption>
            </figure>
            <figure className="testimonial-card">
              <blockquote>
                “DSN feels like an extension of our team. Each strategy session ends with clear actions that keep our pipeline humming.”
              </blockquote>
              <figcaption>
                <span className="testimonial-card__name">Priya Singh</span>
                <span className="testimonial-card__role">Chief Marketing Officer, Atlas Industrial</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="section faq">
        <div className="container">
          <div className="section__header">
            <h2>Frequently asked questions</h2>
          </div>
          <div className="faq__list">
            <details>
              <summary>What happens on the call?</summary>
              <p>
                We’ll review your current outbound programs, diagnose gaps, and explore the results you want to achieve in the next 6–12 months.
              </p>
            </details>
            <details>
              <summary>How long is the consultation?</summary>
              <p>
                Each consultation lasts 30 minutes. We reserve time at the end to agree on next steps or share additional resources.
              </p>
            </details>
            <details>
              <summary>Do I have to sign anything afterwards?</summary>
              <p>
                No. The goal is to give you clarity. If partnering with DSN makes sense, we’ll outline what collaboration could look like.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="section support" aria-labelledby="support-title">
        <div className="container support__layout">
          <div>
            <h2 id="support-title">Need a hand before you schedule?</h2>
            <p>We&apos;re happy to answer quick questions or coordinate a time manually. Reach out and we&apos;ll get back within one business day.</p>
          </div>
          <ul className="support__list">
            <li>
              <span className="support__label">Email</span>
              <a href="mailto:hello@directsalesnetwork.com">hello@directsalesnetwork.com</a>
            </li>
            <li>
              <span className="support__label">Phone</span>
              <a href="tel:+18885551234">(888) 555-1234</a>
            </li>
            <li>
              <span className="support__label">Resources</span>
              <a href="/case-studies">Explore our latest case studies</a>
            </li>
          </ul>
        </div>
      </section>

      <section className="cta-band" aria-labelledby="cta-band-title">
        <div className="container cta-band__content">
          <div>
            <h2 id="cta-band-title">Ready to see how we can help you grow? Let’s talk.</h2>
            <p>Let’s talk about your goals and build the roadmap to predictable pipeline together.</p>
          </div>
          <a className="btn btn-primary" href="#schedule" aria-label="Talk to an expert">
            Talk to an expert
          </a>
        </div>
      </section>
    </div>
  );
}
