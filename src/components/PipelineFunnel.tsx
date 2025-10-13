"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

type StepKey =
  | "omnichannel-engagement"
  | "activation"
  | "conversion"
  | "deal-closure";

type StepConfig = {
  key: StepKey;
  title: string;
  description: string;
  label: string;
  stat: string;
  support?: string;
  path: string;
  viewBox: string;
  maxWidth: string;
  tabGroup?: "primary" | "secondary";
  tabId: string;
  panelId: string;
};

const STEPS: StepConfig[] = [
  {
    key: "omnichannel-engagement",
    title: "Omnichannel engagement",
    description:
      "We develop a comprehensive plan that combines email, LinkedIn, and cold calling to reach your prospects at the right time and in the right place.",
    label: "Leads",
    stat: "Up to 18,000* prospects",
    support: "within your client profile",
    path: "M24.02 13.41 Q20 0 34 0 H426 Q440 0 435.98 13.41 L408.02 106.59 Q404 120 390 120 H70 Q56 120 51.98 106.59 Z",
    viewBox: "0 0 460 120",
    maxWidth: "357px",
    tabGroup: "primary",
    tabId: "omni",
    panelId: "panel-omni",
  },
  {
    key: "activation",
    title: "Activation",
    description:
      "Prospects engage by replying to emails, subscribing to newsletters, clicking on ads, answering in WhatsApp, attending a webinar, etc.",
    label: "MQLs",
    stat: "Up to 9,000*",
    support: "marketing-qualified leads",
    path: "M21.72 13.5 Q18 0 32 0 H370 Q384 0 380.28 13.5 L355.72 102.5 Q352 116 338 116 H64 Q50 116 46.28 102.5 Z",
    viewBox: "0 0 402 116",
    maxWidth: "316px",
    tabGroup: "primary",
    tabId: "activation",
    panelId: "panel-activation",
  },
  {
    key: "conversion",
    title: "Conversion",
    description:
      "With personalized appointment setting and persistent follow-ups, we ensure your prospects attend demo calls and online or face-to-face meetings with your sales executives.",
    label: "SQLs",
    stat: "200* sales-qualified meetings",
    support: "with decision-makers",
    path: "M19.4 13.58 Q16 0 30 0 H312 Q326 0 322.6 13.58 L301.4 98.42 Q298 112 284 112 H58 Q44 112 40.6 98.42 Z",
    viewBox: "0 0 342 112",
    maxWidth: "275px",
    tabGroup: "primary",
    tabId: "conversion",
    panelId: "panel-conversion",
  },
  {
    key: "deal-closure",
    title: "Deal closure",
    description:
      "All that’s left for you to do is attend booked appointments, run sales negotiations, and sign new deals.",
    label: "Opportunities",
    stat: "10–30* closed deals",
    path: "M17.66 13.51 Q14 0 28 0 H254 Q268 0 264.34 13.51 L245.66 82.49 Q242 96 228 96 H54 Q40 96 36.34 82.49 Z",
    viewBox: "0 0 282 96",
    maxWidth: "245px",
    tabGroup: "secondary",
    tabId: "deal",
    panelId: "panel-deal",
  },
];

const HASH_KEY = "pipeline-step";

const ChevronIcon = ({ isActive }: { isActive: boolean }) => {
  return (
    <svg
      className={`pipeline__chevron${isActive ? " pipeline__chevron--active" : ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const getIndexFromHash = (): number | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const match = window.location.hash.match(/pipeline-step=([a-z-]+)/i);
  if (!match) {
    return undefined;
  }

  const index = STEPS.findIndex((step) => step.key === (match[1] as StepKey));
  return index >= 0 ? index : undefined;
};

const PipelineFunnel = () => {
  const initialIndexRef = useRef<number>(getIndexFromHash() ?? 1);

  const [activeIndex, setActiveIndex] = useState<number>(initialIndexRef.current);
  const [focusedIndex, setFocusedIndex] = useState<number>(initialIndexRef.current);

  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const key = STEPS[activeIndex].key;
    const url = new URL(window.location.href);
    url.hash = `${HASH_KEY}=${key}`;
    window.history.replaceState(null, "", url);
  }, [activeIndex]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleHashChange = () => {
      const next = getIndexFromHash();
      if (typeof next === "number" && next !== activeIndex) {
        setActiveIndex(next);
        setFocusedIndex(next);
        tabsRef.current[next]?.focus();
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [activeIndex]);

  const handleSelect = (index: number, focusTab = true) => {
    setActiveIndex(index);
    if (focusTab) {
      setFocusedIndex(index);
      tabsRef.current[index]?.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const total = STEPS.length;

    const focusAndSelect = (nextIndex: number) => {
      const clamped = (nextIndex + total) % total;
      setFocusedIndex(clamped);
      tabsRef.current[clamped]?.focus();
      handleSelect(clamped, false);
    };

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAndSelect(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAndSelect(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelect(total - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        handleSelect(index, false);
        break;
      default:
        break;
    }
  };

  const activeStep = STEPS[activeIndex];

  const groupedSteps = useMemo(() => {
    return {
      primary: STEPS.filter((step) => step.tabGroup !== "secondary"),
      secondary: STEPS.filter((step) => step.tabGroup === "secondary"),
    };
  }, []);

  return (
    <section id="pipeline" className="pipeline" aria-labelledby="pipeline-heading">
      <div className="container">
        <div className="pipeline__card" role="group" aria-label="Pipeline overview">
          <header className="pipeline__header">
            <h2 id="pipeline-heading">How your pipeline will look with Direct Sales Network®</h2>
            <p className="pipeline__sub">Focus on scaling your business while we deliver you sales-ready B2B leads.</p>
          </header>
          <div className="pipeline__grid">
            <aside className="pipeline__rail" aria-label="Pipeline steps">
              <div className="pipeline__group">
                <p className="pipeline__group-title">We take care of the entire user journey</p>

                <div className="pipeline__tablist" role="tablist" aria-orientation="vertical">
                  {groupedSteps.primary.map((step) => {
                    const index = STEPS.findIndex((item) => item.key === step.key);
                    const isActive = index === activeIndex;
                    const isFocused = index === focusedIndex;

                    return (
                    <button
                      key={step.key}
                      ref={(el) => {
                        tabsRef.current[index] = el;
                      }}
                      type="button"
                      className={`pipeline__tab${isActive ? " pipeline__tab--active" : ""}`}
                      id={`tab-${step.tabId}`}
                      role="tab"
                      aria-controls={step.panelId}
                      aria-selected={isActive}
                      aria-expanded={isActive}
                      tabIndex={isFocused ? 0 : -1}
                      data-step-key={step.key}
                      onClick={() => handleSelect(index)}
                      onKeyDown={(event) => handleKeyDown(event, index)}
                      onFocus={() => setFocusedIndex(index)}
                    >
                      <span className="pipeline__tab-header">
                        <span className="pipeline__tab-title">{step.title}</span>
                        <ChevronIcon isActive={isActive} />
                      </span>
                      <span
                        className={`pipeline__description${isActive ? " pipeline__description--active" : ""}`}
                        aria-hidden={!isActive}
                      >
                        {step.description}
                      </span>
                    </button>
                  );
                })}
                </div>
              </div>

              <div className="pipeline__group pipeline__group--secondary">
                <p className="pipeline__group-title">Your part in the process</p>
                <div className="pipeline__tablist pipeline__tablist--secondary" role="tablist" aria-orientation="vertical">
                  {groupedSteps.secondary.map((step) => {
                    const index = STEPS.findIndex((item) => item.key === step.key);
                    const isActive = index === activeIndex;
                    const isFocused = index === focusedIndex;

                    return (
                    <button
                      key={step.key}
                      ref={(el) => {
                        tabsRef.current[index] = el;
                      }}
                      type="button"
                      className={`pipeline__tab${isActive ? " pipeline__tab--active" : ""}`}
                      id={`tab-${step.tabId}`}
                      role="tab"
                      aria-controls={step.panelId}
                      aria-selected={isActive}
                      aria-expanded={isActive}
                      tabIndex={isFocused ? 0 : -1}
                      data-step-key={step.key}
                      onClick={() => handleSelect(index)}
                      onKeyDown={(event) => handleKeyDown(event, index)}
                      onFocus={() => setFocusedIndex(index)}
                    >
                      <span className="pipeline__tab-header">
                        <span className="pipeline__tab-title">{step.title}</span>
                        <ChevronIcon isActive={isActive} />
                      </span>
                      <span
                        className={`pipeline__description${isActive ? " pipeline__description--active" : ""}`}
                        aria-hidden={!isActive}
                      >
                        {step.description}
                      </span>
                    </button>
                  );
                })}
                </div>
              </div>

              {STEPS.map((step) => {
                const isActive = step.key === activeStep.key;

                return (
                  <div
                    key={step.key}
                    className={`pipeline__panel sr-only${isActive ? " pipeline__panel--active" : ""}`}
                    id={step.panelId}
                    role="tabpanel"
                    aria-labelledby={`tab-${step.tabId}`}
                    data-step-key={step.key}
                    hidden={!isActive}
                  >
                    {step.description}
                  </div>
                );
              })}
            </aside>

            <div className="pipeline__funnel">
              <p className="pipeline__caption">* Average yearly outcomes. The results depend on multiple factors.</p>

              <div className="funnel" role="group" aria-label="Funnel outcomes">
                {STEPS.map((step, index) => {
                  const isActive = step.key === activeStep.key;

                  return (
                    <button
                      key={step.key}
                      type="button"
                      className={`funnel__layer${isActive ? " funnel__layer--active" : ""}`}
                      data-step={index}
                      data-step-key={step.key}
                      style={{ maxWidth: step.maxWidth }}
                      aria-pressed={isActive}
                      aria-label={`${step.label} — ${step.stat.replace(/\*\s*/g, "* ")}${step.support ? ` ${step.support}` : ""}`}
                      onClick={() => handleSelect(index)}
                    >
                      <span className="funnel__arrow" aria-hidden="true">
                        <svg viewBox="0 0 136 46" role="presentation" focusable="false">
                          <path d="M70.6621 44.8168C69.006 45.7277 66.994 45.7277 65.3379 44.8168L3.33906 10.7157C-1.612 7.99248 0.323319 0.500011 6.00113 0.500011L129.999 0.5C135.677 0.499999 137.612 7.99247 132.661 10.7157L70.6621 44.8168Z" />
                        </svg>
                        <span>{step.label}</span>
                      </span>
                      <svg className="funnel__svg" viewBox={step.viewBox} aria-hidden="true" focusable="false">
                        <path d={step.path} />
                      </svg>
                      <span className="funnel__text">
                        <span className="funnel__stat">{step.stat}</span>
                        {step.support ? <span className="funnel__support">{step.support}</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PipelineFunnel;
