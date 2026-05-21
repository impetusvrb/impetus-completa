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
function reset() {
  process.env.IMPETUS_CONTEXTUAL_ENFORCEMENT_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/contextualEnforcement/') || k.includes('/tenantProfiling/')) delete require.cache[k];
  }
}

function testRhNoSst() {
  console.log('\n=== RH não recebe SST/emissões ===');
  reset();
  const { isModuleAllowedForContext } = loadFresh('../../src/contextualEnforcement/moduleDeliveryClassification');
  assert(isModuleAllowedForContext('safety_intelligence', { domain_axis: 'hr', hierarchy_level: 3 }).allowed === false, 'SST blocked');
  assert(isModuleAllowedForContext('environment_intelligence', { domain_axis: 'hr', hierarchy_level: 3 }).allowed === false, 'emissions blocked');
}

function testSstNoHr() {
  console.log('\n=== SST não recebe RH estratégico ===');
  reset();
  const { isModuleAllowedForContext } = loadFresh('../../src/contextualEnforcement/moduleDeliveryClassification');
  assert(isModuleAllowedForContext('hr_intelligence', { domain_axis: 'safety', hierarchy_level: 3 }).allowed === false, 'hr blocked');
}

function testExecutiveNoCockpit() {
  console.log('\n=== Executivo sem cockpit operacional ===');
  reset();
  const { isModuleAllowedForContext } = loadFresh('../../src/contextualEnforcement/moduleDeliveryClassification');
  assert(isModuleAllowedForContext('manuia', { domain_axis: 'finance', hierarchy_level: 1 }).allowed === false, 'manuia blocked');
}

function testOperatorNoEsg() {
  console.log('\n=== Operador sem ESG executivo ===');
  reset();
  const { isModuleAllowedForContext } = loadFresh('../../src/contextualEnforcement/moduleDeliveryClassification');
  assert(isModuleAllowedForContext('esg', { domain_axis: 'environmental', hierarchy_level: 5 }).allowed === false, 'esg blocked');
}

function testPruningSimulation() {
  console.log('\n=== Pruning simulation sem remover ===');
  reset();
  const sim = loadFresh('../../src/contextualEnforcement/shadowModulePruningSimulation');
  const matrix = {
    permitted_modules_simulation: ['dashboard'],
    would_block_simulation: [{ module: 'environment_intelligence', reason: 'domain_only' }]
  };
  const r = sim.simulateShadowModulePruning(matrix, { visible_modules: ['dashboard', 'environment_intelligence'], force_simulation: true });
  assert(r.applied === false && r.auto_remove === false, 'not applied');
  assert(r.would_hide.includes('environment_intelligence'), 'would hide sim');
}

function testIncompleteTenantBlocks() {
  console.log('\n=== Tenant incompleto bloqueia readiness ===');
  reset();
  const t = loadFresh('../../src/tenantProfiling/tenantDeliveryReadiness');
  const r = t.assessTenantDeliveryReadiness('t-inc', { domain_axis: 'unknown', hierarchy_level: null, inference_complete: false });
  assert(r.blocks_enforcement === true, 'blocks');
  assert(r.enforcement_ready === false, 'not ready');
}

function testFacade() {
  console.log('\n=== Facade Z.1 ===');
  reset();
  const f = loadFresh('../../src/contextualEnforcement/contextualEnforcementFacade');
  const r = f.prepareContextualEnforcement(
    { company_id: 't1', role: 'gerente', department: 'RH' },
    {
      profile_code: 'hr_management',
      functional_axis: 'hr',
      visible_modules: ['dashboard', 'hr_intelligence', 'environment_intelligence']
    }
  );
  assert(r.enforcement_applied === false, 'no enforcement');
  assert(r.targeting.violations >= 1, 'violations detected');
}

function main() {
  console.log('Contextual Enforcement Preparation — Phase Z.1');
  testRhNoSst();
  testSstNoHr();
  testExecutiveNoCockpit();
  testOperatorNoEsg();
  testPruningSimulation();
  testIncompleteTenantBlocks();
  testFacade();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
