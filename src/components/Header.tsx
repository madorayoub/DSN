"use client";

import { useEffect, useState } from "react";

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
    if (!isMenuOpen) {
      return;
    }

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMenuOpen]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className={`site-header${isSticky ? " is-sticky" : ""}`}>
        <div className="container">
          <nav className={`main-nav${isMenuOpen ? " open" : ""}`} aria-label="Main navigation">
            <a className="brand" href="#" aria-label="Belkins home">
              <span className="brand-icon" aria-hidden="true"></span>
              <span className="brand-text">belkins</span>
            </a>
            <button
              className="nav-toggle"
              type="button"
              aria-expanded={isMenuOpen}
              aria-controls="primary-navigation"
              aria-label="Toggle navigation"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div className="nav-links" id="primary-navigation">
              {NAV_LINKS.map((link) => (
                <a key={link.label} href={link.href} onClick={() => setIsMenuOpen(false)}>
                  {link.label}
                </a>
              ))}
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
