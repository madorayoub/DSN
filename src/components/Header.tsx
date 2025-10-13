"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MOBILE_NAV_BREAKPOINT = 900;

type NavLink = {
  href: string;
  label: string;
};

const NAV_LINKS: NavLink[] = [
  { href: "#", label: "Services & solutions" },
  { href: "industries.html", label: "Industries" },
  { href: "#", label: "Case studies" },
  { href: "#", label: "About" },
  { href: "#", label: "Pricing" },
];

const Header = () => {
  const [isSticky, setIsSticky] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [currentPath, setCurrentPath] = useState("");

  const navRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const linksRef = useRef<HTMLDivElement | null>(null);
  const previousOverflowRef = useRef<string>("");
  const wasMenuOpenRef = useRef(false);
  const isScrollLockedRef = useRef(false);
  const hasInertAppliedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleScroll = () => {
      setIsSticky(window.scrollY > 4);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_NAV_BREAKPOINT}px)`);

    const setViewportState = (matches: boolean) => {
      setIsMobileViewport(matches);
      if (!matches) {
        setIsMenuOpen(false);
      }
    };

    setViewportState(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setViewportState(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setCurrentPath(window.location.pathname);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        navRef.current &&
        !navRef.current.contains(target)
      ) {
        closeMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen, closeMenu]);

  useEffect(() => {
    if (!linksRef.current) {
      return;
    }

    if (isMobileViewport) {
      linksRef.current.setAttribute("aria-hidden", isMenuOpen ? "false" : "true");
    } else {
      linksRef.current.removeAttribute("aria-hidden");
    }
  }, [isMenuOpen, isMobileViewport]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const body = document.body;
    const inertTargets = Array.from(
      document.querySelectorAll<HTMLElement>("main, #site-footer, footer.site-footer")
    );
    const supportsInert = "inert" in HTMLElement.prototype;

    if (isMenuOpen && isMobileViewport) {
      if (!isScrollLockedRef.current) {
        previousOverflowRef.current = body.style.overflow;
      }
      body.style.overflow = "hidden";
      isScrollLockedRef.current = true;

      if (supportsInert) {
        inertTargets.forEach((element) => {
          (element as HTMLElement & { inert: boolean }).inert = true;
        });
        hasInertAppliedRef.current = true;
      }
    } else {
      if (isScrollLockedRef.current) {
        body.style.overflow = previousOverflowRef.current;
        isScrollLockedRef.current = false;
      }

      if (supportsInert && hasInertAppliedRef.current) {
        inertTargets.forEach((element) => {
          (element as HTMLElement & { inert: boolean }).inert = false;
        });
        hasInertAppliedRef.current = false;
      }
    }

    return () => {
      if (isScrollLockedRef.current) {
        body.style.overflow = previousOverflowRef.current;
        isScrollLockedRef.current = false;
      }

      if (supportsInert && hasInertAppliedRef.current) {
        inertTargets.forEach((element) => {
          (element as HTMLElement & { inert: boolean }).inert = false;
        });
        hasInertAppliedRef.current = false;
      }
    };
  }, [isMenuOpen, isMobileViewport]);

  useEffect(() => {
    if (!wasMenuOpenRef.current && !isMenuOpen) {
      wasMenuOpenRef.current = isMenuOpen;
      return;
    }

    if (!isMenuOpen && isMobileViewport && toggleRef.current) {
      toggleRef.current.focus();
    }

    wasMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen, isMobileViewport]);

  const handleToggle = () => {
    setIsMenuOpen((open) => !open);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className={`site-header${isSticky ? " is-sticky" : ""}`}>
        <div className="container">
          <nav
            ref={navRef}
            className={`main-nav${isMenuOpen ? " open" : ""}`}
            aria-label="Main navigation"
          >
            <a className="brand" href="#" aria-label="Belkins home">
              <span className="brand-icon" aria-hidden="true"></span>
              <span className="brand-text">belkins</span>
            </a>
            <button
              ref={toggleRef}
              className="nav-toggle"
              type="button"
              aria-expanded={isMenuOpen}
              aria-controls="primary-navigation"
              aria-label="Toggle navigation"
              onClick={handleToggle}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div
              ref={linksRef}
              className="nav-links"
              id="primary-navigation"
            >
              {NAV_LINKS.map((link) => {
                const isCurrent =
                  link.href !== "#" && currentPath.endsWith(link.href);

                return (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={closeMenu}
                    aria-current={isCurrent ? "page" : undefined}
                    className={isCurrent ? "is-active" : undefined}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>
            <a className="btn btn-outline" href="#">
              Book a call
            </a>
          </nav>
        </div>
      </header>
    </>
  );
};

export default Header;
