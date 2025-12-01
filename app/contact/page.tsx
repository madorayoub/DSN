import { PHONE_NUMBER, CONTACT_EMAIL, OFFICE_ADDRESS } from "../../site.config";

export const metadata = {
  title: "Contact Us | Direct Sales Network®",
  description: "Get in touch with Direct Sales Network®. Call us, send an email, or visit our Lake Mary office. We're here to help grow your B2B revenue.",
};

export default function Page() {
  return (
    <main className="contact-page">
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="container">
          <div className="contact-hero__content">
            <span className="contact-hero__eyebrow">Get in Touch</span>
            <h1 className="contact-hero__title">
              Let's Talk About Growing Your Revenue
            </h1>
            <p className="contact-hero__lead">
              Ready to build a predictable revenue engine? Our team is here to help you scale your B2B sales with proven strategies.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods Grid */}
      <section className="contact-methods">
        <div className="container">
          <div className="contact-methods__grid">
            {/* Phone Card */}
            <div className="contact-card contact-card--phone">
              <div className="contact-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </div>
              <h3 className="contact-card__title">Call Us</h3>
              <a href={`tel:${PHONE_NUMBER}`} className="contact-card__link">
                {PHONE_NUMBER}
              </a>
              <p className="contact-card__description">Mon-Fri, 9am-6pm EST</p>
            </div>

            {/* Email Card */}
            <div className="contact-card contact-card--email">
              <div className="contact-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <h3 className="contact-card__title">Email Us</h3>
              <a href={`mailto:${CONTACT_EMAIL}`} className="contact-card__link">
                {CONTACT_EMAIL}
              </a>
              <p className="contact-card__description">We'll respond within 24 hours</p>
            </div>

            {/* Location Card */}
            <div className="contact-card contact-card--location">
              <div className="contact-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <h3 className="contact-card__title">Visit Us</h3>
              <p className="contact-card__address">
                {OFFICE_ADDRESS.street}<br />
                {OFFICE_ADDRESS.city}, {OFFICE_ADDRESS.state} {OFFICE_ADDRESS.zip}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS.full)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-card__link"
              >
                Get Directions
              </a>
            </div>

            {/* Response Time Card */}
            <div className="contact-card contact-card--time">
              <div className="contact-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h3 className="contact-card__title">Quick Response</h3>
              <p className="contact-card__highlight">
                &lt; 24 Hours
              </p>
              <p className="contact-card__description">Average response time to all inquiries</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="contact-form-section">
        <div className="container">
          <div className="contact-form-container">
            <div className="contact-form-header">
              <h2 className="contact-form-header__title">Send Us a Message</h2>
              <p className="contact-form-header__subtitle">
                Fill out the form below and we'll get back to you as soon as possible.
              </p>
            </div>
            <div className="contact-form-wrapper">
              <iframe
                src="https://api.leadconnectorhq.com/widget/form/HH6pJCi9FcqTNZ2QHQ4j"
                className="contact-form-iframe"
                id="inline-HH6pJCi9FcqTNZ2QHQ4j"
                data-layout="{'id':'INLINE'}"
                data-trigger-type="alwaysShow"
                data-trigger-value=""
                data-activation-type="alwaysActivated"
                data-activation-value=""
                data-deactivation-type="neverDeactivate"
                data-deactivation-value=""
                data-form-name="Free Demo Optin (Website - DSN)"
                data-height="424"
                data-layout-iframe-id="inline-HH6pJCi9FcqTNZ2QHQ4j"
                data-form-id="HH6pJCi9FcqTNZ2QHQ4j"
                title="Free Demo Optin (Website - DSN)"
              ></iframe>
              <script src="https://link.msgsndr.com/js/form_embed.js"></script>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="contact-quick-links">
        <div className="container">
          <h2 className="contact-quick-links__title">Other Ways to Connect</h2>
          <div className="contact-quick-links__grid">
            <a href="/book-a-call" className="contact-quick-card">
              <div className="contact-quick-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h3>Book a Call</h3>
              <p>Schedule a consultation with our team</p>
            </a>

            <a href="/faq" className="contact-quick-card">
              <div className="contact-quick-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3>FAQ</h3>
              <p>Find answers to common questions</p>
            </a>

            <a href="/case-studies" className="contact-quick-card">
              <div className="contact-quick-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
              </div>
              <h3>Case Studies</h3>
              <p>See how we've helped other businesses</p>
            </a>
          </div>
        </div>
      </section>

      {/* Social Media Links */}
      <section className="contact-social-section">
        <div className="container">
          <h2 className="contact-social__title">Follow Us</h2>
          <ul className="contact-social">
            <li>
              <a href="#" aria-label="LinkedIn" className="contact-social__link">
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M20.45 20.45h-3.6v-5.62c0-1.34-.03-3.07-1.87-3.07-1.87 0-2.16 1.46-2.16 2.96v5.73h-3.6V9h3.46v1.56h.05c.48-.9 1.66-1.84 3.42-1.84 3.66 0 4.34 2.41 4.34 5.55v6.18ZM5.34 7.43a2.09 2.09 0 1 1 0-4.18 2.09 2.09 0 0 1 0 4.18ZM7.14 20.45H3.54V9h3.6v11.45Z"
                  />
                </svg>
                <span>LinkedIn</span>
              </a>
            </li>
            <li>
              <a href="#" aria-label="X (Twitter)" className="contact-social__link">
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M19.5 4.5 13.96 11l5.74 8.5h-3.4l-4.04-5.94-4.33 5.94H4.5l5.83-7.98L4.5 4.5h3.4l3.67 5.39 3.92-5.39h3.01Z"
                  />
                </svg>
                <span>X</span>
              </a>
            </li>
            <li>
              <a href="#" aria-label="YouTube" className="contact-social__link">
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M21.6 7.2c-.2-.77-.81-1.37-1.58-1.57C18.26 5.25 12 5.25 12 5.25s-6.26 0-8.02.38a1.98 1.98 0 0 0-1.581 1.57C2 9.02 2 12 2 12s0 2.98.4 4.8c.2.77.81 1.37 1.58 1.57 1.76.38 8.02.38 8.02.38s6.26 0 8.02-.38a1.98 1.98 0 0 0 1.58-1.57C22 14.98 22 12 22 12s0-2.98-.4-4.8ZM10.5 14.85V9.15L15.3 12l-4.8 2.85Z"
                  />
                </svg>
                <span>YouTube</span>
              </a>
            </li>
            <li>
              <a href="#" aria-label="Facebook" className="contact-social__link">
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M14.5 8.5V6.75c0-.68.45-1.31 1.4-1.31h1.35V3h-2.33C11.98 3 11 4.8 11 6.54V8.5H9v2.75h2v8.7h3.5v-8.7h2.35l.35-2.75H14.5Z"
                  />
                </svg>
                <span>Facebook</span>
              </a>
            </li>
            <li>
              <a href="#" aria-label="Instagram" className="contact-social__link">
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M16.75 3H7.25A4.25 4.25 0 0 0 3 7.25v9.5A4.25 4.25 0 0 0 7.25 21h9.5A4.25 4.25 0 0 0 21 16.75v-9.5A4.25 4.25 0 0 0 16.75 3Zm2.25 13.75a2.25 2.25 0 0 1-2.25 2.25H7.25a2.25 2.25 0 0 1-2.25-2.25v-9.5a2.25 2.25 0 0 1 2.25-2.25h9.5a2.25 2.25 0 0 1 2.25 2.25v9.5ZM12 8.25A3.75 3.75 0 1 0 12 15.75 3.75 3.75 0 0 0 12 8.25Zm0 6a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Zm4.58-6.93a.9.9 0 1 0-1.8 0 .9.9 0 0 0 1.8 0Z"
                  />
                </svg>
                <span>Instagram</span>
              </a>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
