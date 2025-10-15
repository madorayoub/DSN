const channels = [
  "Omnichannel appointment setting",
  "Cold email outreach",
  "Cold and intent calling",
  "Voicemails",
  "SMS / WhatsApp",
  "LinkedIn lead generation",
  "Paid advertising",
];

const serviceCategories = [
  {
    title: "Sales development",
    description:
      "Build and optimize your sales pipeline with dedicated specialists who align every motion to your goals.",
  },
  {
    title: "Outsourced SDRs",
    description: "Extend your team with SDRs trained to represent your brand flawlessly across every channel.",
  },
  {
    title: "Lead generation",
    description: "Fill your calendar with qualified meetings sourced through data-driven research and outreach.",
  },
  {
    title: "Sales enablement",
    description: "Equip your reps with messaging, playbooks, and assets engineered to boost win rates.",
  },
  {
    title: "Lead nurturing",
    description: "Re-engage stalled opportunities through timely, personalized touchpoints that move deals forward.",
  },
  {
    title: "Lead generation training",
    description: "Coach your internal team on scalable outreach frameworks and best-in-class prospecting tactics.",
  },
  {
    title: "Demand generation",
    description: "Launch integrated campaigns that keep every stage of your funnel fueled with intent-rich prospects.",
  },
  {
    title: "HubSpot CRM consulting",
    description: "Streamline RevOps workflows and reporting with guidance from certified HubSpot experts.",
  },
  {
    title: "Deliverability consulting",
    description: "Protect your sender reputation and maximize inbox placement for every outbound sequence.",
  },
  {
    title: "Account-based marketing",
    description: "Target high-value accounts with bespoke, multi-channel motions tailored to each buying committee.",
  },
];

export default function Page() {
  return (
    <main className="container page">
      <h1>Services &amp; solutions</h1>

      <section className="section section--tight hero-services">
        <p className="lead">
          Transcending industry fluctuations, our growth solutions will continuously increase your pipeline up to 45% at
          just a fourth of the in-house cost.
        </p>
        <ul className="channels-list">
          {channels.map((channel) => (
            <li key={channel}>{channel}</li>
          ))}
        </ul>
        <a className="btn btn-primary" href="/contact#book-a-call">
          Get a quote
        </a>
      </section>

      <section className="section plan-services">
        <p className="section__subtitle">
          Meet our all-inclusive B2B lead generation services performed by world-class sales experts:
        </p>
        <div className="plan-services__list plan-services__list--cards">
          {serviceCategories.map((service) => (
            <div className="plan-card" key={service.title}>
              <div className="plan-card__body">
                <h3 className="plan-card__title">{service.title}</h3>
                <p className="plan-card__description">{service.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
