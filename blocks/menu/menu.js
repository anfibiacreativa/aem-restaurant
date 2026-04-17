/**
 * Decorates the menu block — transforms authored table rows into
 * a structured restaurant menu with categories and items.
 * Expected structure per row: [item name + description | price]
 * A row with only one cell (no price) is treated as a category header.
 * @param {Element} block The menu block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  let currentCategory = null;
  const fragment = document.createDocumentFragment();

  rows.forEach((row) => {
    const cols = [...row.children];

    if (cols.length === 1) {
      // category header row
      currentCategory = document.createElement('div');
      currentCategory.className = 'menu-category';
      const heading = document.createElement('h3');
      heading.className = 'menu-category-title';
      heading.textContent = cols[0].textContent.trim();
      currentCategory.append(heading);
      const items = document.createElement('div');
      items.className = 'menu-items';
      currentCategory.append(items);
      fragment.append(currentCategory);
    } else if (cols.length >= 2 && currentCategory) {
      // menu item row
      const itemsContainer = currentCategory.querySelector('.menu-items');
      const item = document.createElement('div');
      item.className = 'menu-item';

      const info = document.createElement('div');
      info.className = 'menu-item-info';

      const nameEl = document.createElement('span');
      nameEl.className = 'menu-item-name';
      // first col may contain name + description in separate paragraphs
      const nameContent = cols[0].querySelector('strong, h4, h5, h6');
      if (nameContent) {
        nameEl.textContent = nameContent.textContent.trim();
      } else {
        const firstText = cols[0].textContent.trim().split('\n')[0];
        nameEl.textContent = firstText;
      }
      info.append(nameEl);

      // description: remaining text in first col
      const descText = cols[0].querySelector('em, p:last-child');
      if (descText && descText.textContent.trim() !== nameEl.textContent) {
        const desc = document.createElement('span');
        desc.className = 'menu-item-desc';
        desc.textContent = descText.textContent.trim();
        info.append(desc);
      }

      const dotLine = document.createElement('span');
      dotLine.className = 'menu-item-dots';
      dotLine.setAttribute('aria-hidden', 'true');

      const price = document.createElement('span');
      price.className = 'menu-item-price';
      price.textContent = cols[1].textContent.trim();

      item.append(info, dotLine, price);
      itemsContainer.append(item);
    }
  });

  block.textContent = '';
  block.append(fragment);

  // reveal animation on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15 });

  block.querySelectorAll('.menu-category').forEach((cat) => {
    cat.classList.add('reveal');
    observer.observe(cat);
  });
}
