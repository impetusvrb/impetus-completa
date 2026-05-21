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
  process.env.IMPETUS_TERMINAL_KPI_LOCK = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/terminalGovernance/')) delete require.cache[k];
  }
}

function testExecutiveKpiBlockedOnCoordination() {
  console.log('\n=== Executive KPI em coordenação ===');
  resetEnv();
  const { resolveFinalKpiAuthority } = loadFresh('../../src/terminalGovernance/finalKpiAuthority');
  const kpis = [
    { id: 'faturamento_mensal', label: 'Faturamento', domain: 'executive' },
    { id: 'ncr_abertas', label: 'NCR', domain: 'quality' }
  ];
  const r = resolveFinalKpiAuthority(kpis, {
    hierarchy_tier: 'coordination',
    hierarchy_level: 3,
    domain_axis: 'quality',
    original_kpis: kpis
  });
  assert(!r.final_kpis.some((k) => String(k.id || k.kpi_id).includes('faturamento')), 'sem KPI executivo');
  assert(r.leakage_detected === true, 'leakage flagged');
}

function testSameDomainKpiKept() {
  console.log('\n=== KPI mesmo domínio ===');
  resetEnv();
  const { resolveFinalKpiAuthority } = loadFresh('../../src/terminalGovernance/finalKpiAuthority');
  const kpis = [{ id: 'ncr_abertas', domain: 'quality' }];
  const r = resolveFinalKpiAuthority(kpis, {
    hierarchy_tier: 'coordination',
    domain_axis: 'quality',
    original_kpis: kpis
  });
  assert(r.final_kpis.length >= 1, 'quality kpi kept');
}

function testFacadeKpiLock() {
  console.log('\n=== Facade KPI lock ===');
  resetEnv();
  const facade = loadFresh('../../src/terminalGovernance/terminalGovernanceFacade');
  const r = facade.applyTerminalKpiLock(
    {},
    [{ id: 'lucro_liquido', domain: 'executive' }, { id: 'inspecoes', domain: 'quality' }],
    { original_kpis: [{ id: 'inspecoes', domain: 'quality' }], governance_freeze_state: { governance_locked: true } }
  );
  assert(r.terminal_kpi_lock !== null, 'lock meta');
  assert(!r.kpis.some((k) => /lucro/i.test(String(k.id || ''))), 'lucro removed');
}

function main() {
  console.log('Terminal KPI Lock Tests (Z.16)');
  testExecutiveKpiBlockedOnCoordination();
  testSameDomainKpiKept();
  testFacadeKpiLock();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
main();
