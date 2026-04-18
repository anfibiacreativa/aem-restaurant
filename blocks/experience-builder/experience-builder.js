/**
 * Experience Builder block — scripted mock code editor.
 *
 * Three-stage flow:
 *   1. Code streams in with typewriter animation (scroll-triggered)
 *   2. Preview replaces code area with live booking app iframe
 *   3. Deploy shows progress bar → "Publish to DA" button appears
 *
 * Authoring contract (table rows):
 *   preview-url  | <fragment app URL>
 */

const CODE = `---
/**
 * Restaurant table-booking form.
 * Matches host site design tokens. Posts reservation
 * events via BroadcastChannel so the shell page reacts.
 */
---
<section class="booking">
  <h2>Reserve a Table</h2>

  <form id="booking-form" novalidate>
    <label class="field">
      <span class="field-label">Date</span>
      <input type="date" name="date" required min="" />
    </label>

    <label class="field">
      <span class="field-label">Time</span>
      <select name="time" required>
        <option value="" disabled selected>Select a time</option>
      </select>
    </label>

    <label class="field">
      <span class="field-label">Party size</span>
      <select name="partySize" required>
        <option value="" disabled selected>Guests</option>
        <option value="1">1 guest</option>
        <option value="2">2 guests</option>
        <option value="4">4 guests</option>
        <option value="6">6 guests</option>
        <option value="8">8 guests</option>
      </select>
    </label>

    <label class="field">
      <span class="field-label">Name</span>
      <input type="text" name="name" required
        placeholder="Your full name" autocomplete="name" />
    </label>

    <label class="field">
      <span class="field-label">Phone</span>
      <input type="tel" name="phone" required
        placeholder="+1 (555) 000-0000" autocomplete="tel" />
    </label>

    <label class="field field-checkbox">
      <input type="checkbox" name="terms" required />
      <span>I accept the terms of service</span>
    </label>

    <button type="submit" class="btn-primary" disabled>
      Book Now
    </button>
  </form>
</section>

<script>
  const CHANNEL = '/reservations';
  const form = document.getElementById('booking-form');
  const submitBtn = form.querySelector('[type="submit"]');

  function validateForm() {
    submitBtn.disabled = !form.checkValidity();
  }

  form.addEventListener('input', validateForm);
  form.addEventListener('change', validateForm);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) return;

    const data = Object.fromEntries(new FormData(form));
    const booking = { ...data, id: crypto.randomUUID() };

    const all = JSON.parse(
      sessionStorage.getItem('bookings') || '[]'
    );
    all.push(booking);
    sessionStorage.setItem('bookings', JSON.stringify(all));

    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({
      type: 'reservation_confirmed',
      booking,
    });
    bc.close();
  });
</script>

<style>
  .booking { max-width: 480px; margin: 0 auto; }
  .field { display: flex; flex-direction: column; gap: .35rem; margin-bottom: 1.25rem; }
  .field-label { font-size: var(--body-font-size-xs); color: var(--text-secondary); text-transform: uppercase; }
  input, select { padding: .75rem 1rem; border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--surface-color); color: var(--text-color); }
  .btn-primary { width: 100%; padding: .85rem; border: none; border-radius: 2.4em; background: var(--accent-color); color: var(--background-color); cursor: pointer; }
  .btn-primary:disabled { opacity: .4; cursor: not-allowed; }
</style>`;

const FILE_TREE = [
  { name: 'src', type: 'dir', open: true, children: [
    { name: 'components', type: 'dir', open: true, children: [
      { name: 'BookingForm.astro', type: 'file', active: true },
    ]},
    { name: 'layouts', type: 'dir', children: [
      { name: 'Layout.astro', type: 'file' },
    ]},
    { name: 'pages', type: 'dir', children: [
      { name: 'index.astro', type: 'file' },
    ]},
    { name: 'styles', type: 'dir', children: [
      { name: 'global.css', type: 'file' },
    ]},
  ]},
  { name: 'public', type: 'dir', children: [
    { name: '_headers', type: 'file' },
  ]},
  { name: 'package.json', type: 'file' },
  { name: 'astro.config.mjs', type: 'file' },
];

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(raw) {
  let h = escapeHtml(raw);
  h = h.replace(/^(---)$/gm, '<span class="eb-fence">$1</span>');
  h = h.replace(/(\/\*\*[\s\S]*?\*\/)/g, '<span class="eb-comment">$1</span>');
  h = h.replace(/(\/\/.*)/g, '<span class="eb-comment">$1</span>');
  h = h.replace(/(&lt;!--.*?--&gt;)/g, '<span class="eb-comment">$1</span>');
  h = h.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="eb-string">$1</span>');
  h = h.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="eb-string">$1</span>');
  h = h.replace(/(`(?:[^`\\]|\\.)*`)/g, '<span class="eb-string">$1</span>');
  h = h.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="eb-tag">$2</span>');
  h = h.replace(/\b(class|type|name|id|required|disabled|placeholder|autocomplete|value|min|novalidate|selected)\b(?==)/g, '<span class="eb-attr">$1</span>');
  h = h.replace(/\b(const|let|var|function|return|if|new|try|catch|async|await|import|from|export)\b/g, '<span class="eb-kw">$1</span>');
  return h;
}

function renderFileTree(items, depth = 0) {
  return items.map((item) => {
    const indent = depth * 16;
    const isOpen = item.open;
    if (item.type === 'dir') {
      const chevron = isOpen ? '▾' : '▸';
      const icon = isOpen ? '📂' : '📁';
      const kids = isOpen && item.children ? renderFileTree(item.children, depth + 1) : '';
      return `<div class="eb-tree-item eb-tree-dir" style="padding-left:${indent}px">`
        + `<span class="eb-tree-chevron">${chevron}</span>`
        + `<span class="eb-tree-icon">${icon}</span>`
        + `<span class="eb-tree-name">${item.name}</span>`
        + `</div>${kids}`;
    }
    const active = item.active ? ' eb-tree-active' : '';
    return `<div class="eb-tree-item eb-tree-file${active}" style="padding-left:${indent + 16}px">`
      + `<span class="eb-tree-icon">📄</span>`
      + `<span class="eb-tree-name">${item.name}</span>`
      + `</div>`;
  }).join('');
}

function parseConfig(block) {
  const cfg = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      const key = cells[0].textContent.trim().toLowerCase();
      const val = cells[1].textContent.trim();
      if (key && val) cfg[key] = val;
    }
  });
  return cfg;
}

export default function decorate(block) {
  const config = parseConfig(block);
  const previewUrl = config['preview-url'] || 'https://aem-restaurant-booking.pages.dev';

  block.textContent = '';

  // --- Header: badges ---
  const header = document.createElement('div');
  header.className = 'eb-header';
  header.innerHTML = `
    <div class="eb-badges">
      <span class="eb-badge"><span class="eb-dot"></span>Connected to Figma</span>
      <span class="eb-badge"><span class="eb-dot"></span>Connected to Enterprise Ground Truth</span>
    </div>`;
  block.appendChild(header);

  // --- Tab bar ---
  const tabBar = document.createElement('div');
  tabBar.className = 'eb-tabs';
  tabBar.innerHTML = `
    <div class="eb-tab eb-tab-active">
      <span class="eb-tab-name">BookingForm.astro</span>
      <span class="eb-tab-close">×</span>
    </div>
    <div class="eb-tab">
      <span class="eb-tab-name">global.css</span>
      <span class="eb-tab-agent-dot" title="Agent is working..."></span>
    </div>`;
  block.appendChild(tabBar);

  // --- Main body: sidebar + code ---
  const body = document.createElement('div');
  body.className = 'eb-body';

  const sidebar = document.createElement('div');
  sidebar.className = 'eb-sidebar';
  sidebar.innerHTML = `<div class="eb-sidebar-title">EXPLORER</div>${renderFileTree(FILE_TREE)}`;
  body.appendChild(sidebar);

  const codeWrap = document.createElement('div');
  codeWrap.className = 'eb-code-wrap';
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  pre.appendChild(code);
  codeWrap.appendChild(pre);
  body.appendChild(codeWrap);

  block.appendChild(body);

  // --- Status bar (progress bar + publish, hidden initially) ---
  const statusBar = document.createElement('div');
  statusBar.className = 'eb-status-bar eb-hidden';
  block.appendChild(statusBar);

  // --- Button bar ---
  const btnBar = document.createElement('div');
  btnBar.className = 'eb-buttons';

  const previewBtn = document.createElement('button');
  previewBtn.className = 'eb-btn eb-btn-preview';
  previewBtn.textContent = 'Preview';
  previewBtn.type = 'button';
  previewBtn.disabled = true;

  const deployBtn = document.createElement('button');
  deployBtn.className = 'eb-btn eb-btn-deploy';
  deployBtn.textContent = 'Deploy';
  deployBtn.type = 'button';
  deployBtn.disabled = true;

  const publishBtn = document.createElement('button');
  publishBtn.className = 'eb-btn eb-btn-publish eb-hidden';
  publishBtn.textContent = 'Publish to DA';
  publishBtn.type = 'button';

  btnBar.appendChild(previewBtn);
  btnBar.appendChild(deployBtn);
  btnBar.appendChild(publishBtn);
  block.appendChild(btnBar);

  // --- Stage 2: Preview → hide IDE chrome, show booking app full-width ---
  previewBtn.addEventListener('click', () => {
    header.classList.add('eb-hidden');
    tabBar.classList.add('eb-hidden');
    sidebar.classList.add('eb-hidden');

    codeWrap.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = previewUrl;
    iframe.className = 'eb-preview-iframe';
    iframe.setAttribute('loading', 'eager');
    codeWrap.appendChild(iframe);
    codeWrap.classList.add('eb-preview-mode');

    previewBtn.classList.remove('eb-btn-ready');
    previewBtn.classList.add('eb-btn-active-state');
    previewBtn.disabled = true;

    deployBtn.disabled = false;
    deployBtn.classList.add('eb-btn-ready');
  });

  // --- Stage 3: Deploy → progress bar → Publish to DA ---
  deployBtn.addEventListener('click', () => {
    deployBtn.disabled = true;
    deployBtn.classList.remove('eb-btn-ready');
    deployBtn.classList.add('eb-btn-active-state');

    statusBar.classList.remove('eb-hidden');
    statusBar.innerHTML = `
      <div class="eb-progress-wrap">
        <span class="eb-progress-label">Deploying experience to CDN...</span>
        <div class="eb-progress-track">
          <div class="eb-progress-bar"></div>
        </div>
      </div>`;

    const bar = statusBar.querySelector('.eb-progress-bar');
    let pct = 0;
    const tick = setInterval(() => {
      pct += 2 + Math.random() * 4;
      if (pct >= 100) {
        pct = 100;
        clearInterval(tick);

        statusBar.querySelector('.eb-progress-label').textContent = 'Deployed to CDN ✓';
        bar.style.width = '100%';
        bar.classList.add('eb-progress-done');

        setTimeout(() => {
          publishBtn.classList.remove('eb-hidden');
          publishBtn.classList.add('eb-btn-publish-ready');
        }, 400);
      }
      bar.style.width = `${pct}%`;
    }, 80);
  });

  // --- Typewriter animation (starts on scroll) ---
  const CHARS_PER_TICK = 3;
  const TICK_MS = 18;

  function startAnimation() {
    let pos = 0;
    const timer = setInterval(() => {
      pos = Math.min(pos + CHARS_PER_TICK, CODE.length);
      const visible = CODE.slice(0, pos);
      code.innerHTML = highlight(visible) + '<span class="eb-cursor"></span>';
      codeWrap.scrollTop = codeWrap.scrollHeight;

      if (pos >= CODE.length) {
        clearInterval(timer);
        code.innerHTML = highlight(CODE);
        previewBtn.disabled = false;
        previewBtn.classList.add('eb-btn-ready');
      }
    }, TICK_MS);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        startAnimation();
      }
    });
  }, { threshold: 0.15 });
  observer.observe(block);
}
