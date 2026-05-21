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
const v = require('../../src/operationalValidation/refreshDeterminismValidator');
const r = v.validateRefreshDeterminism({
  visible_modules: ['dashboard', 'quality_intelligence'],
  sidebar_governance_runtime: {
    final_visible_modules: ['dashboard', 'quality_intelligence'],
    denied_publications: ['safety_intelligence']
  },
  governance_freeze_state: { reinjection_blocked: true, mutation_after_lock_detected: false }
});
assert(r.determinism_validated, 'stable');
assert(!r.oscillation_detected, 'no oscillation');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
