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
  process.env.IMPETUS_SIDEBAR_OBSERVABILITY = 'on';
  process.env.IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION = 'on';
  process.env.IMPETUS_PILOT_TENANT_ENFORCEMENT = 'on';
  for (const k of Object.keys(require.cache)) {
    if (
      k.includes('/canonicalModuleGovernance/') ||
      k.includes('/sidebarObservability/') ||
      k.includes('/realTenantEnforcement/') ||
      k.includes('/pilotTenants/') ||
      k.includes('/contextualActivation/')
    ) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/contextualActivation/tenantEnforcementState').clearTenantEnforcementState();
}

function activatePilot(tenantId) {
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').registerPilotTenant(tenantId, { approved_by: 'ops' });
  loadFresh('../../src/contextualActivation/tenantEnforcementState').setTenantEnforcementActive(tenantId, true, {
    approved_by: 'ops',
    channels: { menu: true }
  });
}

function testRhNoSst() {
  console.log('\n=== RH sem SST ===');
  reset();
  activatePilot('z14-hr');
  const r = loadFresh('../../src/canonicalModuleGovernance/sidebarGovernanceResolver').resolveSidebarGovernance(
    {
      visible_modules: ['dashboard', 'settings', 'hr_intelligence', 'safety_intelligence'],
      contextual_modules: [],
      legacy_modules: [],
      profile: { code: 'hr_management' },
      hierarchy: { tier: 'management', level: 2 },
      domain: { axis: 'hr' },
      tenant: { id: 'z14-hr' }
    },
    { tenant_id: 'z14-hr', real_enforcement_active: true }
  );
  assert(r.governance_applied, 'applied');
  assert(!r.final_visible_modules.includes('safety_intelligence'), 'no sst');
  assert(r.final_visible_modules.includes('dashboard'), 'dashboard');
}

function testQualityNoSst() {
  console.log('\n=== Qualidade sem SST ===');
  reset();
  activatePilot('z14-q');
  const r = loadFresh('../../src/canonicalModuleGovernance/sidebarGovernanceResolver').resolveSidebarGovernance(
    {
      visible_modules: [
        'dashboard',
        'settings',
        'quality_intelligence',
        'safety_intelligence',
        'environment_intelligence'
      ],
      contextual_modules: [{ module_id: 'safety_intelligence' }],
      legacy_modules: [],
      profile: { code: 'coordinator_quality' },
      hierarchy: { tier: 'coordination', level: 3 },
      domain: { axis: 'quality' },
      tenant: { id: 'z14-q' }
    },
    { tenant_id: 'z14-q', real_enforcement_active: true }
  );
  assert(!r.final_visible_modules.includes('safety_intelligence'), 'no sst');
  assert(!r.final_visible_modules.includes('environment_intelligence'), 'no env');
  assert(r.final_visible_modules.includes('quality_intelligence'), 'quality ok');
  assert(r.leakage_detected === false || r.removed_modules.length > 0, 'leak handled');
}

function testSstNoRh() {
  console.log('\n=== SST sem RH ===');
  reset();
  const prune = loadFresh('../../src/canonicalModuleGovernance/safeSidebarPruningRuntime');
  const r = prune.applySafeSidebarPruning(['dashboard', 'safety_intelligence', 'hr_intelligence'], {
    domain_axis: 'safety',
    hierarchy_tier: 'operational',
    hierarchy_level: 5
  });
  assert(!r.visible_modules.includes('hr_intelligence'), 'no hr');
  assert(r.visible_modules.includes('safety_intelligence'), 'sst ok');
}

function testEnvironmentalNoQuality() {
  console.log('\n=== Ambiental sem Qualidade ===');
  reset();
  const domain = loadFresh('../../src/canonicalModuleGovernance/domainModuleMatrix');
  const a = domain.isModuleAllowedByDomain('quality_intelligence', 'environmental');
  assert(!a.allowed, 'quality denied');
}

function testExecutiveNoOperationalCockpit() {
  console.log('\n=== Executivo sem cockpit bruto ===');
  reset();
  const prune = loadFresh('../../src/canonicalModuleGovernance/safeSidebarPruningRuntime');
  const r = prune.applySafeSidebarPruning(
    ['dashboard', 'safety_intelligence', 'manuia', 'anomaly_detection'],
    { domain_axis: 'executive', hierarchy_tier: 'executive', hierarchy_level: 1 }
  );
  assert(!r.visible_modules.includes('safety_intelligence'), 'no sst');
  assert(!r.visible_modules.includes('manuia'), 'no manuia');
}

function testOperatorNoEsg() {
  console.log('\n=== Operador sem ESG ===');
  reset();
  const h = loadFresh('../../src/canonicalModuleGovernance/hierarchyModuleMatrix');
  const d = h.isModuleDeniedByHierarchy('esg', { hierarchy_tier: 'operational', hierarchy_level: 5 });
  assert(d.denied, 'esg denied');
}

function testDashboardNeverRemoved() {
  console.log('\n=== Dashboard preservado ===');
  reset();
  const prune = loadFresh('../../src/canonicalModuleGovernance/safeSidebarPruningRuntime');
  const r = prune.applySafeSidebarPruning([], { domain_axis: 'quality', hierarchy_tier: 'coordination' });
  assert(r.visible_modules.includes('dashboard'), 'dashboard');
  assert(r.visible_modules.includes('settings'), 'settings');
}

function testLegacyReinjectionBlocked() {
  console.log('\n=== Legacy reinjection bloqueado ===');
  reset();
  const p = loadFresh('../../src/canonicalModuleGovernance/preventLegacyModuleReinjection');
  const r = p.preventLegacyModuleReinjection(['safety_intelligence', 'quality_intelligence'], {
    domain_axis: 'quality',
    source: 'legacy_modules'
  });
  assert(r.blocked.length >= 1, 'blocked');
  assert(r.reinjection_prevented, 'prevented');
}

function testContextualMergeBlocked() {
  console.log('\n=== Contextual merge bloqueado ===');
  reset();
  const p = loadFresh('../../src/canonicalModuleGovernance/preventLegacyModuleReinjection');
  const r = p.filterContextualModules(
    [{ module_id: 'safety_intelligence' }, { module_id: 'quality_intelligence' }],
    { domain_axis: 'quality' }
  );
  assert(r.items.length === 1, 'one kept');
}

function testUnderdeliveryMinimum() {
  console.log('\n=== Underdelivery mínimo ===');
  reset();
  const min = loadFresh('../../src/canonicalModuleGovernance/safeSidebarPruningRuntime');
  const r = min.applySafeSidebarPruning([], { domain_axis: 'quality', hierarchy_tier: 'coordination' });
  assert(r.visible_modules.length >= 2, 'minimum');
}

function testPilotTenantPreserved() {
  console.log('\n=== Piloto com governança ===');
  reset();
  activatePilot('z14-pilot');
  const f = loadFresh('../../src/canonicalModuleGovernance/moduleGovernanceFacade');
  const out = f.applySidebarGovernanceToDashboard(
    { company_id: 'z14-pilot', job_title: 'Coordenador de Qualidade', department: 'Qualidade' },
    { visible_modules: ['dashboard', 'safety_intelligence', 'quality_intelligence'], profile_code: 'coordinator_quality' },
    { real_enforcement_active: true }
  );
  assert(out.sidebar_governance_runtime.governance_applied, 'governance');
}

function testRollbackSafeWhenInactive() {
  console.log('\n=== Rollback safe (sem piloto) ===');
  reset();
  const r = loadFresh('../../src/canonicalModuleGovernance/sidebarGovernanceResolver').resolveSidebarGovernance(
    {
      visible_modules: ['dashboard', 'safety_intelligence'],
      contextual_modules: [],
      legacy_modules: [],
      domain: { axis: 'quality' },
      hierarchy: { tier: 'coordination' },
      tenant: { id: 'no-pilot' }
    },
    { tenant_id: 'no-pilot' }
  );
  assert(r.recommendation_only === true, 'recommendation only');
  assert(r.shadow_only === true, 'shadow');
}

function testLeakageResolver() {
  console.log('\n=== Leakage resolver ===');
  reset();
  const l = loadFresh('../../src/canonicalModuleGovernance/moduleLeakageResolver');
  const r = l.resolveModuleLeakage(['safety_intelligence'], { domain_axis: 'quality', hierarchy_tier: 'coordination' });
  assert(r.leakage_detected, 'leak');
}

function testObservabilityNoAutoRemediate() {
  console.log('\n=== Observability sem auto-remediação ===');
  reset();
  const o = loadFresh('../../src/sidebarObservability/sidebarObservabilityFacade');
  const r = o.buildSidebarObservabilityReport(
    { company_id: 't-obs' },
    { governance_resolution: { leakage_detected: true, governance_applied: false } }
  );
  assert(r.auto_remediate === false, 'no auto');
}

function testFacadePayloadMeta() {
  console.log('\n=== Meta sidebar_governance_runtime ===');
  reset();
  activatePilot('z14-meta');
  const f = loadFresh('../../src/canonicalModuleGovernance/moduleGovernanceFacade');
  const out = f.applySidebarGovernanceToDashboard(
    { company_id: 'z14-meta' },
    {
      visible_modules: ['dashboard', 'safety_intelligence', 'quality_intelligence'],
      profile_code: 'coordinator_quality'
    },
    { real_enforcement_active: true }
  );
  const meta = out.sidebar_governance_runtime;
  assert(typeof meta.governance_score === 'number', 'score');
  assert(Array.isArray(meta.final_visible_modules), 'final list');
  assert(meta.domain === 'quality' || meta.governance_applied, 'domain or applied');
}

function testCanonicalMatrixRh() {
  console.log('\n=== Matriz RH deny SST ===');
  reset();
  const m = loadFresh('../../src/canonicalModuleGovernance/canonicalModuleMatrix');
  const deny = m.getCanonicalDenySet('hr');
  assert(deny.has('safety_intelligence'), 'deny sst');
}

function testHelpNeverRemoved() {
  console.log('\n=== Help/settings nunca removidos ===');
  reset();
  const NEVER = loadFresh('../../src/canonicalModuleGovernance/safeSidebarPruningRuntime').NEVER_REMOVE;
  assert(NEVER.includes('settings'), 'settings');
}

function testMinimumExecutiveSidebar() {
  console.log('\n=== Minimum executive sidebar ===');
  reset();
  const min = loadFresh('../../src/canonicalModuleGovernance/safeSidebarPruningRuntime');
  const r = min.minimumExecutiveSidebar();
  assert(r.includes('dashboard'), 'exec dashboard');
}

function testContextualHardeningFlagOffObservabilityOn() {
  console.log('\n=== Flags OFF observability ON ===');
  reset();
  process.env.IMPETUS_CANONICAL_MODULE_GOVERNANCE = 'off';
  process.env.IMPETUS_SIDEBAR_GOVERNANCE_RUNTIME = 'off';
  const status = loadFresh('../../src/canonicalModuleGovernance/moduleGovernanceFacade').getModuleGovernanceStatus();
  assert(status.observability === true, 'obs on');
  assert(status.recommendation_first === true, 'rec first');
}

function main() {
  console.log('Sidebar Governance — Phase Z.14');
  testRhNoSst();
  testQualityNoSst();
  testSstNoRh();
  testEnvironmentalNoQuality();
  testExecutiveNoOperationalCockpit();
  testOperatorNoEsg();
  testDashboardNeverRemoved();
  testLegacyReinjectionBlocked();
  testContextualMergeBlocked();
  testUnderdeliveryMinimum();
  testPilotTenantPreserved();
  testRollbackSafeWhenInactive();
  testLeakageResolver();
  testObservabilityNoAutoRemediate();
  testFacadePayloadMeta();
  testCanonicalMatrixRh();
  testHelpNeverRemoved();
  testMinimumExecutiveSidebar();
  testContextualHardeningFlagOffObservabilityOn();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main();
