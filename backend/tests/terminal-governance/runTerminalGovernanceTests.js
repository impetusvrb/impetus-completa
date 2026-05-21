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
function resetEnv() {
  process.env.IMPETUS_TERMINAL_GOVERNANCE = 'off';
  process.env.IMPETUS_TERMINAL_SIDEBAR_LOCK = 'off';
  process.env.IMPETUS_TERMINAL_KPI_LOCK = 'off';
  process.env.IMPETUS_TERMINAL_SUMMARY_LOCK = 'off';
  process.env.IMPETUS_TERMINAL_REINJECTION_BLOCK = 'off';
  process.env.IMPETUS_TERMINAL_GOVERNANCE_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/terminalGovernance/')) delete require.cache[k];
  }
}

function testTerminalLockWhenGovernanceApplied() {
  console.log('\n=== Lock com governance_applied + observability ===');
  resetEnv();
  const { isTerminalGovernanceLocked } = loadFresh('../../src/terminalGovernance/terminalGovernanceLock');
  const locked = isTerminalGovernanceLocked({
    sidebar_governance_runtime: { governance_applied: true, final_governance_locked: false },
    real_enforcement_active: true
  });
  assert(locked === true, 'lock activo com observability');
}

function testTerminalStageAppliesFreeze() {
  console.log('\n=== Terminal stage freeze ===');
  resetEnv();
  const { runGovernanceTerminalStage } = loadFresh('../../src/terminalGovernance/governanceTerminalStage');
  const r = runGovernanceTerminalStage(
    {
      visible_modules: ['dashboard', 'quality_intelligence', 'safety_intelligence'],
      sidebar_governance_runtime: {
        governance_applied: true,
        final_visible_modules: ['dashboard', 'quality_intelligence'],
        denied_publications: ['safety_intelligence']
      }
    },
    { real_enforcement_active: true }
  );
  assert(r.applied === true, 'applied');
  assert(r.payload.sidebar_governance_runtime.final_governance_locked === true, 'final_governance_locked');
  assert(!r.payload.visible_modules.includes('safety_intelligence'), 'sem SST');
  assert(r.governance_freeze_state.reinjection_blocked === true, 'reinjection blocked');
}

function testFinalDeliveryPipeline() {
  console.log('\n=== Final delivery pipeline ===');
  resetEnv();
  const { resolveFinalDelivery } = loadFresh('../../src/terminalGovernance/finalDeliveryResolution');
  const r = resolveFinalDelivery(['dashboard', 'quality_intelligence', 'environment_intelligence'], {
    sidebar_governance_runtime: {
      final_visible_modules: ['dashboard', 'quality_intelligence'],
      denied_publications: ['environment_intelligence', 'safety_intelligence']
    },
    contextual_modules: [{ module_id: 'safety_intelligence' }, { module_id: 'quality_intelligence' }]
  });
  assert(r.pipeline.includes('TERMINAL_LOCK'), 'pipeline terminal');
  assert(r.contextual_modules_mode === 'STRICT', 'STRICT mode');
  assert(!r.final_visible_modules.includes('environment_intelligence'), 'denied module out');
}

function testDeniedNeverReinject() {
  console.log('\n=== Denied publication block ===');
  resetEnv();
  const { isDeniedPublicationLocked, filterDeniedFromList } = loadFresh(
    '../../src/terminalGovernance/deniedPublicationTerminalLock'
  );
  const check = isDeniedPublicationLocked('safety_intelligence', { denied_publications: ['safety_intelligence'] });
  assert(check.locked === true, 'safety denied');
  assert(check.blocked_actions.includes('merge'), 'merge blocked');
  const f = filterDeniedFromList(['a', 'safety_intelligence', 'b'], { denied_publications: ['safety_intelligence'] });
  assert(f.kept.length === 2 && f.blocked.length === 1, 'filter list');
}

function testFacadeDashboard() {
  console.log('\n=== Facade dashboard terminal ===');
  resetEnv();
  const facade = loadFresh('../../src/terminalGovernance/terminalGovernanceFacade');
  const r = facade.applyTerminalGovernanceToDashboard(
    { company_id: 't-pilot' },
    {
      visible_modules: ['dashboard', 'quality_intelligence'],
      sidebar_governance_runtime: {
        governance_applied: true,
        final_visible_modules: ['dashboard', 'quality_intelligence'],
        denied_publications: ['safety_intelligence']
      },
      real_tenant_enforcement: { real_enforcement_active: true }
    },
    { real_enforcement_active: true }
  );
  assert(r.terminal_governance?.applied === true || r.governance_freeze_state?.governance_locked === true, 'facade applied');
}

function testPostLockMutationDetect() {
  console.log('\n=== Post-lock mutation ===');
  resetEnv();
  const { detectPostLockMutation } = loadFresh('../../src/terminalGovernance/terminalGovernanceLock');
  const m = detectPostLockMutation(['a', 'b'], ['a', 'b', 'safety_intelligence'], true);
  assert(m.mutation_after_lock_detected === true, 'mutation detected');
  assert(m.added_after_lock.includes('safety_intelligence'), 'added tracked');
}

function testModuleAuthority() {
  console.log('\n=== Final module authority ===');
  resetEnv();
  const { resolveFinalModuleAuthority } = loadFresh('../../src/terminalGovernance/finalModuleAuthority');
  const r = resolveFinalModuleAuthority(['dashboard', 'safety_intelligence', 'quality_intelligence'], {
    denied_publications: ['safety_intelligence'],
    domain_axis: 'quality'
  });
  assert(!r.final_modules.includes('safety_intelligence'), 'authority strips denied');
}

function testCockpitConsistency() {
  console.log('\n=== Cockpit consistency ===');
  resetEnv();
  const { assessCockpitGovernanceConsistency } = loadFresh('../../src/terminalGovernance/cockpitGovernanceConsistency');
  const r = assessCockpitGovernanceConsistency(
    {
      kpis: [{ label: 'Faturamento mensal', id: 'fat' }],
      insights: [{ title: 'Alerta SST na linha 2' }]
    },
    { domain_axis: 'quality', hierarchy_tier: 'coordination' }
  );
  assert(r.cockpit_consistent === false && r.cross_domain_bleed.length >= 1, 'cockpit bleed signal');
}

function testFlagsOffNoStage() {
  console.log('\n=== Flags off sem governance ===');
  resetEnv();
  process.env.IMPETUS_TERMINAL_GOVERNANCE_OBSERVABILITY = 'off';
  const { runGovernanceTerminalStage } = loadFresh('../../src/terminalGovernance/governanceTerminalStage');
  const r = runGovernanceTerminalStage({ visible_modules: ['a'] }, {});
  assert(r.applied === false, 'not applied without lock ctx');
}

function testSourceOfTruthPayload() {
  console.log('\n=== Source of truth payload ===');
  resetEnv();
  const { runGovernanceTerminalStage } = loadFresh('../../src/terminalGovernance/governanceTerminalStage');
  const r = runGovernanceTerminalStage(
    {
      visible_modules: ['dashboard'],
      sidebar_governance_runtime: { governance_applied: true, final_visible_modules: ['dashboard'] }
    },
    { real_enforcement_active: true }
  );
  const sgr = r.payload?.sidebar_governance_runtime || {};
  assert(sgr.source_of_truth === 'final_visible_modules', 'source_of_truth');
  assert(sgr.post_governance_mutation_allowed === false, 'no post mutation');
}

function main() {
  console.log('Terminal Governance Tests (Z.16)');
  testTerminalLockWhenGovernanceApplied();
  testTerminalStageAppliesFreeze();
  testFinalDeliveryPipeline();
  testDeniedNeverReinject();
  testFacadeDashboard();
  testPostLockMutationDetect();
  testModuleAuthority();
  testCockpitConsistency();
  testFlagsOffNoStage();
  testSourceOfTruthPayload();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
main();
