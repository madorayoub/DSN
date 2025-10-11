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

function roundedTrapPath(wTop, wBot, h, r) {
  const topWidth = Number(wTop);
  const bottomWidth = Number(wBot);
  const height = Number(h);
  let radius = Number(r);

  if (!Number.isFinite(topWidth) || !Number.isFinite(bottomWidth) || !Number.isFinite(height)) {
    return '';
  }

  const offset = (topWidth - bottomWidth) / 2;
  const topLeft = { x: 0, y: 0 };
  const topRight = { x: topWidth, y: 0 };
  const bottomRight = { x: topWidth - offset, y: height };
  const bottomLeft = { x: offset, y: height };

  const slantLength = Math.hypot(bottomRight.x - topRight.x, height);
  radius = Math.max(
    0,
    Math.min(radius, topWidth / 2, bottomWidth / 2, height / 2, slantLength / 2 || radius)
  );

  const moveTowards = (from, to, distance) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const ratio = distance / length;
    return {
      x: from.x + dx * ratio,
      y: from.y + dy * ratio,
    };
  };

  const topStart = moveTowards(topLeft, topRight, radius);
  const topEnd = moveTowards(topRight, topLeft, radius);
  const rightUpper = moveTowards(topRight, bottomRight, radius);
  const rightLower = moveTowards(bottomRight, topRight, radius);
  const bottomEnd = moveTowards(bottomRight, bottomLeft, radius);
  const bottomStart = moveTowards(bottomLeft, bottomRight, radius);
  const leftLower = moveTowards(bottomLeft, topLeft, radius);
  const leftUpper = moveTowards(topLeft, bottomLeft, radius);

  return [
    `M ${topStart.x} ${topStart.y}`,
    `L ${topEnd.x} ${topEnd.y}`,
    `Q ${topRight.x} ${topRight.y} ${rightUpper.x} ${rightUpper.y}`,
    `L ${rightLower.x} ${rightLower.y}`,
    `Q ${bottomRight.x} ${bottomRight.y} ${bottomEnd.x} ${bottomEnd.y}`,
    `L ${bottomStart.x} ${bottomStart.y}`,
    `Q ${bottomLeft.x} ${bottomLeft.y} ${leftLower.x} ${leftLower.y}`,
    `L ${leftUpper.x} ${leftUpper.y}`,
    `Q ${topLeft.x} ${topLeft.y} ${topStart.x} ${topStart.y}`,
    'Z',
  ].join(' ');
}

const pipelineSection = document.querySelector('#pipeline');

if (pipelineSection) {
  const funnelShapes = pipelineSection.querySelectorAll('path[data-shape="funnel"]');
  funnelShapes.forEach((shape) => {
    const wTop = shape.getAttribute('data-width-top');
    const wBottom = shape.getAttribute('data-width-bottom') ?? wTop;
    const height = shape.getAttribute('data-height');
    const radius = shape.getAttribute('data-radius') ?? '12';
    const path = roundedTrapPath(wTop, wBottom, height, radius);
    if (path) {
      shape.setAttribute('d', path);
      shape.setAttribute('stroke-linejoin', 'round');
      shape.setAttribute('stroke-linecap', 'round');
      shape.setAttribute('vector-effect', 'non-scaling-stroke');
    }
  });

  const tabs = Array.from(pipelineSection.querySelectorAll('.pipeline__tab'));
  const panels = Array.from(pipelineSection.querySelectorAll('.pipeline__panel'));
  const layers = Array.from(pipelineSection.querySelectorAll('.funnel__layer'));

  const stepConfigs = tabs.map((tab, index) => {
    const key = tab.getAttribute('data-step-key') || `step-${index}`;
    const panel = panels.find((node) => node.getAttribute('data-step-key') === key);
    const layer = layers.find((node) => node.getAttribute('data-step-key') === key);
    const badge = layer ? layer.querySelector('.funnel__badge') : null;
    return { key, tab, panel, layer, badge };
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
      config.tab.classList.toggle('is-active', isActive);

      if (config.panel) {
        config.panel.hidden = !isActive;
        config.panel.classList.toggle('is-active', isActive);
      }

      if (config.layer) {
        config.layer.classList.toggle('is-active', isActive);
        config.layer.setAttribute('aria-pressed', String(isActive));
      }

      if (config.badge) {
        config.badge.classList.toggle('is-active', isActive);
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
    setActive(0, { setFocus: true, updateHash: true });
  }

  window.addEventListener('hashchange', () => {
    const nextIndex = parseHash();
    if (typeof nextIndex === 'number') {
      setActive(nextIndex, { setFocus: true, updateHash: false });
    }
  });
}
