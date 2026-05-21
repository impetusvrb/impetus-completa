'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

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
function resetCache() {
  process.env.IMPETUS_OPERATIONAL_VALIDATION_OBSERVABILITY = 'on';
  process.env.IMPETUS_PILOT_REACTIVATION = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/operationalValidation/') || k.includes('/pilotTenants/') || k.includes('/contextualActivation/')) {
      delete require.cache[k];
    }
  }
}

const GOOD_PAYLOAD = {
  visible_modules: ['dashboard', 'quality_intelligence'],
  sidebar_governance_runtime: {
    governance_applied: true,
    final_governance_locked: true,
    final_visible_modules: ['dashboard', 'quality_intelligence'],
    denied_publications: ['safety_intelligence']
  },
  governance_freeze_state: {
    governance_locked: true,
    reinjection_blocked: true,
    legacy_pipeline_disabled: true,
    terminal_resolution_applied: true,
    mutation_after_lock_detected: false
  },
  kpis: [{ id: 'ncr_abertas', domain: 'quality' }],
  summary: 'Inspeções e NCR em dia na qualidade.'
};

function testFacadeReport() {
  console.log('\n=== Facade report ===');
  resetCache();
  const facade = loadFresh('../../src/operationalValidation/operationalConvergenceFacade');
  const r = facade.buildOperationalConvergenceReport(GOOD_PAYLOAD, { profile: 'quality' });
  assert(r.freeze_state_valid === true, 'freeze valid');
  assert(r.kpi_leakage_detected === false, 'no kpi leak');
  assert(r.oscillation_detected === false, 'no oscillation');
}

function testPersistenceRoundTrip() {
  console.log('\n=== Persistence ===');
  resetCache();
  const persist = loadFresh('../../src/operationalValidation/tenantActivationPersistence');
  const saved = persist.saveTenantActivation({
    tenant_id: 'tenant-z17-test',
    pilot_active: true,
    activated_by: 'test-suite'
  });
  assert(saved.saved === true, 'saved');
  const got = persist.getPersistedTenant('tenant-z17-test');
  assert(got && got.reload_recovery_ready === true, 'read back');
  persist.removeTenantActivation('tenant-z17-test');
}

function testPilotRestore() {
  console.log('\n=== Pilot restore ===');
  resetCache();
  const { clearPilotRegistry } = require('../../src/pilotTenants/pilotTenantRegistry');
  const { clearTenantEnforcementState } = require('../../src/contextualActivation/tenantEnforcementState');
  clearPilotRegistry();
  clearTenantEnforcementState();
  const reactivation = loadFresh('../../src/operationalValidation/pilotReactivationCoordinator');
  const r = reactivation.restoreTenantFromRecord({
    tenant_id: 'restore-tenant-1',
    pilot_active: true,
    menu_active: true,
    kpi_active: true,
    activated_by: 'z17-test'
  });
  assert(r.restored === true, 'restored');
  const { isPilotTenant } = require('../../src/pilotTenants/pilotTenantRegistry');
  assert(isPilotTenant('restore-tenant-1'), 'in memory pilot');
}

function testFreezeBroken() {
  console.log('\n=== Freeze broken event ===');
  resetCache();
  const v = loadFresh('../../src/operationalValidation/runtimeFreezeStateValidator');
  const r = v.validateRuntimeFreezeState({ governance_freeze_state: { governance_locked: false } });
  assert(r.freeze_state_valid === false, 'invalid freeze');
  assert(r.event === 'TERMINAL_GOVERNANCE_BROKEN', 'event emitted');
}

function main() {
  console.log('Operational Validation Tests (Z.17)');
  testFacadeReport();
  testPersistenceRoundTrip();
  testPilotRestore();
  testFreezeBroken();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
main();
