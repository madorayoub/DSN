"use client";

const FEATURE_IMAGE_URL =
  "https://res.cloudinary.com/diptffkzh/image/upload/v1759992729/omnichannel-desktop.V37vSY3Y_wju53j.webp";

const FEATURE_TITLE = "Omnichannel appointment setting";

const FEATURE_BULLETS = [
  "Cold email outreach",
  "Cold and intent calling",
  "Voicemails",
  "SMS / WhatsApp",
  "LinkedIn lead generation",
  "Paid advertising",
];

const SERVICES = [
  "Sales development",
  "Outsourced SDRs",
  "Lead generation",
  "Sales enablement",
  "Lead nurturing",
  "Lead generation training",
  "Demand generation",
  "HubSpot CRM consulting",
  "Deliverability consulting",
  "Account-based marketing",
];

const ClientPlanSection = () => {
  return (
    <section className="client-plan" aria-labelledby="client-plan-heading">
      <div className="container">
        <div className="client-plan__intro">
          <h2 className="client-plan__title" id="client-plan-heading">
            Client acquisition plan
            <br />
            done for you
          </h2>
          <p className="client-plan__description">
            Transcending industry fluctuations, our growth solutions will continuously increase your pipeline up to 45% at just
            a fourth of the in-house cost.
          </p>
        </div>
        <div className="client-plan__layout">
          <article className="plan-card">
            <figure className="plan-card__figure">
              <img src={FEATURE_IMAGE_URL} alt="" loading="lazy" decoding="async" />
            </figure>
            <div className="plan-card__body">
              <h3 className="plan-card__title">{FEATURE_TITLE}</h3>
              <ul className="plan-card__list">
                {FEATURE_BULLETS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className="plan-card__cta"
              aria-label="Learn more about omnichannel appointment setting"
            >
              <span aria-hidden="true">→</span>
            </button>
          </article>
          <div className="plan-services">
            <h3 className="plan-services__intro">
              Meet our all-inclusive B2B lead generation services performed by world-class sales experts:
            </h3>
            <ul className="plan-services__list">
              {SERVICES.map((service) => (
                <li key={service}>
                  <a href="/services-and-solutions">{service}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientPlanSection;
