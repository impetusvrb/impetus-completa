'use strict';

const LOGISTICS_NAVIGATION_MANIFEST = Object.freeze([
  { id: 'logistics_operational', path: '/app/logistics/operational' },
  { id: 'logistics_receiving', path: '/app/logistics/operational?view=receiving' },
  { id: 'logistics_storage', path: '/app/logistics/operational?view=storage' },
  { id: 'logistics_picking', path: '/app/logistics/operational?view=picking' },
  { id: 'logistics_shipping', path: '/app/logistics/operational?view=shipping' },
  { id: 'logistics_maturity', path: '/app/logistics/operational?view=maturity' }
]);

module.exports = { LOGISTICS_NAVIGATION_MANIFEST };
