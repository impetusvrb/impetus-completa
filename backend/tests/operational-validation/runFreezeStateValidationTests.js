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
delete require.cache[require.resolve('../../src/operationalValidation/runtimeFreezeStateValidator')];
const v = require('../../src/operationalValidation/runtimeFreezeStateValidator');
const ok = v.validateRuntimeFreezeState({
  sidebar_governance_runtime: { final_governance_locked: true },
  governance_freeze_state: {
    governance_locked: true,
    legacy_pipeline_disabled: true,
    reinjection_blocked: true,
    mutation_after_lock_detected: false
  }
});
assert(ok.freeze_state_valid, 'freeze ok');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
