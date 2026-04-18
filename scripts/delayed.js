// add delayed functionality here

// Web Fragments event bridge — only activate when a fragment block is on the page
if (document.querySelector('.web-fragment')) {
  import('./fragment-events.js').then(({ initFragmentEvents }) => initFragmentEvents());
}

// Example: log reservation confirmations from the booking fragment
window.addEventListener('fragment:reservation_confirmed', (e) => {
  const { booking } = e.detail;
  // eslint-disable-next-line no-console
  console.log('[Restaurant] Reservation confirmed:', booking);
});
