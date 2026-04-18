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
});

// ── Simple route matching ────────────────────────────────────────────
// Supports exact match and prefix match for wildcard-style patterns.
// path-to-regexp syntax (e.g. /:_*) is normalised to a plain prefix.

function matchFragment(pathname) {
  for (const [, frag] of fragments) {
    for (const pattern of frag.routePatterns) {
      const prefix = pattern.replace(/\/:.*$/, '');
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return frag;
    }
  }
  return null;
}

// ── Fetch handler ────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const fragment = matchFragment(url.pathname);
  if (!fragment) return;

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

  // Everything else → proxy to the fragment endpoint
  event.respondWith(
    (async () => {
      const target = new URL(url.pathname + url.search, fragment.endpoint);
      const resp = await fetch(target.toString(), {
        method: event.request.method,
        headers: event.request.headers,
      });
      const headers = new Headers(resp.headers);
      headers.set('x-web-fragment-id', fragment.fragmentId);
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
