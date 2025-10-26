"use client";

import { useRef, useState } from "react";
import type { MutableRefObject } from "react";

import Carousel from "./Carousel";
import CaseStudyCard from "./CaseStudyCard";
import VideoModal from "./VideoModal";
import VideoTile from "./VideoTile";
import styles from "./case-studies.module.css";

export type VideoCaseStudy = {
  id: string;
  title: string;
  client: string;
  industry: string;
  duration: string;
  thumbnail: string;
  videoUrl: string;
  tags: string[];
};

export type CardCaseStudy = {
  id: string;
  title: string;
  client: string;
  industry: string;
  summary: string;
  thumbnail: string;
  href?: string;
  tags: string[];
};

type CaseStudiesClientProps = {
  videos: VideoCaseStudy[];
  cards: CardCaseStudy[];
  config: {
    NUM_VIDEO_FEATURES: number;
    NUM_CARD_CASES: number;
    MOBILE_BREAKPOINT: number;
  };
};

type TriggerRef = MutableRefObject<HTMLElement | null>;

const CaseStudiesClient = ({ videos, cards, config }: CaseStudiesClientProps) => {
  const { NUM_CARD_CASES, NUM_VIDEO_FEATURES, MOBILE_BREAKPOINT } = config;
  const [activeVideo, setActiveVideo] = useState<VideoCaseStudy | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const lastFocusedTrigger = useRef<HTMLElement | null>(null);
  const modalFocusTrap = useRef<HTMLDivElement | null>(null);

  const handleOpenVideo = (video: VideoCaseStudy, trigger?: HTMLElement | null) => {
    lastFocusedTrigger.current = trigger ?? null;
    setActiveVideo(video);
    setModalOpen(true);
  };

  const handleCloseVideo = () => {
    setModalOpen(false);
    setActiveVideo(null);
    if (lastFocusedTrigger.current) {
      lastFocusedTrigger.current.focus();
    }
  };

  return (
    <div
      className={`${styles.page} page`}
      data-mobile-breakpoint={MOBILE_BREAKPOINT}
      data-video-count={NUM_VIDEO_FEATURES}
      data-card-count={NUM_CARD_CASES}
    >
      <div className="container">
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Case Studies</p>
          <h1 className={styles.title}>Case Studies</h1>
          <p className={styles.lede}>
            Explore how high-growth teams partner with Direct Sales Network® to unlock sustainable, measurable revenue outcomes.
          </p>
        </header>
      </div>

      <section className={styles.videosSection} aria-labelledby="featured-videos-heading">
        <div className="container">
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Featured Videos</p>
            <h2 id="featured-videos-heading" className={styles.sectionTitle}>
              Featured Videos
            </h2>
            <p className={styles.sectionDescription}>
              {`A curated set of ${NUM_VIDEO_FEATURES} quick wins from recent GTM transformations, ready when you are.`}
            </p>
          </div>
          <div className={styles.videoGrid} role="list">
            {videos.map((video) => (
              <VideoTile key={video.id} video={video} onOpen={handleOpenVideo} role="listitem" />
            ))}
          </div>
        </div>

        <Carousel
          className={styles.videoCarousel}
          ariaLabel="Featured case study videos"
          idPrefix="featured-video"
          itemCount={videos.length}
          statusLabel="Featured video"
        >
          {videos.map((video) => (
            <VideoTile
              key={`carousel-${video.id}`}
              video={video}
              onOpen={handleOpenVideo}
              variant="carousel"
            />
          ))}
        </Carousel>
      </section>

      <section className={styles.cardsSection} aria-labelledby="case-study-cards-heading">
        <div className="container">
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Case Studies</p>
            <h2 id="case-study-cards-heading" className={styles.sectionTitle}>
              Deep dives
            </h2>
            <p className={styles.sectionDescription}>
              {`Dive into the systems, playbooks, and metrics behind ${NUM_CARD_CASES} standout engagements.`}
            </p>
          </div>
          <div className={styles.cardGrid} role="list">
            {cards.map((card) => (
              <CaseStudyCard key={card.id} card={card} role="listitem" />
            ))}
          </div>
        </div>

        <Carousel
          className={styles.cardsCarousel}
          ariaLabel="Case study spotlights"
          idPrefix="case-study-card"
          itemCount={cards.length}
          statusLabel="Case study"
        >
          {cards.map((card) => (
            <CaseStudyCard key={`carousel-${card.id}`} card={card} variant="carousel" />
          ))}
        </Carousel>
      </section>

      <VideoModal
        video={activeVideo}
        isOpen={isModalOpen}
        onClose={handleCloseVideo}
        focusTrapRef={modalFocusTrap as TriggerRef}
      />
    </div>
  );
};

export default CaseStudiesClient;
