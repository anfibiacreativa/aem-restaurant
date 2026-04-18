/**
 * Web Fragments Service Worker — same-origin fragment proxy.
 *
 * Replaces the need for a Cloudflare Worker gateway. The page's web-fragment
 * block sends fragment configs (fragmentId, endpoint, routePatterns) via
 * postMessage. The SW then intercepts matching same-origin requests and
 * proxies them to the fragment endpoint.
 *
 * Routing rules per sec-fetch-dest:
 *   document → pass through to origin (EDS shell page)
 *   iframe   → return reframed stub document
 *   *        → proxy to fragment endpoint
 */

const fragments = new Map();

// ── Fragment registration via postMessage ────────────────────────────

self.addEventListener('message', (event) => {
  const { type, ...config } = event.data || {};
  if (type !== 'register-fragment' || !config.fragmentId) return;
  fragments.set(config.fragmentId, config);
  if (event.ports[0]) event.ports[0].postMessage({ type: 'registered' });
});

// ── Simple route matching ────────────────────────────────────────────
// Supports exact match and prefix match for wildcard-style patterns.
// path-to-regexp syntax (e.g. /:_*) is normalised to a plain prefix.

function matchFragment(pathname) {
  for (const [, frag] of fragments) {
    for (const pattern of frag.routePatterns) {
      const prefix = pattern.replace(/\/:.*$/, '');
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        return { fragment: frag, prefix };
      }
    }
  }
  return null;
}

// ── Fetch handler ────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const match = matchFragment(url.pathname);
  if (!match) return;
  const { fragment, prefix } = match;

  const dest =
    event.request.headers.get('sec-fetch-dest') || event.request.destination;

  // Hard navigation → let the origin serve the EDS page (shell with block)
  if (dest === 'document') return;

  // Reframed iframe → return stub document
  if (dest === 'iframe') {
    event.respondWith(
      new Response('<!doctype html><title>Web Fragments: reframed</title>', {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          Vary: 'sec-fetch-dest',
          'X-Web-Fragment-Id': fragment.fragmentId,
        },
      }),
    );
    return;
  }

  // Strip the route prefix so the fragment's origin sees its own paths.
  // Don't forward browser headers (Sec-Fetch-*, Origin, etc.) to avoid CORS preflight.
  const strippedPath = url.pathname.slice(prefix.length) || '/';
  event.respondWith(
    (async () => {
      const target = new URL(strippedPath + url.search, fragment.endpoint);
      const resp = await fetch(target.toString(), {
        method: event.request.method,
      });
      const headers = new Headers(resp.headers);
      headers.set('x-web-fragment-id', fragment.fragmentId);

      // Rewrite absolute asset paths in HTML so they route through the SW.
      // Without this, paths like /_astro/index.css bypass the route prefix.
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('text/html')) {
        let html = await resp.text();
        html = html.replaceAll('"/_astro/', `"${prefix}/_astro/`);
        html = html.replaceAll("'/_astro/", `'${prefix}/_astro/`);
        headers.set('content-length', new TextEncoder().encode(html).length);
        return new Response(html, {
          status: resp.status,
          statusText: resp.statusText,
          headers,
        });
      }

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers,
      });
    })(),
  );
});

// ── Lifecycle ────────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
);
