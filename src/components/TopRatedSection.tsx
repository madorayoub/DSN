"use client";

import type { ReactNode } from "react";

const AwardBadge = ({ title, caption, icon, accent }: { title: string; caption: string; icon: ReactNode; accent: string }) => {
  return (
    <div className="top-rated__card" role="listitem">
      <div className="top-rated__badge" style={{ background: accent }} aria-hidden="true">
        {icon}
      </div>
      <div className="top-rated__meta">
        <p className="top-rated__card-title">{title}</p>
        <p className="top-rated__card-caption">{caption}</p>
      </div>
    </div>
  );
};

const RatingBadge = ({ platform, score, reviews, icon, accent }: {
  platform: string;
  score: string;
  reviews: string;
  icon: ReactNode;
  accent: string;
}) => {
  return (
    <div className="top-rated__card top-rated__card--rating" role="listitem">
      <div className="top-rated__badge" style={{ background: accent }} aria-hidden="true">
        {icon}
      </div>
      <div className="top-rated__meta">
        <div className="top-rated__rating">
          <span className="top-rated__card-title">{platform}</span>
          <span className="top-rated__divider" aria-hidden="true">
            /
          </span>
          <span className="top-rated__score">{score}</span>
        </div>
        <span className="top-rated__reviews">{reviews}</span>
      </div>
    </div>
  );
};

const TriangleBadge = () => (
  <svg viewBox="0 0 88 88" role="presentation" focusable="false">
    <defs>
      <linearGradient id="triangleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#5b9bff" />
        <stop offset="100%" stopColor="#2977ff" />
      </linearGradient>
    </defs>
    <circle cx="44" cy="44" r="40" fill="#eaf2ff" />
    <path d="M44 16L70 64H18L44 16Z" fill="url(#triangleGradient)" />
  </svg>
);

const ShieldBadge = () => (
  <svg viewBox="0 0 88 88" role="presentation" focusable="false">
    <defs>
      <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffcb66" />
        <stop offset="100%" stopColor="#ff9640" />
      </linearGradient>
    </defs>
    <circle cx="44" cy="44" r="40" fill="#fff3e0" />
    <path
      d="M44 20L64 26V44C64 56.1503 55.916 67.0685 44 72C32.084 67.0685 24 56.1503 24 44V26L44 20Z"
      fill="url(#shieldGradient)"
    />
  </svg>
);

const RibbonBadge = () => (
  <svg viewBox="0 0 88 88" role="presentation" focusable="false">
    <defs>
      <linearGradient id="ribbonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffcaa6" />
        <stop offset="100%" stopColor="#f5895d" />
      </linearGradient>
    </defs>
    <circle cx="44" cy="44" r="40" fill="#fff1e9" />
    <path
      d="M44 20C34.6112 20 27 27.6112 27 37C27 46.3888 34.6112 54 44 54C53.3888 54 61 46.3888 61 37C61 27.6112 53.3888 20 44 20Z"
      fill="url(#ribbonGradient)"
    />
    <path d="M37 54L32 72L44 64L56 72L51 54" fill="#f26a3f" />
  </svg>
);

const ClutchBadge = () => (
  <svg viewBox="0 0 88 88" role="presentation" focusable="false">
    <circle cx="44" cy="44" r="40" fill="#eaf6ff" />
    <circle cx="44" cy="44" r="28" fill="#0d2b3d" />
    <path d="M44 26C33.5066 26 25 34.5066 25 45C25 55.4934 33.5066 64 44 64C54.4934 64 63 55.4934 63 45H54C54 50.5228 49.5228 55 44 55C38.4772 55 34 50.5228 34 45C34 39.4772 38.4772 35 44 35V26Z" fill="#ffffff" />
  </svg>
);

const G2Badge = () => (
  <svg viewBox="0 0 88 88" role="presentation" focusable="false">
    <circle cx="44" cy="44" r="40" fill="#fff0eb" />
    <path
      d="M44 18C31.2975 18 21 28.2975 21 41C21 53.7025 31.2975 64 44 64C50.6274 64 56.5592 61.1838 60.8211 56.7712L53.7931 49.7432C51.3779 52.1585 47.889 53.6923 44 53.6923C36.5605 53.6923 30.3077 47.4395 30.3077 40C30.3077 32.5605 36.5605 26.3077 44 26.3077C51.4395 26.3077 57.6923 32.5605 57.6923 40V41.5385H44V50.8462H67.3846V40C67.3846 28.2975 56.7025 18 44 18Z"
      fill="#ff6536"
    />
  </svg>
);

const UpcityBadge = () => (
  <svg viewBox="0 0 88 88" role="presentation" focusable="false">
    <circle cx="44" cy="44" r="40" fill="#e9f8f6" />
    <path
      d="M44 22C32.9543 22 24 30.9543 24 42C24 53.0457 32.9543 62 44 62C55.0457 62 64 53.0457 64 42H56C56 48.6274 50.6274 54 44 54C37.3726 54 32 48.6274 32 42C32 35.3726 37.3726 30 44 30C47.866 30 51.295 31.6395 53.8076 34.1924L59.4644 28.5355C55.5794 24.6505 50.0794 22 44 22Z"
      fill="#1d9e90"
    />
    <path d="M53 44C53 49.5228 48.5228 54 43 54V44H53Z" fill="#f9b245" />
  </svg>
);

const TopRatedSection = () => {
  return (
    <section className="top-rated" aria-labelledby="top-rated-heading">
      <div className="container top-rated__inner">
        <div className="top-rated__content">
          <p className="top-rated__eyebrow">Awards & Social Proof</p>
          <h2 id="top-rated-heading" className="top-rated__title">
            We’re the top-rated
            <br />
            B2B lead generation
            <br />
            company in the USA
          </h2>
          <p className="top-rated__subtitle">
            See what others are saying about Belkins’ B2B lead generation services and how we helped hack their growth.
          </p>
        </div>

        <div className="top-rated__grid" role="list">
          <AwardBadge
            title="QASO Global Index"
            caption="Top outsourcing partner 2024"
            accent="linear-gradient(135deg, #f0f4ff 0%, #d8e6ff 100%)"
            icon={<TriangleBadge />}
          />
          <AwardBadge
            title="Top Lead Generation"
            caption="Best-in-class demand gen 2024"
            accent="linear-gradient(135deg, #ecf6ff 0%, #d5e7ff 100%)"
            icon={<ShieldBadge />}
          />
          <AwardBadge
            title="Stevie Awards Bronze"
            caption="Sales & customer service winner"
            accent="linear-gradient(135deg, #ffefe6 0%, #ffe0d1 100%)"
            icon={<RibbonBadge />}
          />
          <RatingBadge
            platform="Clutch"
            score="4.9 score"
            reviews="221 reviews"
            accent="linear-gradient(135deg, #eaf6ff 0%, #d8eefe 100%)"
            icon={<ClutchBadge />}
          />
          <RatingBadge
            platform="G2"
            score="4.8 score"
            reviews="84 reviews"
            accent="linear-gradient(135deg, #fff0eb 0%, #ffdcd1 100%)"
            icon={<G2Badge />}
          />
          <RatingBadge
            platform="UpCity"
            score="5.0 score"
            reviews="67 reviews"
            accent="linear-gradient(135deg, #e8fbf6 0%, #d1f4ea 100%)"
            icon={<UpcityBadge />}
          />
        </div>
      </div>
    </section>
  );
};

export default TopRatedSection;
