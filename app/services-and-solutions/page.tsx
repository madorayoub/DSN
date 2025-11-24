import Link from "next/link";

import { BOOK_A_CALL_PATH } from "../../src/lib/links";

const channelHighlights = [
  {
    name: "Omnichannel appointment setting",
    description: "Synchronize every touch to convert buying committees into booked meetings.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 10h2" />
        <path d="M16 14h2" />
        <path d="M6 10h2" />
        <path d="M6 14h2" />
        <path d="M10 6h4" />
      </svg>
    ),
  },
  {
    name: "Cold email outreach",
    description: "Nurture prospects with personalized sequences that cut through inbox noise.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
        <polyline points="3,7 12,13 21,7" />
      </svg>
    ),
  },
  {
    name: "Cold and intent calling",
    description: "Connect voice-to-voice when readiness spikes to qualify faster and close sooner.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.85 12.85 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8 9a16 16 0 0 0 7 7l.36-.36a2 2 0 0 1 2.11-.45 12.85 12.85 0 0 0 2.81.7A2 2 0 0 1 22 16.92" />
      </svg>
    ),
  },
  {
    name: "Voicemails",
    description: "Leave memorable, value-led follow-ups that keep your solution top of mind.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 3 2 11l6 2 2 6 12-16z" />
        <path d="m9.37 12.26 4.26 2.37" />
      </svg>
    ),
  },
  {
    name: "SMS / WhatsApp",
    description: "Send timely nudges that keep conversations going between live touchpoints.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
        <path d="M16 17v2" />
        <path d="M8 17v2" />
      </svg>
    ),
  },
  {
    name: "LinkedIn lead generation",
    description: "Build trust with targeted social selling cadences that spotlight your expertise.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="M4 9h16" />
        <path d="M9 9v11" />
      </svg>
    ),
  },
  {
    name: "Paid advertising",
    description: "Capture in-market buyers with campaigns that amplify outbound momentum.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="M4 10h16" />
        <path d="M10 22v-6" />
        <path d="M14 22v-6" />
        <path d="m7 4 5-2 5 2" />
      </svg>
    ),
  },
];

const serviceCategories = [
  {
    title: "Sales development",
    description:
      "Build and optimize your sales pipeline with dedicated specialists who align every motion to your goals.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M18 17V9" />
        <path d="M13 17V5" />
        <path d="M8 17v-3" />
      </svg>
    ),
  },
  {
    title: "Outsourced SDRs",
    description: "Extend your team with SDRs trained to represent your brand flawlessly across every channel.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h4l2 10h9l2-6H9" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="19" cy="20" r="1" />
      </svg>
    ),
  },
  {
    title: "Lead generation",
    description: "Fill your calendar with qualified meetings sourced through data-driven research and outreach.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 6H3" />
        <path d="M7 12H3" />
        <path d="M21 12H11" />
        <path d="M7 18H3" />
        <path d="M21 18H11" />
        <path d="M14 6 9 18" />
      </svg>
    ),
  },
  {
    title: "Sales enablement",
    description: "Equip your reps with messaging, playbooks, and assets engineered to boost win rates.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 3 3 9-3 9" />
        <path d="M6 12h4" />
        <path d="M10 9h10" />
        <path d="M14 6h6" />
        <path d="M10 15h8" />
        <path d="M14 18h4" />
      </svg>
    ),
  },
  {
    title: "Lead nurturing",
    description: "Re-engage stalled opportunities through timely, personalized touchpoints that move deals forward.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h18v4H3z" />
        <path d="M3 11h18v10H3z" />
        <path d="M7 15h6" />
      </svg>
    ),
  },
  {
    title: "Lead generation training",
    description: "Coach your internal team on scalable outreach frameworks and best-in-class prospecting tactics.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4h18" />
        <path d="M4 8h16" />
        <path d="M5 12h14" />
        <path d="M6 16h12" />
        <path d="M7 20h10" />
      </svg>
    ),
  },
  {
    title: "Demand generation",
    description: "Launch integrated campaigns that keep every stage of your funnel fueled with intent-rich prospects.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h6l6 18h6" />
        <path d="M5 7h8" />
      </svg>
    ),
  },
  {
    title: "HubSpot CRM consulting",
    description: "Streamline RevOps workflows and reporting with guidance from certified HubSpot experts.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M6 15h12" />
        <path d="M5 19h14" />
      </svg>
    ),
  },
  {
    title: "Deliverability consulting",
    description: "Protect your sender reputation and maximize inbox placement for every outbound sequence.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h18" />
        <path d="M9 3v4" />
        <path d="M15 3v4" />
        <path d="M4 9h16v10H4z" />
        <path d="m9 13 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Account-based marketing",
    description: "Target high-value accounts with bespoke, multi-channel motions tailored to each buying committee.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h4l2 10h12" />
        <path d="M13 5h8v6h-8z" />
        <path d="M13 9h8" />
      </svg>
    ),
  },
];

const differentiators = [
  {
    title: "Tailored omnichannel strategies",
    description: "We orchestrate custom cadences that feel personal across every channel and persona.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="m2 12 7-7 7 7" />
        <path d="M9 5v14" />
        <path d="m15 19 5-5-5-5" />
      </svg>
    ),
  },
  {
    title: "World-class talent",
    description: "Senior SDRs, researchers, and strategists embed with your team to deliver enterprise-ready execution.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20" />
        <path d="m17 7-5-5-5 5" />
        <path d="m7 17 5 5 5-5" />
      </svg>
    ),
  },
  {
    title: "First results within a month",
    description: "Stand up campaigns quickly with proven playbooks that unlock qualified conversations fast.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: "B2B-focused expertise",
    description: "Every play is built for complex buying committees and long sales cycles in high-stakes industries.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3 7.5 4.5v9L12 21 4.5 16.5v-9L12 3z" />
        <path d="M12 12 19.5 7.5" />
        <path d="M12 12v9" />
      </svg>
    ),
  },
];

function ChannelHighlights() {
  return (
    <section className="section section--alt channels-detailed">
      <div className="container">
        <div className="channels-detailed__header">
          <h2>Seven channels, one cohesive buying journey</h2>
          <p>
            Blend human-led outreach with data-backed timing to engage prospects wherever they respond best and move deals
            forward faster.
          </p>
        </div>
        <div className="channels-detailed__grid feature-grid feature-grid--three">
          {channelHighlights.map((channel) => (
            <article className="channel-card feature-card" key={channel.name}>
              <div className="feature-card__header">
                <span className="icon-circle feature-card__icon" aria-hidden="true">
                  {channel.icon}
                </span>
                <h3>{channel.name}</h3>
              </div>
              <p>{channel.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CoreServices() {
  return (
    <section className="section plan-services services-categories">
      <div className="container">
        <p className="section__subtitle">
          Meet our all-inclusive B2B lead generation services performed by world-class sales experts:
        </p>
        <div className="plan-services__list plan-services__list--cards services-categories__grid feature-grid feature-grid--services">
          {serviceCategories.map((service) => (
            <article className="plan-card feature-card" key={service.title}>
              <div className="feature-card__header">
                <span className="icon-circle feature-card__icon" aria-hidden="true">
                  {service.icon}
                </span>
                <h3 className="plan-card__title">{service.title}</h3>
              </div>
              <p className="plan-card__description">{service.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Differentiators() {
  return (
    <section className="section section--alt differentiators">
      <div className="container">
        <h2>Why choose Direct Sales Network®</h2>
        <div className="differentiators__grid feature-grid feature-grid--four">
          {differentiators.map((item) => (
            <article className="differentiator-card feature-card" key={item.title}>
              <div className="feature-card__header">
                <span className="icon-circle feature-card__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <h3>{item.title}</h3>
              </div>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="section cta-band">
      <div className="container">
        <div className="cta-band__surface">
          <div className="cta-band__content">
            <h2>Ready to accelerate your pipeline?</h2>
            <p>Let’s build predictable growth together with omnichannel programs built to scale.</p>
          </div>
          <Link className="btn btn-primary" href={BOOK_A_CALL_PATH} prefetch={false}>
            Talk to an expert
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <main id="main-content">
      <ChannelHighlights />
      <CoreServices />
      <Differentiators />
      <ClosingCTA />
    </main>
  );
}
