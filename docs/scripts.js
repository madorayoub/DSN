document.addEventListener('DOMContentLoaded', () => {
  const cloneTpl = (id) => (id ? document.getElementById(id)?.content?.cloneNode(true) || null : null);

  const loadFragment = async ({ selector, name, fallbackId }) => {
    const slot = document.querySelector(selector);

    if (!slot) {
      return;
    }

    const injectFallback = () => {
      if (!fallbackId) {
        return;
      }

      const frag = cloneTpl(fallbackId);
      if (frag) {
        slot.replaceWith(frag);
      }
    };

    if (location.protocol === 'file:') {
      injectFallback();
      return;
    }

    const url = new URL(`partials/${name}.html`, location.href).toString();

    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) {
        throw new Error();
      }

      const html = await res.text();
      const template = document.createElement('template');
      template.innerHTML = html;
      slot.replaceWith(template.content.cloneNode(true));
    } catch {
      injectFallback();
    }
  };

  const fragments = [
    { selector: '[data-fragment="header"]', name: 'header', fallbackId: 'header-fallback' },
    { selector: '[data-fragment="footer"]', name: 'footer', fallbackId: 'footer-fallback' },
    { selector: '[data-fragment="testimonials"]', name: 'testimonials' }
  ];

  Promise.all(fragments.map((fragment) => loadFragment(fragment))).then(() => {
    const header = document.querySelector('.site-header, header.site-header');
    const onScroll = () => header && header.classList.toggle('is-sticky', window.scrollY > 4);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });

    const nav = document.querySelector('.main-nav');
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
    const inertTargets = Array.from(document.querySelectorAll('main, #site-footer, footer.site-footer'));
    const supportsInert = typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;
    let previousOverflow = '';

    const setSurfaceInert = (value) => {
      if (!supportsInert) {
        return;
      }

      inertTargets.forEach((element) => {
        if (element) {
          element.inert = value;
        }
      });
    };

    const closeNav = () => {
      if (!nav) {
        return;
      }

      nav.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      if (document.body) {
        document.body.style.overflow = previousOverflow;
      }
      setSurfaceInert(false);
    };

    const openNav = () => {
      if (!nav || !toggle) {
        return;
      }

      if (document.body) {
        previousOverflow = document.body.style.overflow;
      }
      nav.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      if (document.body) {
        document.body.style.overflow = 'hidden';
      }
      setSurfaceInert(true);
    };

    toggle?.addEventListener('click', () => {
      if (nav?.classList.contains('open')) {
        closeNav();
      } else {
        openNav();
      }
    });

    document.addEventListener('keydown', (event) => {
      const isOpen = nav?.classList.contains('open');
      if (!isOpen || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      closeNav();
      toggle?.focus();
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', closeNav);
    });

    const updateActiveNav = () => {
      const segments = window.location.pathname.split('/').filter(Boolean);
      const currentPath = segments.length ? segments[segments.length - 1] : 'index.html';

      navLinks.forEach((link) => {
        const href = link.getAttribute('href');

        if (!href || href.startsWith('#')) {
          link.removeAttribute('aria-current');
          return;
        }

        const normalizedHref = href.replace(/^\//, '');

        if (normalizedHref === currentPath || (normalizedHref === 'index.html' && currentPath === '')) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    updateActiveNav();

    document.dispatchEvent(new CustomEvent('chrome:ready'));
  });
});

const pipelineSection = document.querySelector('#pipeline');

if (pipelineSection) {
  const tabs = Array.from(pipelineSection.querySelectorAll('.pipeline__tab'));
  const panels = Array.from(pipelineSection.querySelectorAll('.pipeline__panel'));
  const layers = Array.from(pipelineSection.querySelectorAll('.funnel__layer'));

  const stepConfigs = tabs.map((tab, index) => {
    const key = tab.getAttribute('data-step-key') || `step-${index}`;
    const panel = panels.find((node) => node.getAttribute('data-step-key') === key);
    const layer = layers.find((node) => node.getAttribute('data-step-key') === key);
    const description = tab.querySelector('.pipeline__description');
    return { key, tab, panel, layer, description };
  });

  let focusIndex = 0;
  let activeIndex = -1;

  const updateTabFocus = () => {
    tabs.forEach((tab, index) => {
      tab.setAttribute('tabindex', index === focusIndex ? '0' : '-1');
    });
  };

  const updateHash = (key) => {
    const url = new URL(window.location.href);
    url.hash = `pipeline-step=${key}`;
    window.history.replaceState(null, '', url);
  };

  const setActive = (index, options = {}) => {
    const { setFocus = true, updateHash: shouldUpdateHash = true } = options;

    if (index < 0 || index >= stepConfigs.length) {
      return;
    }

    if (activeIndex === index) {
      if (shouldUpdateHash) {
        updateHash(stepConfigs[index].key);
      }
      return;
    }

    activeIndex = index;

    stepConfigs.forEach((config, stepIndex) => {
      const isActive = stepIndex === index;
      config.tab.setAttribute('aria-selected', String(isActive));
      config.tab.setAttribute('aria-expanded', String(isActive));
      config.tab.classList.toggle('pipeline__tab--active', isActive);

      if (config.description) {
        config.description.classList.toggle('pipeline__description--active', isActive);
        config.description.setAttribute('aria-hidden', String(!isActive));
      }

      if (config.panel) {
        config.panel.hidden = !isActive;
        config.panel.classList.toggle('pipeline__panel--active', isActive);
      }

      if (config.layer) {
        config.layer.classList.toggle('funnel__layer--active', isActive);
        config.layer.setAttribute('aria-pressed', String(isActive));
      }
    });

    if (setFocus) {
      focusIndex = index;
    }

    updateTabFocus();

    if (shouldUpdateHash) {
      updateHash(stepConfigs[index].key);
    }
  };

  const moveFocus = (nextIndex) => {
    if (!tabs.length) {
      return;
    }

    let target = nextIndex;

    if (target < 0) {
      target = stepConfigs.length - 1;
    } else if (target >= stepConfigs.length) {
      target = 0;
    }

    focusIndex = target;
    updateTabFocus();
    tabs[target].focus();
    setActive(target, { setFocus: false });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      setActive(index);
      tabs[index].focus();
    });

    tab.addEventListener('focus', () => {
      focusIndex = index;
      updateTabFocus();
    });

    tab.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          moveFocus(index + 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveFocus(index - 1);
          break;
        case 'Home':
          event.preventDefault();
          moveFocus(0);
          break;
        case 'End':
          event.preventDefault();
          moveFocus(stepConfigs.length - 1);
          break;
        case ' ':
        case 'Enter':
          event.preventDefault();
          setActive(index);
          break;
        default:
          break;
      }
    });
  });

  layers.forEach((layer) => {
    const key = layer.getAttribute('data-step-key');
    const index = stepConfigs.findIndex((config) => config.key === key);

    if (index === -1) {
      return;
    }

    layer.addEventListener('click', () => {
      setActive(index);
      tabs[index].focus();
    });
  });

  const parseHash = () => {
    const hash = window.location.hash;
    const match = hash.match(/pipeline-step=([a-z-]+)/i);
    if (!match) {
      return undefined;
    }
    const key = match[1];
    const foundIndex = stepConfigs.findIndex((config) => config.key === key);
    return foundIndex >= 0 ? foundIndex : undefined;
  };

  updateTabFocus();

  const initialIndex = parseHash();

  if (typeof initialIndex === 'number') {
    setActive(initialIndex, { setFocus: true, updateHash: false });
  } else if (stepConfigs.length > 0) {
    const defaultIndex = Math.min(1, stepConfigs.length - 1);
    setActive(defaultIndex, { setFocus: true, updateHash: true });
  }

  window.addEventListener('hashchange', () => {
    const nextIndex = parseHash();
    if (typeof nextIndex === 'number') {
      setActive(nextIndex, { setFocus: true, updateHash: false });
    }
  });
}

let footerInitialized = false;

const initFooterFeatures = () => {
  if (footerInitialized) {
    return;
  }

  const footerYear = document.querySelector('#footer-year');
  const newsletterForm = document.querySelector('.footer-newsletter__form');
  const languageSelect = document.querySelector('#footer-language-select');

  if (!footerYear && !newsletterForm && !languageSelect) {
    return;
  }

  footerInitialized = true;

  if (footerYear) {
    footerYear.textContent = String(new Date().getFullYear());
  }

  if (newsletterForm) {
    const emailInput = newsletterForm.querySelector('input[type="email"]');
    const messageEl = newsletterForm.querySelector('.footer-newsletter__message');
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const setMessage = (text, state) => {
      if (!messageEl) {
        return;
      }

      messageEl.textContent = text;
      messageEl.classList.remove('is-success', 'is-error');

      if (state === 'success') {
        messageEl.classList.add('is-success');
      } else if (state === 'error') {
        messageEl.classList.add('is-error');
      }
    };

    const clearMessage = () => {
      if (!messageEl) {
        return;
      }

      messageEl.textContent = '';
      messageEl.classList.remove('is-success', 'is-error');
    };

    if (emailInput) {
      emailInput.setAttribute('aria-invalid', 'false');
      emailInput.addEventListener('input', () => {
        emailInput.setAttribute('aria-invalid', 'false');
        clearMessage();
      });
    }

    newsletterForm.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!emailInput || !messageEl) {
        return;
      }

      const value = emailInput.value.trim();

      if (!value) {
        emailInput.setAttribute('aria-invalid', 'true');
        setMessage('Please enter your email address.', 'error');
        emailInput.focus();
        return;
      }

      if (!pattern.test(value)) {
        emailInput.setAttribute('aria-invalid', 'true');
        setMessage('Please enter a valid email address.', 'error');
        emailInput.focus();
        return;
      }

      emailInput.setAttribute('aria-invalid', 'false');
      setMessage('Thanks! You are subscribed.', 'success');
      newsletterForm.reset();
    });
  }

  if (languageSelect) {
    const storageKey = 'site-language-preference';

    try {
      const storedValue = window.localStorage.getItem(storageKey);
      if (storedValue) {
        languageSelect.value = storedValue;
      }
    } catch (error) {
      // localStorage may be unavailable; ignore errors silently.
    }

    languageSelect.addEventListener('change', () => {
      try {
        window.localStorage.setItem(storageKey, languageSelect.value);
      } catch (error) {
        // localStorage may be unavailable; ignore errors silently.
      }
    });
  }
};

document.addEventListener('chrome:ready', initFooterFeatures);
document.addEventListener('DOMContentLoaded', initFooterFeatures);
if (document.readyState !== 'loading') {
  initFooterFeatures();
}

const testimonialsSection = document.querySelector('.testimonials');

  if (testimonialsSection) {
    const scroller = testimonialsSection.querySelector('.testimonials__track');
    const viewport = testimonialsSection.querySelector('.testimonials__viewport');
    const cards = Array.from(testimonialsSection.querySelectorAll('.testimonial-card'));
    const prevButton = testimonialsSection.querySelector('.testimonials__nav[data-direction="prev"]');
    const nextButton = testimonialsSection.querySelector('.testimonials__nav[data-direction="next"]');

    if (scroller && viewport && cards.length && prevButton && nextButton) {
      let ticking = false;

      const getStep = () => {
        if (cards.length < 2) {
          return scroller.clientWidth;
        }

        const firstRect = cards[0].getBoundingClientRect();
        const secondRect = cards[1].getBoundingClientRect();
        const step = Math.round(secondRect.left - firstRect.left);
        return step !== 0 ? step : cards[0].getBoundingClientRect().width;
      };

      const updateButtons = () => {
        const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
        const epsilon = 1;
        prevButton.disabled = scroller.scrollLeft <= epsilon;
        nextButton.disabled = scroller.scrollLeft >= maxScrollLeft - epsilon;
      };

      const requestUpdate = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            updateButtons();
            ticking = false;
          });
          ticking = true;
        }
      };

      const scrollByStep = (direction) => {
        const step = getStep();
        scroller.scrollBy({ left: direction * step, behavior: 'smooth' });
      };

      prevButton.addEventListener('click', () => {
        scrollByStep(-1);
      });

      nextButton.addEventListener('click', () => {
        scrollByStep(1);
      });

      scroller.addEventListener('scroll', requestUpdate, { passive: true });

      window.addEventListener('resize', requestUpdate);

      viewport.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          scrollByStep(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          scrollByStep(1);
        }
      });

      updateButtons();
    }
  }
