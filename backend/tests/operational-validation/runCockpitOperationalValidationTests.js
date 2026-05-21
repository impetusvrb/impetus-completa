'use strict';

let passed = 0;
let failed = 0;
function assert(c, m) {
  if (c) {
    passed++;
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
  }
}
const v = require('../../src/operationalValidation/cockpitOperationalValidator');
const r = v.validateCockpitOperational(
  {
    visible_modules: ['dashboard', 'quality_intelligence'],
    kpis: [{ label: 'NCR abertas' }]
  },
  { domain_axis: 'quality', hierarchy_tier: 'coordination' }
);
assert(r.cockpit_integrity >= 0.5, 'integrity score');
assert(typeof r.operational_usefulness === 'number', 'usefulness');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
