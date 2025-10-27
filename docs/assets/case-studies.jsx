
const { useCallback, useEffect, useMemo, useRef, useState } = React;

const styles = {
  page: "case-studies__page",
  intro: "case-studies__intro",
  eyebrow: "case-studies__eyebrow",
  title: "case-studies__title",
  lede: "case-studies__lede",
  section: "case-studies__section",
  sectionHeader: "case-studies__section-header",
  videoGrid: "case-studies__video-grid",
  videoCard: "case-studies__video-card",
  videoButton: "case-studies__video-button",
  videoMedia: "case-studies__video-media",
  videoImage: "case-studies__video-image",
  playBadge: "case-studies__play-badge",
  videoContent: "case-studies__video-content",
  videoCarousel: "case-studies__video-carousel",
  carouselHeader: "case-studies__carousel-header",
  carouselPosition: "case-studies__carousel-position",
  carouselControls: "case-studies__carousel-controls",
  carouselControl: "case-studies__carousel-control",
  carouselViewport: "case-studies__carousel-viewport",
  carouselTrack: "case-studies__carousel-track",
  carouselSlide: "case-studies__carousel-slide",
  carouselAccessibleRegion: "case-studies__carousel-accessible-region",
  carouselDots: "case-studies__carousel-dots",
  carouselDot: "case-studies__carousel-dot",
  caseGrid: "case-studies__case-grid",
  caseCard: "case-studies__case-card",
  caseMedia: "case-studies__case-media",
  caseContent: "case-studies__case-content",
  caseIndustry: "case-studies__case-industry",
  caseLink: "case-studies__case-link",
  caseCarousel: "case-studies__case-carousel",
  modalBackdrop: "case-studies__modal-backdrop",
  modal: "case-studies__modal",
  modalHeader: "case-studies__modal-header",
  modalBody: "case-studies__modal-body",
  modalClose: "case-studies__modal-close",
  modalMedia: "case-studies__modal-media",
};

const featuredVideos = [
  {
    id: "dQw4w9WgXcQ",
    title: "How DSN scaled an enterprise outbound engine",
    description:
      "Hear our client share how a tailored outbound playbook unlocked consistent SQL growth.",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  },
  {
    id: "lY2yjAdbvdQ",
    title: "Inside the revenue lab: repeatable appointment setting",
    description:
      "Walk through the systems we used to lift meeting volume 3× in under 90 days.",
    thumbnail: "https://img.youtube.com/vi/lY2yjAdbvdQ/hqdefault.jpg",
  },
  {
    id: "kXYiU_JCYtU",
    title: "ABM in action for complex buying committees",
    description:
      "Discover how orchestrated multi-channel messaging warmed seven-figure deals.",
    thumbnail: "https://img.youtube.com/vi/kXYiU_JCYtU/hqdefault.jpg",
  },
  {
    id: "tVj0ZTS4WF4",
    title: "Building trust in new markets with DSN",
    description:
      "A global SaaS team explains how we launched in-region pods and exceeded targets.",
    thumbnail: "https://img.youtube.com/vi/tVj0ZTS4WF4/hqdefault.jpg",
  },
];

const caseStudies = [
  {
    id: "atlas-bi",
    title: "Atlas BI tripled enterprise demos in one quarter",
    summary:
      "We reimagined their outbound narrative, added precision targeting, and supported reps with real-time enablement.",
    image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80",
    industry: "Analytics platform",
  },
  {
    id: "northwind-ops",
    title: "Northwind Ops unlocked a $14M pipeline channel",
    summary:
      "DSN stood up a hybrid inbound-outbound motion that nurtured intent and converted complex buying groups.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80",
    industry: "Operations SaaS",
  },
  {
    id: "stellar-security",
    title: "Stellar Security accelerated time-to-meeting by 48%",
    summary:
      "We centralized prospecting signals and automated the follow-up engine so sellers could focus on closing.",
    image: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80",
    industry: "Cybersecurity",
  },
  {
    id: "coastline-robotics",
    title: "Coastline Robotics expanded into EMEA in six weeks",
    summary:
      "Our launch pods localized messaging, sourced net-new accounts, and proved product-market fit abroad.",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
    industry: "Industrial AI",
  },
  {
    id: "zenith-hr",
    title: "Zenith HR boosted qualified pipeline by 212%",
    summary:
      "By combining curated contact data and executive-level outreach, we reignited their enterprise funnel.",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
    industry: "HR tech",
  },
  {
    id: "lumen-energy",
    title: "Lumen Energy secured strategic alliances across APAC",
    summary:
      "DSN orchestrated co-selling programs with partners and kept multi-stakeholder deals moving.",
    image: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=900&q=80",
    industry: "Energy platform",
  },
];

const focusableSelectors =
  'a[href], button:not([disabled]), textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])';

function CaseStudiesPage() {
  const [videoIndex, setVideoIndex] = useState(0);
  const [studyIndex, setStudyIndex] = useState(0);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [returnFocusTo, setReturnFocusTo] = useState(null);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const touchStartXVideo = useRef(null);
  const touchStartXStudy = useRef(null);

  const activeVideo = useMemo(
    () => featuredVideos.find((video) => video.id === activeVideoId) || null,
    [activeVideoId],
  );

  useEffect(() => {
    if (!activeVideoId || !closeButtonRef.current) {
      return;
    }

    const previouslyFocused = returnFocusTo;
    closeButtonRef.current.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) {
        return;
      }

      const focusable = Array.from(
        modalRef.current.querySelectorAll(focusableSelectors),
      ).filter((node) => !node.hasAttribute("disabled"));

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey) {
        if (current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused) {
        previouslyFocused.focus();
      }
    };
  }, [activeVideoId, returnFocusTo]);

  const closeModal = useCallback(() => {
    setActiveVideoId(null);
  }, []);

  const openModal = useCallback((videoId, trigger) => {
    setReturnFocusTo(trigger);
    setActiveVideoId(videoId);
  }, []);

  useEffect(() => {
    if (activeVideoId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [activeVideoId]);

  const handleVideoTouchStart = (event) => {
    touchStartXVideo.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleVideoTouchEnd = (event) => {
    if (touchStartXVideo.current === null) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartXVideo.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        nextVideo();
      } else {
        prevVideo();
      }
    }
    touchStartXVideo.current = null;
  };

  const handleStudyTouchStart = (event) => {
    touchStartXStudy.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleStudyTouchEnd = (event) => {
    if (touchStartXStudy.current === null) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartXStudy.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        nextStudy();
      } else {
        prevStudy();
      }
    }
    touchStartXStudy.current = null;
  };

  const prevVideo = useCallback(() => {
    setVideoIndex((index) => Math.max(index - 1, 0));
  }, []);

  const nextVideo = useCallback(() => {
    setVideoIndex((index) => Math.min(index + 1, featuredVideos.length - 1));
  }, []);

  const prevStudy = useCallback(() => {
    setStudyIndex((index) => Math.max(index - 1, 0));
  }, []);

  const nextStudy = useCallback(() => {
    setStudyIndex((index) => Math.min(index + 1, caseStudies.length - 1));
  }, []);

  const handleVideoKeyDown = (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextVideo();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prevVideo();
    }
  };

  const handleStudyKeyDown = (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextStudy();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prevStudy();
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Case studies</p>
          <h1 className={styles.title}>Real programs that moved revenue forward</h1>
          <p className={styles.lede}>
            Explore how ambitious go-to-market teams partner with Direct Sales Network® to launch predictable growth engines and
            win their markets.
          </p>
        </header>
      </div>

      <section className={styles.section} aria-labelledby="featured-videos-heading">
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 id="featured-videos-heading">Featured videos</h2>
            <p>Watch customers describe how DSN partnered with their teams to unlock revenue momentum.</p>
          </div>

          <div className={styles.videoGrid}>
            {featuredVideos.map((video) => (
              <article key={video.id} className={styles.videoCard}>
                <button
                  type="button"
                  className={styles.videoButton}
                  onClick={(event) => openModal(video.id, event.currentTarget)}
                  aria-label={`Play video: ${video.title}`}
                >
                  <div className={styles.videoMedia}>
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      loading="lazy"
                      className={styles.videoImage}
                    />
                    <span className={styles.playBadge} aria-hidden="true">
                      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </div>
                  <div className={styles.videoContent}>
                    <h3>{video.title}</h3>
                    <p>{video.description}</p>
                  </div>
                </button>
              </article>
            ))}
          </div>

          <div className={styles.videoCarousel}>
            <div className={styles.carouselHeader}>
              <span className={styles.carouselPosition}>
                <strong>{videoIndex + 1}</strong>
                <span aria-hidden="true"> / {featuredVideos.length}</span>
              </span>
              <div className={styles.carouselControls}>
                <button
                  type="button"
                  className={styles.carouselControl}
                  onClick={prevVideo}
                  disabled={videoIndex === 0}
                  aria-label="View previous video"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15 6 9 12l6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.carouselControl}
                  onClick={nextVideo}
                  disabled={videoIndex === featuredVideos.length - 1}
                  aria-label="View next video"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>
            <div
              className={styles.carouselViewport}
              onTouchStart={handleVideoTouchStart}
              onTouchEnd={handleVideoTouchEnd}
            >
              <div
                className={styles.carouselTrack}
                style={{ transform: `translateX(-${videoIndex * 100}%)` }}
                role="list"
                aria-live="polite"
                aria-atomic="true"
              >
                {featuredVideos.map((video, index) => (
                  <article
                    key={video.id}
                    className={styles.carouselSlide}
                    aria-hidden={videoIndex !== index}
                    role="listitem"
                  >
                    <div className={styles.videoCard}>
                      <button
                        type="button"
                        className={styles.videoButton}
                        onClick={(event) => openModal(video.id, event.currentTarget)}
                        aria-label={`Play video: ${video.title}`}
                      >
                        <div className={styles.videoMedia}>
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            loading="lazy"
                            className={styles.videoImage}
                          />
                          <span className={styles.playBadge} aria-hidden="true">
                            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </div>
                        <div className={styles.videoContent}>
                          <h3>{video.title}</h3>
                          <p>{video.description}</p>
                        </div>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div
              className={styles.carouselAccessibleRegion}
              tabIndex={0}
              role="group"
              aria-label="Featured videos carousel"
              onKeyDown={handleVideoKeyDown}
            >
              <div className={styles.carouselDots}>
                {featuredVideos.map((video, index) => (
                  <button
                    key={video.id}
                    type="button"
                    className={styles.carouselDot}
                    onClick={() => setVideoIndex(index)}
                    aria-label={`Go to video ${index + 1}`}
                    aria-current={videoIndex === index}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="case-study-heading">
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 id="case-study-heading">Case studies</h2>
            <p>
              Dive into how we embed with teams to build durable prospecting programs and pipeline confidence.
            </p>
          </div>

          <div className={styles.caseGrid}>
            {caseStudies.map((study) => (
              <article key={study.id} className={styles.caseCard}>
                <div className={styles.caseMedia}>
                  <img
                    src={study.image}
                    alt={`${study.title} case study illustration`}
                    loading="lazy"
                  />
                </div>
                <div className={styles.caseContent}>
                  <p className={styles.caseIndustry}>{study.industry}</p>
                  <h3>{study.title}</h3>
                  <p>{study.summary}</p>
                  <span className={styles.caseLink} aria-hidden="true">Read case study</span>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.caseCarousel}>
            <div className={styles.carouselHeader}>
              <span className={styles.carouselPosition}>
                <strong>{studyIndex + 1}</strong>
                <span aria-hidden="true"> / {caseStudies.length}</span>
              </span>
              <div className={styles.carouselControls}>
                <button
                  type="button"
                  className={styles.carouselControl}
                  onClick={prevStudy}
                  disabled={studyIndex === 0}
                  aria-label="View previous case study"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15 6 9 12l6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.carouselControl}
                  onClick={nextStudy}
                  disabled={studyIndex === caseStudies.length - 1}
                  aria-label="View next case study"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>
            <div
              className={styles.carouselViewport}
              onTouchStart={handleStudyTouchStart}
              onTouchEnd={handleStudyTouchEnd}
            >
              <div
                className={styles.carouselTrack}
                style={{ transform: `translateX(-${studyIndex * 100}%)` }}
                role="list"
                aria-live="polite"
                aria-atomic="true"
              >
                {caseStudies.map((study, index) => (
                  <article
                    key={study.id}
                    className={styles.carouselSlide}
                    aria-hidden={studyIndex !== index}
                    role="listitem"
                  >
                    <div className={styles.caseCard}>
                      <div className={styles.caseMedia}>
                        <img
                          src={study.image}
                          alt={`${study.title} case study illustration`}
                          loading="lazy"
                        />
                      </div>
                      <div className={styles.caseContent}>
                        <p className={styles.caseIndustry}>{study.industry}</p>
                        <h3>{study.title}</h3>
                        <p>{study.summary}</p>
                        <span className={styles.caseLink} aria-hidden="true">Read case study</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div
              className={styles.carouselAccessibleRegion}
              tabIndex={0}
              role="group"
              aria-label="Case studies carousel"
              onKeyDown={handleStudyKeyDown}
            >
              <div className={styles.carouselDots}>
                {caseStudies.map((study, index) => (
                  <button
                    key={study.id}
                    type="button"
                    className={styles.carouselDot}
                    onClick={() => setStudyIndex(index)}
                    aria-label={`Go to case study ${index + 1}`}
                    aria-current={studyIndex === index}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {activeVideo && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-modal-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className={styles.modal} ref={modalRef}>
            <div className={styles.modalHeader}>
              <h2 id="video-modal-title">{activeVideo.title}</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeModal}
                ref={closeButtonRef}
                aria-label="Close video"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalMedia}>
                <iframe
                  title={activeVideo.title}
                  src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=0`}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <p>{activeVideo.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function mountCaseStudies() {
  const root = document.getElementById("case-studies-root");
  if (!root) {
    return;
  }

  const reactRoot = ReactDOM.createRoot(root);
  reactRoot.render(<CaseStudiesPage />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountCaseStudies, { once: true });
} else {
  mountCaseStudies();
}
