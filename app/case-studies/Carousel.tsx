"use client";

import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent, ReactNode } from "react";

import styles from "./case-studies.module.css";

type CarouselProps = {
  children: ReactNode;
  className?: string;
  ariaLabel: string;
  idPrefix: string;
  itemCount: number;
  statusLabel: string;
};

const getPrefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Carousel = ({
  children,
  className,
  ariaLabel,
  idPrefix,
  itemCount,
  statusLabel,
}: CarouselProps) => {
  const slides = useMemo(() => Children.toArray(children), [children]);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [announceMessage, setAnnounceMessage] = useState("");
  const totalSlides = Math.min(itemCount, slides.length);

  useEffect(() => {
    setAnnounceMessage(`${statusLabel} ${activeIndex + 1} of ${totalSlides}`);
  }, [activeIndex, statusLabel, totalSlides]);

  const scrollToIndex = useCallback(
    (index: number, { focusSlide } = { focusSlide: false }) => {
      const node = viewportRef.current;
      if (!node) {
        return;
      }

      const clampedIndex = Math.max(0, Math.min(index, totalSlides - 1));
      const behavior = getPrefersReducedMotion() ? "auto" : "smooth";
      node.scrollTo({ left: clampedIndex * node.clientWidth, behavior });
      setActiveIndex(clampedIndex);

      if (focusSlide) {
        requestAnimationFrame(() => {
          const slide = node.querySelector<HTMLElement>(
            `[data-carousel-index="${clampedIndex}"]`
          );
          const focusable = slide?.querySelector<HTMLElement>(
            'button, [href], [tabindex]:not([tabindex="-1"])'
          );
          (focusable ?? slide)?.focus();
        });
      }
    },
    [totalSlides]
  );

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return undefined;
    }

    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const newIndex = Math.round(node.scrollLeft / node.clientWidth);
        setActiveIndex((prev) => (prev === newIndex ? prev : newIndex));
      });
    };

    node.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("scroll", handleScroll);
    };
  }, [totalSlides]);

  const handlePrev = () => {
    scrollToIndex(activeIndex - 1, { focusSlide: true });
  };

  const handleNext = () => {
    scrollToIndex(activeIndex + 1, { focusSlide: true });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      handlePrev();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      handleNext();
    }
  };

  return (
    <div
      className={`${styles.carousel} ${className ?? ""}`.trim()}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div className={styles.carouselHeader}>
        <div className={styles.carouselControls}>
          <button
            type="button"
            className={styles.carouselButton}
            onClick={handlePrev}
            disabled={activeIndex === 0}
            aria-label="View previous"
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.carouselButton}
            onClick={handleNext}
            disabled={activeIndex >= totalSlides - 1}
            aria-label="View next"
          >
            ›
          </button>
        </div>
        <div className={styles.carouselDots} role="tablist" aria-label={`${ariaLabel} pagination`}>
          {slides.slice(0, totalSlides).map((_, index) => (
            <button
              key={`${idPrefix}-dot-${index}`}
              type="button"
              className={`${styles.carouselDot} ${
                index === activeIndex ? styles.carouselDotActive : ""
              }`.trim()}
              onClick={() => scrollToIndex(index, { focusSlide: true })}
              aria-label={`${statusLabel} ${index + 1}`}
              aria-pressed={index === activeIndex}
            />
          ))}
        </div>
      </div>

      <div
        className={styles.carouselViewport}
        ref={viewportRef}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="group"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className={styles.carouselTrack}>
          {slides.slice(0, totalSlides).map((slide, index) => (
            <div
              key={`${idPrefix}-slide-${index}`}
              className={styles.carouselSlide}
              data-carousel-index={index}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      <p className={styles.carouselStatus} aria-live="polite">
        {announceMessage}
      </p>
    </div>
  );
};

export default Carousel;
