/**
 * Adds parallax scrolling effect to the hero background image.
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  const img = block.querySelector('img');
  if (!img) return;

  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const { scrollY } = window;
        const rate = 0.35;
        img.style.transform = `translateY(${scrollY * rate}px) scale(1.1)`;
        ticking = false;
      });
      ticking = true;
    }
  };

  // initial scale to prevent gap at bottom during scroll
  img.style.transform = 'translateY(0) scale(1.1)';
  window.addEventListener('scroll', onScroll, { passive: true });
}
