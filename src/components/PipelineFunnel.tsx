"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";

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
  overlayPosition: { top: string; height: string };
  tabGroup?: "primary" | "secondary";
  funnelLabel: string;
};

const STEPS: StepConfig[] = [
  {
    key: "omnichannel-engagement",
    title: "Omnichannel engagement",
    description:
      "We develop a comprehensive plan that combines email, LinkedIn, and cold calling to reach your prospects at the right time and in the right place.",
    label: "Leads",
    funnelLabel: "Highlight Leads",
    metric: "Up to 18,000* prospects within your client profile",
    path: "M60 30H300L270 90H90Z",
    overlayPosition: { top: "4%", height: "21%" },
    tabGroup: "primary",
  },
  {
    key: "activation",
    title: "Activation",
    description:
      "Prospects engage by replying to emails, subscribing to newsletters, clicking on ads, answering in WhatsApp, attending a webinar, etc.",
    label: "MQLs",
    funnelLabel: "Highlight MQLs",
    metric: "Up to 9,000* marketing-qualified leads",
    path: "M75 110H285L255 170H105Z",
    overlayPosition: { top: "27%", height: "20%" },
    tabGroup: "primary",
  },
  {
    key: "conversion",
    title: "Conversion",
    description:
      "With personalized appointment setting and persistent follow-ups, we ensure your prospects attend demo calls and online or face-to-face meetings with your sales executives.",
    label: "SQLs",
    funnelLabel: "Highlight SQLs",
    metric: "200* sales-qualified meetings with decision-makers",
    path: "M90 190H270L240 250H120Z",
    overlayPosition: { top: "48%", height: "20%" },
    tabGroup: "primary",
  },
  {
    key: "deal-closure",
    title: "Deal closure",
    description:
      "All that’s left for you to do is attend booked appointments, run sales negotiations, and sign new deals.",
    label: "Opportunities",
    funnelLabel: "Highlight Opportunities",
    metric: "10–30* closed deals",
    path: "M105 270H255L225 330H135Z",
    overlayPosition: { top: "69%", height: "21%" },
    tabGroup: "secondary",
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

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((index + 1) % total);
        tabsRef.current[(index + 1) % total]?.focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((index - 1 + total) % total);
        tabsRef.current[(index - 1 + total) % total]?.focus();
        break;
      case "Home":
        event.preventDefault();
        setFocusedIndex(0);
        tabsRef.current[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        setFocusedIndex(total - 1);
        tabsRef.current[total - 1]?.focus();
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

  const panelId = "pipeline-panel";

  const groupedSteps = useMemo(() => {
    return {
      primary: STEPS.filter((step) => step.tabGroup !== "secondary"),
      secondary: STEPS.filter((step) => step.tabGroup === "secondary"),
    };
  }, []);

  return (
    <section id="pipeline" aria-labelledby="pipeline-heading" className="py-16 md:py-[4.5rem]">
      <div className="mx-auto max-w-[1160px] px-4 md:px-6">
        <div
          className="rounded-3xl bg-neutral-900 text-white shadow-sm p-6 md:p-8 lg:p-10"
          style={{ "--accent": "#ff5a00" } as CSSProperties}
        >
          <header className="space-y-3">
            <h2 id="pipeline-heading" className="text-[clamp(28px,3.2vw,40px)] font-semibold tracking-tight">
              How your pipeline will look with Belkins
            </h2>
            <p className="text-[clamp(14px,1.6vw,18px)] text-neutral-300">
              Focus on scaling your business while we deliver you sales-ready B2B leads.
            </p>
          </header>
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="flex flex-col gap-6">
              <nav aria-label="Pipeline steps" className="flex flex-col gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">We take care of the entire user journey</p>
                <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-3">
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
                        id={`pipeline-tab-${step.key}`}
                        role="tab"
                        type="button"
                        aria-selected={isActive}
                        aria-controls={panelId}
                        tabIndex={isFocused ? 0 : -1}
                        onClick={() => handleSelect(index)}
                        onKeyDown={(event) => handleKeyDown(event, index)}
                        className={`flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 text-left font-semibold text-[clamp(16px,1.8vw,20px)] motion-safe:transition motion-safe:duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] ${
                          isActive ? "py-4 shadow-[0_18px_32px_rgba(5,6,10,0.45)]" : "h-14"
                        }`}
                      >
                        <span>{step.title}</span>
                        <span aria-hidden="true" className="text-lg text-white/50">
                          ›
                        </span>
                      </button>
                    );
                  })}
                  <p className="pt-1 text-xs uppercase tracking-[0.2em] text-neutral-500">Your part in the process</p>
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
                        id={`pipeline-tab-${step.key}`}
                        role="tab"
                        type="button"
                        aria-selected={isActive}
                        aria-controls={panelId}
                        tabIndex={isFocused ? 0 : -1}
                        onClick={() => handleSelect(index)}
                        onKeyDown={(event) => handleKeyDown(event, index)}
                        className={`flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 text-left font-semibold text-[clamp(16px,1.8vw,20px)] motion-safe:transition motion-safe:duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] ${
                          isActive ? "py-4 shadow-[0_18px_32px_rgba(5,6,10,0.45)]" : "h-14"
                        }`}
                      >
                        <span>{step.title}</span>
                        <span aria-hidden="true" className="text-lg text-white/50">
                          ›
                        </span>
                      </button>
                    );
                  })}
                </div>
              </nav>
              <div
                id={panelId}
                role="tabpanel"
                aria-live="polite"
                aria-labelledby={`pipeline-tab-${activeStep.key}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-neutral-300 motion-safe:transition motion-safe:duration-200"
              >
                <h3 className="text-lg font-semibold text-white">{activeStep.title}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-300 md:text-base">{activeStep.description}</p>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-xs text-neutral-400">
                * Average yearly outcomes. The results depend on multiple factors.
              </p>
              <div className="relative mx-auto w-full max-w-[360px]">
                <svg
                  viewBox="0 0 360 360"
                  role="presentation"
                  focusable="false"
                  aria-hidden="true"
                  className="h-auto w-full"
                >
                  {STEPS.map((step) => {
                    const isActive = step.key === activeStep.key;
                    return (
                      <g
                        key={step.key}
                        data-step={step.key}
                        className={`${
                          isActive
                            ? "fill-[var(--accent)] text-white drop-shadow-[0_16px_32px_rgba(255,90,0,0.4)]"
                            : "fill-white/10 text-white/60"
                        } motion-safe:transition motion-safe:duration-200`}
                      >
                        <path d={step.path} stroke={isActive ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.18)"} strokeWidth={2} />
                        <text x={step.key === "deal-closure" ? 120 : step.key === "conversion" ? 105 : step.key === "activation" ? 90 : 75} y={step.key === "deal-closure" ? 302 : step.key === "conversion" ? 222 : step.key === "activation" ? 142 : 62} className="text-[13px] font-semibold uppercase tracking-[0.18em]">
                          {step.label}
                        </text>
                        <text
                          x={step.key === "deal-closure" ? 120 : step.key === "conversion" ? 105 : step.key === "activation" ? 90 : 75}
                          y={step.key === "deal-closure" ? 326 : step.key === "conversion" ? 246 : step.key === "activation" ? 166 : 86}
                          className="text-[12px] font-medium tracking-tight"
                        >
                          {step.metric}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {STEPS.map((step, index) => (
                  <button
                    key={step.key}
                    type="button"
                    aria-label={`${step.funnelLabel}: ${step.metric}`}
                    aria-pressed={step.key === activeStep.key}
                    onClick={() => handleSelect(index)}
                    className="absolute left-[6%] right-[6%] cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--accent)]"
                    style={{ top: step.overlayPosition.top, height: step.overlayPosition.height }}
                  >
                    <span className="sr-only">{`${step.label} layer trigger`}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PipelineFunnel;
