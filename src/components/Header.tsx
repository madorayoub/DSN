"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MOBILE_NAV_BREAKPOINT = 900;

type NavLink = {
  href: string;
  label: string;
  className?: string;
};

const NAV_LINKS: NavLink[] = [
  { href: "/services-and-solutions", label: "Services & solutions" },
  { href: "/industries", label: "Industries" },
  { href: "/case-studies", label: "Case studies" },
  { href: "/about", label: "About" },
  {
    href: "/book-a-call",
    label: "Talk to an expert",
    className: "btn btn-primary",
  },
];

const Header = () => {
  const [isSticky, setIsSticky] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [currentPath, setCurrentPath] = useState("");

  const navRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const linksRef = useRef<HTMLElement | null>(null);
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
            <a className="brand" href="/" aria-label="Direct Sales Network home">
              <span className="brand-icon">
                <picture className="brand-mark">
                  <source
                    media="(max-width: 420px)"
                    srcSet="https://res.cloudinary.com/diptffkzh/image/upload/v1759298298/2d235155-6742-4f37-9224-b610afa086b9_1_umlo20.png"
                  />
                  <img
                    src="https://res.cloudinary.com/diptffkzh/image/upload/v1759298117/a6217701-00a9-4fe2-9a1c-ed4e14b1a035_1_ywzdfl.png"
                    alt="Direct Sales Network logo"
                    loading="eager"
                    decoding="async"
                  />
                </picture>
              </span>
            </a>
            <button
              ref={toggleRef}
              className="nav-toggle"
              type="button"
              aria-expanded={isMenuOpen ? "true" : "false"}
              aria-controls="primary-navigation"
              aria-label="Toggle navigation"
              onClick={handleToggle}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <nav
              ref={linksRef}
              className="nav-links"
              id="primary-navigation"
              aria-label="Primary"
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
                    className={`${link.className ?? ""}${
                      isCurrent && !link.className ? " is-active" : ""
                    }`.trim() || undefined}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>
          </nav>
        </div>
      </header>
    </>
  );
};

export default Header;
