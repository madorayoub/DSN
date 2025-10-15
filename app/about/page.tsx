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
    description: "Belkins is founded to reinvent the way B2B companies generate qualified meetings.",
  },
  {
    year: "2018",
    description: "The team scales globally, partnering with ambitious brands across North America and Europe.",
  },
  {
    year: "2019",
    description: "Belkins earns industry recognition for outbound expertise and client satisfaction.",
  },
  {
    year: "2020",
    description: "Folderly launches, transforming email deliverability for revenue teams worldwide.",
  },
  {
    year: "2021",
    description: "We open new hubs and expand our leadership bench to accelerate customer success.",
  },
  {
    year: "2022",
    description: "Charge joins the portfolio, empowering SDRs with a purpose-built outreach platform.",
  },
  {
    year: "2023",
    description: "Belkins is honored with global awards for innovation, culture, and client outcomes.",
  },
  {
    year: "2024",
    description: "We continue to diversify our products and services to keep pace with modern buyers.",
  },
];

const products = [
  {
    name: "Folderly",
    description: "Email deliverability software that keeps outreach out of spam and inside your prospects’ inboxes.",
    href: "https://folderly.com",
    cta: "Explore Folderly",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="M4 10h16" />
        <path d="M10 22v-6" />
        <path d="M14 22v-6" />
      </svg>
    ),
  },
  {
    name: "Charge",
    description: "Bulk email outreach plugin that empowers SDR teams with precision sequencing and personalization.",
    href: "https://chargemyemail.com",
    cta: "Discover Charge",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h10" />
        <path d="M18 17h2" />
      </svg>
    ),
  },
];

const team = [
  { name: "Vlad", title: "Founder & CEO" },
  { name: "Michael", title: "Co-founder & Managing Partner" },
  { name: "Brian", title: "VP of Sales" },
  { name: "Alex", title: "Managing Director" },
  { name: "Margaret", title: "CMO" },
  { name: "George", title: "Head of Account Management" },
  { name: "Dimitri", title: "CTO" },
  { name: "Natalie", title: "CFO" },
  { name: "Julia", title: "Head of Sales Operations" },
  { name: "Alla", title: "Head of SDR" },
  { name: "Alex", title: "Head of Email Deliverability" },
  { name: "Cyril", title: "Head of Content" },
  { name: "Mary", title: "HR Director" },
];

const offices = [
  {
    country: "United States",
    locations: [
      { city: "Delaware", address: "8 The Green, Suite 4336, Dover, DE 19901" },
      { city: "Colorado", address: "242 Linden Street, Fort Collins, CO 80524" },
    ],
  },
  {
    country: "Poland",
    locations: [{ city: "Warsaw", address: "Rondo Daszyńskiego 2B, 00-843 Warsaw" }],
  },
  {
    country: "Ukraine",
    locations: [
      { city: "Kyiv", address: "Yaroslavska Street, 58, Kyiv, 04071" },
      { city: "Lviv", address: "Heroiv UPA Street, 73, Lviv, 79018" },
    ],
  },
];

const inspiration = [
  {
    title: "We’re on media",
    subtitle: "News & press",
    href: "https://belkins.io/news",
    linkText: "Explore stories",
  },
  {
    title: "New season",
    subtitle: "Belkins Podcast",
    href: "https://belkins.io/podcast",
    linkText: "Listen now",
  },
  {
    title: "Our achievements",
    subtitle: "Belkins awards",
    href: "https://belkins.io/awards",
    linkText: "View highlights",
  },
];

export default function Page() {
  return (
    <main id="main-content">
      <section className="section section--tight hero-about">
        <div className="container hero-about__grid">
          <div className="hero-about__content">
            <p className="hero-about__eyebrow">About us</p>
            <h1 className="hero-about__title">We’re here to help you grow</h1>
            <p className="hero-about__lead">
              Belkins is proud to be a group of companies where talents’ and clients’ ambitions turn into achievements.
            </p>
          </div>
          <div className="hero-about__cta">
            <a className="btn btn-primary" href="/contact#book-a-call">
              Let’s get acquainted
            </a>
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
            <h2>Belkins’ values</h2>
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

      <section className="section products">
        <div className="container">
          <div className="products__header">
            <h2>Products we launched</h2>
            <p>Purpose-built platforms that remove friction from revenue operations.</p>
          </div>
          <div className="products__grid">
            {products.map((product) => (
              <article key={product.name} className="product-card">
                <span className="icon-circle product-card__icon" aria-hidden="true">
                  {product.icon}
                </span>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <a className="btn btn-outline" href={product.href} target="_blank" rel="noopener">
                  {product.cta}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section team">
        <div className="container">
          <div className="team__header">
            <h2>Meet our leadership team</h2>
            <p>The people guiding our growth across DSN and Belkins.</p>
          </div>
          <div className="team__grid">
            {team.map((leader) => (
              <article key={`${leader.name}-${leader.title}`} className="team-card">
                <span className="team-card__avatar" aria-hidden="true"></span>
                <h3>{leader.name}</h3>
                <p>{leader.title}</p>
              </article>
            ))}
          </div>
          <div className="team__actions">
            <a className="btn btn-outline" href="#">
              Show all
            </a>
          </div>
        </div>
      </section>

      <section className="section offices">
        <div className="container">
          <div className="offices__header">
            <h2>DSN worldwide</h2>
            <p>Global offices that support our clients wherever they grow.</p>
          </div>
          <div className="offices__grid">
            {offices.map((office) => (
              <article key={office.country} className="office-card">
                <span className="icon-circle office-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9Z" />
                    <path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                    <path d="M12 21s-4-5-4-9a4 4 0 0 1 8 0c0 4-4 9-4 9Z" />
                  </svg>
                </span>
                <h3>{office.country}</h3>
                {office.locations.map((location) => (
                  <p key={`${office.country}-${location.city}`}>
                    {location.city}
                    <br />
                    {location.address}
                  </p>
                ))}
              </article>
            ))}
          </div>
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

      <section className="section inspiration">
        <div className="container">
          <div className="inspiration__header">
            <h2>Get inspired with Belkins</h2>
            <p>Dive into stories, conversations, and accolades from across our community.</p>
          </div>
          <div className="inspiration__list">
            {inspiration.map((item) => (
              <article key={item.title} className="inspiration__item">
                <h3>{item.title}</h3>
                <p>{item.subtitle}</p>
                <a className="inspiration__link" href={item.href} target="_blank" rel="noopener">
                  {item.linkText}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
