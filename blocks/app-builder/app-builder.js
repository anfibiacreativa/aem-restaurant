/**
 * App Builder block — scripted mock code editor.
 *
 * Renders a dark-themed editor panel that "streams" pre-recorded code
 * with a typewriter effect. Shows connection badges and Preview/Deploy
 * buttons when the animation completes. Purely visual — no real compilation.
 *
 * Authoring contract (table rows):
 *   preview-url  | <EDS preview URL>
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

    // Persist locally
    const all = JSON.parse(
      sessionStorage.getItem('bookings') || '[]'
    );
    all.push(booking);
    sessionStorage.setItem('bookings', JSON.stringify(all));

    // Notify the host page
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

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(raw) {
  let h = escapeHtml(raw);
  // Astro frontmatter fences
  h = h.replace(/^(---)$/gm, '<span class="ab-fence">$1</span>');
  // Block comments
  h = h.replace(/(\/\*\*[\s\S]*?\*\/)/g, '<span class="ab-comment">$1</span>');
  // Single-line comments
  h = h.replace(/(\/\/.*)/g, '<span class="ab-comment">$1</span>');
  // HTML comments
  h = h.replace(/(&lt;!--.*?--&gt;)/g, '<span class="ab-comment">$1</span>');
  // Strings (double-quoted)
  h = h.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="ab-string">$1</span>');
  // Strings (single-quoted)
  h = h.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="ab-string">$1</span>');
  // Template literals (backtick)
  h = h.replace(/(`(?:[^`\\]|\\.)*`)/g, '<span class="ab-string">$1</span>');
  // HTML tags
  h = h.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="ab-tag">$2</span>');
  // HTML attributes
  h = h.replace(/\b(class|type|name|id|required|disabled|placeholder|autocomplete|value|min|novalidate|selected)\b(?==)/g, '<span class="ab-attr">$1</span>');
  // JS keywords
  h = h.replace(/\b(const|let|var|function|return|if|new|try|catch|async|await|import|from|export)\b/g, '<span class="ab-kw">$1</span>');
  return h;
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
  const previewUrl = config['preview-url'] || '#';

  block.textContent = '';

  // Header with badges
  const header = document.createElement('div');
  header.className = 'ab-header';
  header.innerHTML = `
    <span class="ab-title">BookingForm.astro</span>
    <div class="ab-badges">
      <span class="ab-badge"><span class="ab-dot"></span>Connected to Figma</span>
      <span class="ab-badge"><span class="ab-dot"></span>Connected to Enterprise Ground Truth</span>
    </div>`;
  block.appendChild(header);

  // Code area
  const codeWrap = document.createElement('div');
  codeWrap.className = 'ab-code-wrap';
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  pre.appendChild(code);
  codeWrap.appendChild(pre);
  block.appendChild(codeWrap);

  // Button bar (hidden until streaming completes)
  const btnBar = document.createElement('div');
  btnBar.className = 'ab-buttons ab-hidden';

  const previewBtn = document.createElement('a');
  previewBtn.className = 'ab-btn ab-btn-primary';
  previewBtn.textContent = 'Preview';
  previewBtn.href = previewUrl;
  previewBtn.target = '_blank';
  previewBtn.rel = 'noopener';

  const deployBtn = document.createElement('button');
  deployBtn.className = 'ab-btn ab-btn-deploy';
  deployBtn.textContent = 'Deploy';
  deployBtn.type = 'button';
  deployBtn.dataset.tooltip = 'This is an independently deployed micro-frontend';
  deployBtn.addEventListener('click', (e) => e.preventDefault());

  btnBar.appendChild(previewBtn);
  btnBar.appendChild(deployBtn);
  block.appendChild(btnBar);

  // Typewriter animation
  const CHARS_PER_TICK = 3;
  const TICK_MS = 18;
  let pos = 0;

  const timer = setInterval(() => {
    pos = Math.min(pos + CHARS_PER_TICK, CODE.length);
    const visible = CODE.slice(0, pos);
    code.innerHTML = highlight(visible) + '<span class="ab-cursor"></span>';
    codeWrap.scrollTop = codeWrap.scrollHeight;

    if (pos >= CODE.length) {
      clearInterval(timer);
      code.innerHTML = highlight(CODE);
      btnBar.classList.remove('ab-hidden');
    }
  }, TICK_MS);
}
