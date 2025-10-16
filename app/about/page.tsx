import Link from "next/link";

import { BOOK_A_CALL_PATH } from "../../src/lib/links";

const missionVision = [
  {
    title: "Our mission — To provide impactful growth solutions",
    description:
      "This isn’t just a statement; it’s our commitment to every client we partner with. We dig into the specifics of your business, explore your potential, and build revenue programs that translate bold goals into predictable results.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    title: "Our vision — A world where business growth is no longer a challenge",
    description:
      "Imagine a world where growing your business is as smooth as sailing on a calm sea. That’s the future we’re building—a reality where every revenue leader has a reliable partner, every team has the tools to excel, and every growth target is within reach.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l2.4 4.86 5.35.78-3.87 3.78.91 5.31L12 15.77l-4.79 2.96.91-5.31L4.25 8.64l5.35-.78Z" />
      </svg>
    ),
  },
];

const values = [
  {
    title: "Growth",
    description:
      "We challenge ourselves to stay curious, learn relentlessly, and transform insights into breakthroughs for our clients and teammates.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V4" />
        <path d="m6 14 6-6 6 6" />
      </svg>
    ),
  },
  {
    title: "Honesty",
    description:
      "We communicate transparently, act with integrity, and stand by the promises we make to the people who trust us.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9Z" />
        <path d="M7.5 12a4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0-9 0Z" />
      </svg>
    ),
  },
  {
    title: "Reliability",
    description:
      "We show up prepared, deliver consistently, and create processes that help teams move faster with confidence.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12 9 17l11-11" />
      </svg>
    ),
  },
  {
    title: "Quality",
    description:
      "We obsess over the details, measure every outcome, and refine experiences until excellence becomes the standard.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4h18L18 20H6L3 4Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
];

const timeline = [
  {
    year: "2017",
    description: "Direct Sales Network® is founded to reinvent the way B2B companies generate qualified meetings.",
  },
  {
    year: "2018",
    description: "The team scales globally, partnering with ambitious brands across North America and Europe.",
  },
  {
    year: "2019",
    description: "Direct Sales Network® earns industry recognition for outbound expertise and client satisfaction.",
  },
  {
    year: "2020",
    description: "DSN® expands its enablement services, helping clients strengthen revenue operations end to end.",
  },
  {
    year: "2021",
    description: "We open new hubs and expand our leadership bench to accelerate customer success.",
  },
  {
    year: "2022",
    description: "DSN® introduces automation frameworks that empower SDR teams with precision outreach.",
  },
  {
    year: "2023",
    description: "Direct Sales Network® is honored with global awards for innovation, culture, and client outcomes.",
  },
  {
    year: "2024",
    description: "We continue to diversify our products and services to keep pace with modern buyers.",
  },
];

export default function Page() {
  return (
    <main id="main-content" className="about-page">
      <section className="section section--tight hero-about">
        <div className="container hero-about__grid">
          <div className="hero-about__content">
            <p className="hero-about__eyebrow">About us</p>
            <h1 className="hero-about__title">We’re here to help you grow</h1>
            <p className="hero-about__lead">
              Direct Sales Network® is proud to be a group of companies where talents’ and clients’ ambitions turn into achievements.
            </p>
          </div>
          <div className="hero-about__cta">
            <Link className="btn btn-primary" href={BOOK_A_CALL_PATH} prefetch={false}>
              Talk to an expert
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--alt mission-vision">
        <div className="container mission-vision__grid">
          {missionVision.map((item) => (
            <article key={item.title} className="mission-vision__card">
              <span className="icon-circle mission-vision__icon" aria-hidden="true">
                {item.icon}
              </span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section values-grid">
        <div className="container">
          <div className="values-grid__intro">
            <h2>Direct Sales Network® values</h2>
            <p>
              We foster personal and professional development, enabling our clients to prosper with us. Core values illuminate our
              journey to excellence.
            </p>
          </div>
          <div className="values-grid__list">
            {values.map((value) => (
              <article key={value.title} className="values-grid__card">
                <span className="icon-circle values-grid__icon" aria-hidden="true">
                  {value.icon}
                </span>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section history">
        <div className="container">
          <h2>Our history</h2>
          <ol className="history__timeline">
            {timeline.map((item) => (
              <li key={item.year} className="history__item">
                <div className="history__year">{item.year}</div>
                <p className="history__description">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--highlight careers-cta">
        <div className="container careers-cta__layout">
          <div className="careers-cta__content">
            <h2>Want to start career with us?</h2>
            <p>Check out our current job openings.</p>
          </div>
          <a className="btn btn-primary" href="/careers">
            We’re hiring
          </a>
        </div>
      </section>
    </main>
  );
}
