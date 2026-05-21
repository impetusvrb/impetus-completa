'use strict';

let passed = 0;
let failed = 0;
function assert(c, m) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
  }
}
function loadFresh(p) {
  delete require.cache[require.resolve(p)];
  return require(p);
}

process.env.IMPETUS_PILOT_REACTIVATION = 'on';
const { clearPilotRegistry } = require('../../src/pilotTenants/pilotTenantRegistry');
const { clearTenantEnforcementState } = require('../../src/contextualActivation/tenantEnforcementState');

clearPilotRegistry();
clearTenantEnforcementState();

const reactivation = loadFresh('../../src/operationalValidation/pilotReactivationCoordinator');
const recovery = reactivation.recoverApprovedPilotsOnBoot({ force_recovery: true });
assert(Array.isArray(recovery.tenants), 'recovery shape');

const record = reactivation.recordPilotActivation('pilot-z17', {
  approved_by: 'architect',
  menu_active: true,
  kpi_active: true,
  governance_locked: true
});
assert(record.saved === true, 'persisted activation');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
