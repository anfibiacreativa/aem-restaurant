/**
 * Decorates the parallax-quote block with scroll-based parallax effect.
 * @param {Element} block The parallax-quote block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const picture = block.querySelector('picture');
  const img = picture ? picture.querySelector('img') : null;

  // restructure: separate image from quote content
  const wrapper = document.createElement('div');
  wrapper.className = 'parallax-quote-content';

  rows.forEach((row) => {
    if (!row.querySelector('picture')) {
      const text = row.querySelector('div');
      if (text) wrapper.append(...text.children);
    }
  });

  block.textContent = '';
  if (picture) {
    const bgWrap = document.createElement('div');
    bgWrap.className = 'parallax-quote-bg';
    bgWrap.append(picture);
    block.append(bgWrap);
  }
  block.append(wrapper);

  // parallax on background image
  if (img) {
    img.style.transform = 'scale(1.2)';
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const rect = block.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const viewCenter = window.innerHeight / 2;
          const offset = (center - viewCenter) * 0.15;
          img.style.transform = `translateY(${offset}px) scale(1.2)`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // reveal on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        wrapper.classList.add('visible');
      }
    });
  }, { threshold: 0.3 });
  observer.observe(block);
}
