// Every broker the extension can read. Adding a broker means adding an entry here, its adapter
// folder under `src/brokers/<id>/` and its content scripts in `manifest.json`
// (see CONTRIBUTING.md).

export const BROKERS = [
  {
    id: 'myinvestor',
    name: 'MyInvestor',
    /** Pages where the adapter's content script runs and the popup offers to sync. */
    pages: ['https://newapp.myinvestor.es/'],
    /** The `?broker=` of Financial Hub's import page that takes this broker's bundle. */
    importBroker: 'myinvestor',
    /** The `format` of the bundle the adapter builds (docs/bundle-format.md). */
    bundleFormat: 'financial-hub/myinvestor-api',
    /** The window message Financial Hub's import page takes the bundle with. */
    bundleMessage: 'financial-hub:myinvestor-api-bundle',
    /** Days the broker returns without an extra confirmation (MyInvestor: PSD2 signature). */
    recentDays: 90,
    /** Financial Hub can import this bundle today. Otherwise the popup only downloads it. */
    supported: true,
  },
];

/** The broker whose pages include this URL, if any. */
export function brokerForUrl(url) {
  return BROKERS.find((broker) => broker.pages.some((page) => url?.startsWith(page))) ?? null;
}

export function brokerById(id) {
  return BROKERS.find((broker) => broker.id === id) ?? null;
}
