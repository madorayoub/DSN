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
