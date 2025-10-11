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
  metric: string;
  path: string;
  viewBox: string;
  tabGroup?: "primary" | "secondary";
  funnelLabel: string;
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
    funnelLabel: "Leads",
    metric: "Up to 18,000* prospects within your client profile",
    path: "M20 0h420l-36 120H56L20 0Z",
    viewBox: "0 0 460 120",
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
    funnelLabel: "MQLs",
    metric: "Up to 9,000* marketing-qualified leads",
    path: "M18 0h366l-32 116H50L18 0Z",
    viewBox: "0 0 402 116",
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
    funnelLabel: "SQLs",
    metric: "200* sales-qualified meetings with decision-makers",
    path: "M16 0h310l-28 112H44L16 0Z",
    viewBox: "0 0 342 112",
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
    funnelLabel: "Opportunities",
    metric: "10–30* closed deals",
    path: "M14 0h254l-26 96H40L14 0Z",
    viewBox: "0 0 282 96",
    tabGroup: "secondary",
    tabId: "deal",
    panelId: "panel-deal",
  },
];

const HASH_KEY = "pipeline-step";

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
  const initialIndexRef = useRef<number>(getIndexFromHash() ?? 0);

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
        <header className="pipeline__header">
          <h2 id="pipeline-heading">How your pipeline will look with Belkins</h2>
          <p className="pipeline__sub">Focus on scaling your business while we deliver you sales-ready B2B leads.</p>
        </header>

        <div className="pipeline__card" role="group" aria-label="Pipeline overview">
          <div className="pipeline__grid">
            <aside className="pipeline__rail" aria-label="Pipeline steps">
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
                      tabIndex={isFocused ? 0 : -1}
                      data-step-key={step.key}
                      onClick={() => handleSelect(index)}
                      onKeyDown={(event) => handleKeyDown(event, index)}
                      onFocus={() => setFocusedIndex(index)}
                    >
                      {step.title}
                    </button>
                  );
                })}
              </div>

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
                      tabIndex={isFocused ? 0 : -1}
                      data-step-key={step.key}
                      onClick={() => handleSelect(index)}
                      onKeyDown={(event) => handleKeyDown(event, index)}
                      onFocus={() => setFocusedIndex(index)}
                    >
                      {step.title}
                    </button>
                  );
                })}
              </div>

              {STEPS.map((step) => {
                const isActive = step.key === activeStep.key;

                return (
                  <div
                    key={step.key}
                    className={`pipeline__panel${isActive ? " pipeline__panel--active" : ""}`}
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
                      aria-pressed={isActive}
                      aria-label={`${step.funnelLabel} — ${step.metric.replace(/\*\s*/g, "* ")}`}
                      onClick={() => handleSelect(index)}
                    >
                      <svg className="funnel__svg" viewBox={step.viewBox} aria-hidden="true" focusable="false">
                        <path d={step.path} />
                      </svg>
                      <span className="funnel__text">
                        <span className="funnel__label">{step.label}</span>
                        <span className="funnel__value">{step.metric}</span>
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
