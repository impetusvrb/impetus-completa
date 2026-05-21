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
  process.env.IMPETUS_TERMINAL_REINJECTION_BLOCK = 'on';
  process.env.IMPETUS_TERMINAL_GOVERNANCE_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/terminalGovernance/')) delete require.cache[k];
  }
}

function testResolverAssertReinjection() {
  console.log('\n=== Resolver reinjection ===');
  resetEnv();
  const { assertModuleNotReinjected } = loadFresh('../../src/terminalGovernance/terminalGovernanceResolver');
  const r = assertModuleNotReinjected('safety_intelligence', {
    sidebar_governance_runtime: {
      governance_applied: true,
      final_governance_locked: true,
      denied_publications: ['safety_intelligence']
    }
  });
  assert(r.allowed === false, 'reinjection denied');
}

function testBlockedActionsComplete() {
  console.log('\n=== Blocked actions ===');
  resetEnv();
  const { BLOCKED_ACTIONS } = loadFresh('../../src/terminalGovernance/deniedPublicationTerminalLock');
  for (const a of ['merge', 'enrich', 'inject', 'restore', 'fallback', 'contextualize']) {
    assert(BLOCKED_ACTIONS.includes(a), `blocks ${a}`);
  }
}

function testFreezeDisablesLegacy() {
  console.log('\n=== Freeze legacy pipeline ===');
  resetEnv();
  const { runGovernanceTerminalStage } = loadFresh('../../src/terminalGovernance/governanceTerminalStage');
  const r = runGovernanceTerminalStage(
    {
      visible_modules: ['dashboard'],
      sidebar_governance_runtime: { governance_applied: true, final_visible_modules: ['dashboard'] }
    },
    { real_enforcement_active: true }
  );
  assert(r.governance_freeze_state.legacy_pipeline_disabled === true, 'legacy disabled');
}

function main() {
  console.log('Terminal Reinjection Block Tests (Z.16)');
  testResolverAssertReinjection();
  testBlockedActionsComplete();
  testFreezeDisablesLegacy();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
main();
