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

async function registerFragment(config) {
  const reg = await ensureServiceWorker();
  if (!reg?.active) return;
  reg.active.postMessage({
    type: 'register-fragment',
    fragmentId: config['fragment-id'],
    endpoint: config.endpoint,
    routePatterns: config.routes
      ? config.routes.split(',').map((r) => r.trim())
      : [`/__wf/${config['fragment-id']}`, `/__wf/${config['fragment-id']}/:_*`],
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

  const el = document.createElement('web-fragment');
  el.setAttribute('fragment-id', fragmentId);
  el.setAttribute('src', config.endpoint);

  block.textContent = '';
  block.appendChild(el);
}
