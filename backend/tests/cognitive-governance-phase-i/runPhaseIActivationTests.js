'use strict';

/**
 * Fase I — Controlled Governance Activation
 * npm run test:cognitive-governance-phase-i
 */

const path = require('path');
const fs = require('fs');

const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');
let passed = 0;
let failed = 0;

function assert(c, m, d) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
    if (d) console.log('       ', JSON.stringify(d).slice(0, 400));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

function enablePhaseI() {
  process.env.IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION = 'on';
  process.env.IMPETUS_GOVERNANCE_QUALITY_GATES = 'on';
  process.env.IMPETUS_GOVERNANCE_READINESS = 'on';
  process.env.IMPETUS_RUNTIME_GOVERNANCE_MONITORING = 'on';
  process.env.IMPETUS_TENANT_SAFE_GOVERNANCE = 'on';
  delete require.cache[require.resolve('../../src/policyEngine/config/phaseFFeatureFlags')];
  delete require.cache[require.resolve('../../src/governanceActivation/config/phaseIFeatureFlags')];
}

function testKpiActivationSafety() {
  console.log('\n=== KPI activation safety ===');
  enablePhaseI();
  process.env.IMPETUS_TENANT_SAFE_GOVERNANCE = 'off';
  loadFresh('../../src/governanceQuality/governanceQualityGate');
  loadFresh('../../src/governanceQuality/governancePromotionGate');
  const rt = loadFresh('../../src/governanceActivation/governanceActivationRuntime');
  rt.resetRuntimeForTests();
  loadFresh('../../src/governanceActivation/tenantActivationIsolation').clearAllForTests();

  const before = rt.isChannelEffectivelyActive('kpi', {});
  assert(before === false, 'kpi inactive before promotion');

  const promo = rt.promoteChannel('kpi', {
    readiness_opts: {
      metrics: {
        shadow_alignment_rate: 0.96,
        governance_confidence_score: 0.9,
        governance_false_positive_rate: 0.02,
        governance_overblocking_rate: 0.04,
        governance_context_preservation_rate: 0.92,
        drift_stability: 'stable'
      }
    }
  });

  assert(promo.promoted === true, 'kpi promoted', promo);
  assert(rt.isChannelEffectivelyActive('kpi', {}) === true, 'runtime reports kpi active');

  delete require.cache[require.resolve('../../src/policyEngine/config/phaseFFeatureFlags')];
  const phaseF = loadFresh('../../src/policyEngine/config/phaseFFeatureFlags');
  assert(phaseF.isKpiGovernanceEnabled({}) === true, 'phaseF resolves kpi active');
}

function testActivationQualityGate() {
  console.log('\n=== Activation quality gate ===');
  enablePhaseI();
  const validator = loadFresh('../../src/governanceActivation/governanceActivationValidator');
  const bad = validator.validateActivationRequest('chat', {
    readiness_opts: {
      metrics: {
        shadow_alignment_rate: 0.7,
        governance_confidence_score: 0.5,
        leakage_risk: 'high',
        drift_stability: 'unstable'
      }
    }
  });
  assert(bad.valid === false, 'bad readiness blocks activation');
}

function testTenantIsolation() {
  console.log('\n=== Tenant isolation ===');
  enablePhaseI();
  process.env.IMPETUS_TENANT_SAFE_GOVERNANCE = 'on';
  const rt = loadFresh('../../src/governanceActivation/governanceActivationRuntime');
  const iso = loadFresh('../../src/governanceActivation/tenantActivationIsolation');
  rt.resetRuntimeForTests();
  iso.clearAllForTests();

  const metrics = {
    shadow_alignment_rate: 0.96,
    governance_confidence_score: 0.88,
    governance_false_positive_rate: 0.02,
    governance_overblocking_rate: 0.04,
    governance_context_preservation_rate: 0.92,
    drift_stability: 'stable'
  };
  const promo = rt.promoteChannel('summary', {
    tenant_id: 'tenant-a',
    readiness_opts: { metrics }
  });
  assert(promo.promoted === true, 'tenant-a summary promoted', promo);
  assert(
    rt.isChannelEffectivelyActive('summary', { tenant_id: 'tenant-a', user: { company_id: 'tenant-a' } }) === true,
    'runtime tenant-a summary',
    iso.getTenantState('tenant-a')
  );

  delete require.cache[require.resolve('../../src/policyEngine/config/phaseFFeatureFlags')];
  const phaseF = loadFresh('../../src/policyEngine/config/phaseFFeatureFlags');
  const ctxA = { tenant_id: 'tenant-a', user: { company_id: 'tenant-a' } };
  assert(phaseF.isSummaryGovernanceEnabled(ctxA) === true, 'tenant-a summary on');
  assert(phaseF.isSummaryGovernanceEnabled({ tenant_id: 'tenant-b' }) === false, 'tenant-b summary off');
}

function testRollbackReadiness() {
  console.log('\n=== Rollback readiness ===');
  const rb = loadFresh('../../src/governanceActivation/governanceRollbackReadiness');
  const r = rb.assessRollbackReadiness({ scope: 'phase_f_only' });
  assert(r.rollback_ready === true, 'rollback ready');
  assert(r.auto_rollback === false, 'no auto rollback');
}

function testRuntimeMonitoring() {
  console.log('\n=== Runtime monitoring ===');
  enablePhaseI();
  const mon = loadFresh('../../src/governanceActivation/governanceActivationMonitor');
  const health = mon.observeChannelExecution('chat', { tenant_id: 't1', force: true }, { sanitized: true });
  assert(health.governance_runtime_health, 'health computed');
}

function testControlledConsistency() {
  console.log('\n=== Controlled activation consistency ===');
  process.env.IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION = 'off';
  delete require.cache[require.resolve('../../src/policyEngine/config/phaseFFeatureFlags')];
  const phaseF = loadFresh('../../src/policyEngine/config/phaseFFeatureFlags');
  assert(phaseF.isKpiGovernanceEnabled() === false, 'off framework + no env = inactive');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  enablePhaseI();
  const rt = loadFresh('../../src/governanceActivation/governanceActivationRuntime');
  const phaseF = loadFresh('../../src/policyEngine/config/phaseFFeatureFlags');
  const iso = loadFresh('../../src/governanceActivation/tenantActivationIsolation');
  rt.resetRuntimeForTests();
  iso.clearAllForTests();

  const metrics = {
    shadow_alignment_rate: 0.96,
    governance_confidence_score: 0.88,
    drift_stability: 'stable'
  };
  const personas = [
    ['activation_kpi_quality', 'kpi', 'tenant-q', 'quality'],
    ['activation_summary_environmental', 'summary', 'tenant-e', 'environmental'],
    ['activation_chat_hr', 'chat', 'tenant-h', 'hr'],
    ['activation_boundary_safety', 'boundary', 'tenant-s', 'safety'],
    ['activation_runtime_executive', 'kpi', 'tenant-x', 'executive']
  ];

  for (const [file, channel, tenant, domain] of personas) {
    rt.promoteChannel(channel, { tenant_id: tenant, domain, readiness_opts: { metrics } });
    const snap = {
      channel,
      tenant_id: tenant,
      domain,
      effective: phaseF[`is${channel.charAt(0).toUpperCase() + channel.slice(1)}GovernanceEnabled`] ?
        null :
        null
    };
    if (channel === 'kpi') snap.effective = phaseF.isKpiGovernanceEnabled({ tenant_id: tenant });
    else if (channel === 'summary') snap.effective = phaseF.isSummaryGovernanceEnabled({ tenant_id: tenant });
    else if (channel === 'chat') snap.effective = phaseF.isChatGovernanceEnabled({ tenant_id: tenant });
    else if (channel === 'boundary') snap.effective = phaseF.isCognitiveBoundaryGuardEnabled({ tenant_id: tenant });
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(snap, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Cognitive Governance Phase I');
  testKpiActivationSafety();
  testActivationQualityGate();
  testTenantIsolation();
  testRollbackReadiness();
  testRuntimeMonitoring();
  testControlledConsistency();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
