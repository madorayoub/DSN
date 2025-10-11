const nav = document.querySelector('.main-nav');
const navToggle = document.querySelector('.nav-toggle');
if (nav && navToggle) {
  const toggleNav = () => {
    const isOpen = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  };

  navToggle.addEventListener('click', toggleNav);

  window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
    if (event.matches) {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

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

const testimonialsSection = document.querySelector('.testimonials');

if (testimonialsSection) {
  const scroller = testimonialsSection.querySelector('.testimonials__track');
  const viewport = testimonialsSection.querySelector('.testimonials__viewport');
  const cards = Array.from(testimonialsSection.querySelectorAll('.testimonial-card'));
  const prevButton = testimonialsSection.querySelector('.testimonials__nav[data-direction="prev"]');
  const nextButton = testimonialsSection.querySelector('.testimonials__nav[data-direction="next"]');

  if (!scroller || !viewport || !cards.length || !prevButton || !nextButton) {
    return;
  }

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
