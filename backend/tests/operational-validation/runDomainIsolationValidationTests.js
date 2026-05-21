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
const v = require('../../src/operationalValidation/domainIsolationValidator');
const q = v.validateDomainIsolation(
  {
    visible_modules: ['dashboard', 'quality_intelligence'],
    sidebar_governance_runtime: { denied_publications: ['safety_intelligence'] },
    summary: 'NCR e inspeção'
  },
  { profile: 'quality' }
);
assert(q.domain_isolation_valid, 'quality ok');
const bad = v.validateDomainIsolation(
  { visible_modules: ['dashboard', 'quality_intelligence', 'safety_intelligence'], summary: 'APR SST' },
  { profile: 'quality' }
);
assert(!bad.domain_isolation_valid, 'quality leak detected');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
