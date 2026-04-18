/**
 * Web Fragment block — embeds a standalone web app via the Web Fragments library.
 *
 * Authoring contract (table rows):
 *   fragment-id  | <unique id>
 *   endpoint     | <fragment HTTP origin>
 *   routes       | <comma-separated route patterns, optional — defaults to /__wf/<fragment-id>>
 *
 * On first load the block registers a Service Worker that proxies fragment
 * requests to the endpoint, then renders the <web-fragment> element.
 */

const WF_SRC = 'https://esm.sh/web-fragments@latest';
let wfReady;
let swReady;

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

function ensureWebFragments() {
  if (wfReady) return wfReady;
  wfReady = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `import{initializeWebFragments}from"${WF_SRC}";initializeWebFragments();document.dispatchEvent(new Event("wf:ready"));`;
    document.addEventListener('wf:ready', () => resolve(), { once: true });
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return wfReady;
}

function ensureServiceWorker() {
  if (swReady) return swReady;
  if (!('serviceWorker' in navigator)) {
    swReady = Promise.resolve(null);
    return swReady;
  }
  swReady = navigator.serviceWorker
    .register('/sw.js')
    .then(() => navigator.serviceWorker.ready);
  return swReady;
}

function registerFragment(config) {
  return ensureServiceWorker().then((reg) => {
    if (!reg?.active) return;
    return new Promise((resolve) => {
      const mc = new MessageChannel();
      mc.port1.onmessage = () => resolve();
      reg.active.postMessage({
        type: 'register-fragment',
        fragmentId: config['fragment-id'],
        endpoint: config.endpoint,
        routePatterns: config.routes
          ? config.routes.split(',').map((r) => r.trim())
          : [`/__wf/${config['fragment-id']}`, `/__wf/${config['fragment-id']}/:_*`],
      }, [mc.port2]);
    });
  });
}

function listenForFragmentEvents(channels) {
  channels.forEach((name) => {
    const bc = new BroadcastChannel(name);
    bc.addEventListener('message', (event) => {
      const { type, booking } = event.data || {};
      if (type !== 'reservation_confirmed' || !booking) return;

      const existing = document.querySelector('.wf-banner');
      if (existing) existing.remove();

      const banner = document.createElement('div');
      banner.className = 'wf-banner';
      banner.setAttribute('role', 'status');
      banner.innerHTML = `
        <p>
          <strong>Your reservation is confirmed${booking.name ? `, ${booking.name}` : ''}!</strong>
          If you have any allergies or intolerances, please let us know.
        </p>
        <button type="button" aria-label="Dismiss">&times;</button>`;
      banner.querySelector('button').addEventListener('click', () => banner.remove());
      document.querySelector('main')?.prepend(banner);
      setTimeout(() => {
        banner.classList.add('wf-banner--dismiss');
        setTimeout(() => banner.remove(), 600);
      }, 10000);
    });
  });
}

export default async function decorate(block) {
  const config = parseConfig(block);
  const fragmentId = config['fragment-id'];
  if (!fragmentId) {
    block.textContent = '[web-fragment] Missing fragment-id';
    return;
  }

  if (!config.endpoint) {
    block.textContent = '[web-fragment] Missing endpoint';
    return;
  }

  await Promise.all([
    ensureWebFragments(),
    registerFragment(config),
  ]);

  listenForFragmentEvents(['/reservations']);

  const el = document.createElement('web-fragment');
  el.setAttribute('fragment-id', fragmentId);
  const basePath = config.routes
    ? config.routes.split(',')[0].trim().replace(/\/:.*$/, '')
    : `/__wf/${fragmentId}`;
  el.setAttribute('src', basePath);

  block.textContent = '';
  block.appendChild(el);
}
