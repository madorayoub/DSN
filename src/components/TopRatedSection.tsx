"use client";

const AWARDS_IMAGE_URL =
  "https://res.cloudinary.com/diptffkzh/image/upload/v1760438072/86470d71-2884-4fa6-85af-6a9625f68eea_hilkff.png";

const TopRatedSection = () => {
  return (
    <section className="top-rated" aria-labelledby="top-rated-heading">
      <div className="container top-rated__inner">
        <div className="top-rated__content">
          <p className="top-rated__eyebrow">Awards &amp; accolades</p>
          <h2 id="top-rated-heading" className="top-rated__title">
            We’re the top-rated
            <br />
            B2B lead generation
            <br />
            company in the USA
          </h2>
          <p className="top-rated__subtitle">
            See what others are saying about Direct Sales Network®’s B2B lead generation services and how we
            helped hack their growth.
          </p>
        </div>
        <figure className="top-rated__figure">
          <img
            src={AWARDS_IMAGE_URL}
            alt="Awards and accolades recognizing Direct Sales Network®"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>
    </section>
  );
};

export default TopRatedSection;
