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
const v = require('../../src/operationalValidation/underdeliveryRiskValidator');
const low = v.validateUnderdeliveryRisk(
  {
    visible_modules: ['dashboard', 'settings', 'quality_intelligence', 'operational'],
    kpis: [{ id: 'ncr' }],
    summary: 'Operação estável com inspeções e NCR monitorizados.'
  },
  { hierarchy_tier: 'coordination' }
);
assert(low.underdelivery_risk === 'low', 'low risk');
const high = v.validateUnderdeliveryRisk({ visible_modules: [] }, {});
assert(high.underdelivery_risk === 'high', 'empty high risk');
assert(high.fabricated_data === false, 'no fabrication');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
