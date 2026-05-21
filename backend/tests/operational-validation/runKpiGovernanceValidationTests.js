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
const v = require('../../src/operationalValidation/kpiGovernanceValidator');
const leak = v.validateKpiGovernance(
  [{ id: 'faturamento_mensal', domain: 'executive' }],
  { hierarchy_tier: 'coordination', domain_axis: 'quality' }
);
assert(leak.kpi_leakage_detected, 'executive leak');
const ok = v.validateKpiGovernance([{ id: 'ncr', domain: 'quality' }], {
  hierarchy_tier: 'coordination',
  domain_axis: 'quality'
});
assert(!ok.kpi_leakage_detected, 'quality kpi ok');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
