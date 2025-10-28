import CaseStudiesClient from "./CaseStudiesClient";
import type { CardCaseStudy, VideoCaseStudy } from "./CaseStudiesClient";
import data from "../../data/case-studies.json" assert { type: "json" };
import { SITE_URL } from "../../site.config";

const NUM_VIDEO_FEATURES = 4;
const NUM_CARD_CASES = 6;

const CaseStudiesPage = () => {
  const rawData = data as {
    videos: VideoCaseStudy[];
    cards: CardCaseStudy[];
  };

  const videos = rawData.videos.slice(0, NUM_VIDEO_FEATURES);
  const cards = rawData.cards.slice(0, NUM_CARD_CASES);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: cards.map((card, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: card.title,
      url: card.href ? `${SITE_URL}${card.href}` : `${SITE_URL}/case-studies#${card.id}`,
      item: {
        "@type": "CreativeWork",
        name: card.title,
        about: card.tags.join(", "),
        description: card.summary,
        industry: card.industry,
      },
    })),
  };

  return (
    <>
      <CaseStudiesClient
        videos={videos}
        cards={cards}
        config={{
          NUM_CARD_CASES,
          NUM_VIDEO_FEATURES,
          MOBILE_BREAKPOINT: 640,
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
};

export default CaseStudiesPage;
