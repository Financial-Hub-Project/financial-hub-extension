// Runs in MyInvestor's own page (main world) before its scripts. It only notes the two
// non-secret headers the web app sends with every API call (its device id and app version),
// which the in-app signature of a long history needs. It never reads or keeps the token.
(() => {
  const original = window.fetch;
  window.fetch = function (input, init) {
    try {
      const headers = new Headers((init && init.headers) || (input && input.headers) || {});
      const device = headers.get('x-device-id');
      const app = headers.get('x-myinvestor-app');
      if (device) document.documentElement.dataset.fhDevice = device;
      if (app) document.documentElement.dataset.fhApp = app;
    } catch {
      // A request the hook cannot read is passed through untouched.
    }
    return original.apply(this, arguments);
  };
})();
