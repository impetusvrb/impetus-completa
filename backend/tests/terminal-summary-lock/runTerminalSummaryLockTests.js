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
  process.env.IMPETUS_TERMINAL_SUMMARY_LOCK = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/terminalGovernance/')) delete require.cache[k];
  }
}

function testIsolationBeforeCompose() {
  console.log('\n=== Isolation antes compose ===');
  resetEnv();
  const { applySummaryDomainIsolationBeforeCompose } = loadFresh(
    '../../src/terminalGovernance/finalSummaryAuthority'
  );
  const r = applySummaryDomainIsolationBeforeCompose(
    { summary: 'Resumo com APR e LOTO em SST para a fábrica', facts: ['APR pendente', 'NCR qualidade'] },
    { domain_axis: 'quality', hierarchy_tier: 'coordination' }
  );
  assert(r.narrative_pool.pre_composition_filtered === true, 'pre compose filter');
  assert(r.leakage_detected === true, 'SST hints in quality text');
}

function testQualityPoolTopics() {
  console.log('\n=== Pool qualidade ===');
  resetEnv();
  const { buildNarrativePool } = loadFresh('../../src/terminalGovernance/finalSummaryAuthority');
  const pool = buildNarrativePool({}, { domain_axis: 'quality' });
  assert(pool.allowed_topics.includes('qualidade'), 'quality topics');
  assert(pool.blocked_topics.some((t) => t.includes('sst') || t.includes('apr')), 'blocks sst');
}

function testFacadeSummaryLock() {
  console.log('\n=== Facade summary lock ===');
  resetEnv();
  const facade = loadFresh('../../src/terminalGovernance/terminalGovernanceFacade');
  const r = facade.applyTerminalSummaryLock(
    {},
    { summary: 'Operação normal', facts: ['inspecao ok'] },
    { governance_freeze_state: { governance_locked: true }, domain_axis: 'quality' }
  );
  assert(r.payload.terminal_summary_locked === true, 'terminal locked flag');
}

function main() {
  console.log('Terminal Summary Lock Tests (Z.16)');
  testIsolationBeforeCompose();
  testQualityPoolTopics();
  testFacadeSummaryLock();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
main();
