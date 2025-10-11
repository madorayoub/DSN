const REVIEW_BADGES = [
  { platform: "Clutch", score: "4.9", reviews: "221 reviews" },
  { platform: "G2", score: "4.8", reviews: "89 reviews" },
  { platform: "Upcity", score: "5.0", reviews: "61 reviews" },
] as const;

const INDUSTRIES = [
  {
    title: "Agencies",
    description:
      "We help marketing and creative agencies ditch the busywork and focus on building client relationships.",
  },
  {
    title: "Construction",
    description: "We know how to beat seasonality issues in the construction sector to double your profits.",
  },
  {
    title: "Consulting",
    description:
      "We make the value prop of B2B consultants clear and captivating, securing more meetings with key decision-makers.",
  },
  {
    title: "Financial services",
    description:
      "We know how to craft and present your unique value proposition to make it resonate with your prospects.",
  },
  {
    title: "Fintech",
    description:
      "We'll build a predictable pipeline of engaged fintech decision makers and boost your sales cycles by 30%.",
  },
  {
    title: "Healthcare",
    description:
      "Get up to 30 monthly appointments with B2B decision-makers in the health and medical sectors.",
  },
  {
    title: "Information technologies",
    description:
      "Secure a predictable flow of appointments with prospects and scale your business even in the tightest market.",
  },
  {
    title: "Logistics",
    description:
      "We handpick perfect-fit leads for your complex offerings, filling your pipeline with quality meetings.",
  },
  {
    title: "Manufacturing",
    description:
      "We handpick perfect-fit leads for your complex offerings, filling your pipeline with quality meetings.",
  },
  {
    title: "Media production",
    description:
      "Fill your sales pipeline with selected media production leads and get dozens of appointments with Belkins smart outreach.",
  },
  {
    title: "Recruitment and staffing",
    description:
      "We attract the perfect clients and candidates for your agency, saving you precious time and doubling ROI.",
  },
  {
    title: "SaaS services",
    description:
      "Enhance your sales pipeline with our expertise in generating high-quality prospects in the SaaS field.",
  },
  {
    title: "Telecommunication",
    description:
      "Your sales tactics don't work anymore? Our omnichannel approach generates a steady stream of high-quality telecom leads.",
  },
] as const;

const IndustriesSection = () => {
  return (
    <section className="industries" aria-labelledby="industries-heading">
      <div className="container industries__container">
        <header className="industries__header">
          <div className="industries__heading">
            <h1 className="industries__title" id="industries-heading">
              Industries we serve
            </h1>
            <p className="industries__subtitle">
              Leverage Belkins expertise in 50+ industries to target the right audience and acquire qualified B2B leads. Choose your
              industry to find out how Belkins optimizes sales for businesses across various markets.
            </p>
          </div>
          <ul className="industries__ratings" aria-label="Customer review scores across platforms">
            {REVIEW_BADGES.map((badge) => (
              <li key={badge.platform} className="industries__badge">
                <span className="industries__badge-label">{badge.platform}</span>
                <span className="industries__badge-separator" aria-hidden="true">
                  /
                </span>
                <span className="industries__badge-score">
                  <span className="industries__badge-value">{badge.score}</span> score
                </span>
                <span className="industries__badge-reviews">{badge.reviews}</span>
              </li>
            ))}
          </ul>
        </header>
        <div className="industries__grid">
          {INDUSTRIES.map((industry) => (
            <article key={industry.title} className="industries__card">
              <h2 className="industries__card-title">{industry.title}</h2>
              <p className="industries__card-description">{industry.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustriesSection;
