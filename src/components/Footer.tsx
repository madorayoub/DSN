"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BOOK_A_CALL_PATH } from "../lib/links";

const Footer = () => {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem("site-language-preference");
      if (stored) {
        setLanguage(stored);
      }
    } catch (error) {
      // localStorage may be unavailable; ignore errors.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem("site-language-preference", language);
    } catch (error) {
      // localStorage may be unavailable; ignore errors.
    }
  }, [language]);

  const currentYear = new Date().getFullYear();

  return (
    <footer id="site-footer" className="site-footer" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Site footer
      </h2>
      <div className="site-footer__surface">
        <div className="container">
          <div className="footer-callout">
            <div className="footer-callout__content">
              <a
                className="brand brand--footer"
                href="/"
                aria-label="Direct Sales Network® home"
              >
                <span className="brand-icon">
                  <picture className="brand-mark">
                    <source
                      media="(max-width: 420px)"
                      srcSet="https://res.cloudinary.com/diptffkzh/image/upload/v1760372274/image_-_Edited_1_fq8ksy.png"
                    />
                    <img
                      src="https://res.cloudinary.com/diptffkzh/image/upload/v1760372275/image_1_1_-_Edited_zx5rvw.png"
                      alt="Direct Sales Network logo"
                      loading="eager"
                      decoding="async"
                    />
                  </picture>
                </span>
              </a>
              <p className="footer-callout__value">
                Revenue-focused outreach that keeps your sales pipeline growing.
              </p>
            </div>
            <Link
              className="btn btn-primary footer-callout__cta"
              href={BOOK_A_CALL_PATH}
              prefetch={false}
            >
              Talk to an expert
            </Link>
          </div>
        </div>
        <div className="container footer-main">
          <div className="footer-grid">
            <div className="footer-column footer-column--brand">
              <a
                className="brand brand--footer"
                href="/"
                aria-label="Direct Sales Network® home"
              >
                <span className="brand-icon">
                  <picture className="brand-mark">
                    <source
                      media="(max-width: 420px)"
                      srcSet="https://res.cloudinary.com/diptffkzh/image/upload/v1760372274/image_-_Edited_1_fq8ksy.png"
                    />
                    <img
                      src="https://res.cloudinary.com/diptffkzh/image/upload/v1760372275/image_1_1_-_Edited_zx5rvw.png"
                      alt="Direct Sales Network logo"
                      loading="eager"
                      decoding="async"
                    />
                  </picture>
                </span>
              </a>
              <p className="footer-column__blurb">
                Direct Sales Network® builds predictable revenue engines for ambitious B2B teams.
              </p>
              <ul className="footer-contact">
                <li>
                  <a href="mailto:hello@belkins.com">hello@belkins.com</a>
                </li>
                <li>
                  <a href="mailto:support@belkins.com">support@belkins.com</a>
                </li>
              </ul>
              <ul className="footer-social" aria-label="Follow Direct Sales Network®">
                <li>
                  <a href="#" aria-label="LinkedIn">
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M20.45 20.45h-3.6v-5.62c0-1.34-.03-3.07-1.87-3.07-1.87 0-2.16 1.46-2.16 2.96v5.73h-3.6V9h3.46v1.56h.05c.48-.9 1.66-1.84 3.42-1.84 3.66 0 4.34 2.41 4.34 5.55v6.18ZM5.34 7.43a2.09 2.09 0 1 1 0-4.18 2.09 2.09 0 0 1 0 4.18ZM7.14 20.45H3.54V9h3.6v11.45Z"
                      />
                    </svg>
                  </a>
                </li>
                <li>
                  <a href="#" aria-label="X">
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M19.5 4.5 13.96 11l5.74 8.5h-3.4l-4.04-5.94-4.33 5.94H4.5l5.83-7.98L4.5 4.5h3.4l3.67 5.39 3.92-5.39h3.01Z"
                      />
                    </svg>
                  </a>
                </li>
                <li>
                  <a href="#" aria-label="YouTube">
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M21.6 7.2c-.2-.77-.81-1.37-1.58-1.57C18.26 5.25 12 5.25 12 5.25s-6.26 0-8.02.38a1.98 1.98 0 0 0-1.581 1.57C2 9.02 2 12 2 12s0 2.98.4 4.8c.2.77.81 1.37 1.58 1.57 1.76.38 8.02.38 8.02.38s6.26 0 8.02-.38a1.98 1.98 0 0 0 1.58-1.57C22 14.98 22 12 22 12s0-2.98-.4-4.8ZM10.5 14.85V9.15L15.3 12l-4.8 2.85Z"
                      />
                    </svg>
                  </a>
                </li>
                <li>
                  <a href="#" aria-label="Facebook">
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M14.5 8.5V6.75c0-.68.45-1.31 1.4-1.31h1.35V3h-2.33C11.98 3 11 4.8 11 6.54V8.5H9v2.75h2v8.7h3.5v-8.7h2.35l.35-2.75H14.5Z"
                      />
                    </svg>
                  </a>
                </li>
                <li>
                  <a href="#" aria-label="Instagram">
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M16.75 3H7.25A4.25 4.25 0 0 0 3 7.25v9.5A4.25 4.25 0 0 0 7.25 21h9.5A4.25 4.25 0 0 0 21 16.75v-9.5A4.25 4.25 0 0 0 16.75 3Zm2.25 13.75a2.25 2.25 0 0 1-2.25 2.25H7.25a2.25 2.25 0 0 1-2.25-2.25v-9.5a2.25 2.25 0 0 1 2.25-2.25h9.5a2.25 2.25 0 0 1 2.25 2.25v9.5ZM12 8.25A3.75 3.75 0 1 0 12 15.75 3.75 3.75 0 0 0 12 8.25Zm0 6a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Zm4.58-6.93a.9.9 0 1 0-1.8 0 .9.9 0 0 0 1.8 0Z"
                      />
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
            <div className="footer-column">
              <h3 className="footer-column__title">Company</h3>
              <ul className="footer-links">
                <li>
                  <a href="/about">About</a>
                </li>
                <li>
                  <a href="/careers">Careers</a>
                </li>
                <li>
                  <a href="/contact">Contact</a>
                </li>
                <li>
                  <a href="/pricing">Pricing</a>
                </li>
              </ul>
            </div>
            <div className="footer-column">
              <h3 className="footer-column__title">Services &amp; solutions</h3>
              <ul className="footer-links">
                <li>
                  <a href="/services-and-solutions">Services &amp; solutions</a>
                </li>
                <li>
                  <a href="/case-studies">Case Studies</a>
                </li>
              </ul>
            </div>
            <div className="footer-column">
              <h3 className="footer-column__title">Resources</h3>
              <ul className="footer-links">
                <li>
                  <a href="/blog">Blog</a>
                </li>
                <li>
                  <a href="/knowledge-base">Knowledge Base</a>
                </li>
                <li>
                  <a href="/faq">FAQ</a>
                </li>
                <li>
                  <a href="/privacy">Privacy Policy</a>
                </li>
                <li>
                  <a href="/terms">Terms</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="footer-subfooter">
            <p className="footer-subfooter__copy">
              © <span>{currentYear}</span> Direct Sales Network®. All rights reserved.
            </p>
            <div className="footer-subfooter__actions">
              <ul className="footer-subfooter__links">
                <li>
                  <a href="#">Cookie settings</a>
                </li>
                <li>
                  <a href="#">Sitemap</a>
                </li>
              </ul>
              <div className="footer-language">
                <label htmlFor="footer-language-select">Language</label>
                <select
                  id="footer-language-select"
                  name="language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  <option value="en">EN</option>
                  <option value="es">ES</option>
                  <option value="fr">FR</option>
                  <option value="de">DE</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
