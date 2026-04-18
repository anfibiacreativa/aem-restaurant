/**
 * Listens for events from embedded web-fragment apps via BroadcastChannel.
 * Loaded lazily by the web-fragment block or delayed.js.
 *
 * Each fragment can post messages on a named channel; this module
 * subscribes to known channels and dispatches CustomEvents on `window`
 * so any EDS block or script can react.
 */

const CHANNELS = ['/reservations'];

const listeners = [];

export function initFragmentEvents() {
  if (listeners.length) return;

  CHANNELS.forEach((name) => {
    const bc = new BroadcastChannel(name);
    bc.addEventListener('message', (event) => {
      const { type, ...detail } = event.data || {};
      if (!type) return;
      window.dispatchEvent(
        new CustomEvent(`fragment:${type}`, { detail: { channel: name, ...detail } }),
      );
    });
    listeners.push(bc);
  });
}

export function destroyFragmentEvents() {
  listeners.forEach((bc) => bc.close());
  listeners.length = 0;
}
