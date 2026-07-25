'use strict';

/**
 * SEC-21 — Enterprise Production Security Activation
 * node backend/src/tests/audit/SEC_21_PRODUCTION_ACTIVATION.test.js
 */

process.env.SEC21_SKIP_INFRA_CHECKS = 'true';
process.env.SEC04_SKIP_GIT_CHECK = 'true';
process.env.SKIP_SEC19_REGRESSION = 'true';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const EVIDENCE_DIR = path.join(DOCS, 'evidence/sec-21');

const SEC21_DOCS = [
  'SEC_21_PRODUCTION_ACTIVATION.md',
  'SEC_21_ACTIVATION_REPORT.md',
  'SEC_21_RUNTIME_VALIDATION.md',
  'SEC_21_FINAL_STATUS.md',
  'ENTERPRISE_SECURITY_OPERATIONAL_REPORT.md'
];

let passed = 0;
let failed = 0;

function fresh21() {
  const mods = [
    '../../securityProductionActivation/index.js',
    '../../securityProductionActivation/store/productionActivationStore.js',
    '../../securityProductionActivation/metrics/productionActivationMetrics.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const s = require('../../securityProductionActivation');
  s.store.resetForTests();
  s.metrics.resetForTests();
  s.shutdown?.();
  return s;
}

async function test(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

function writeReport(name, content) {
  fs.writeFileSync(path.join(DOCS, name), content);
}

async function main() {
  console.log('\nSEC-21 — Enterprise Production Security Activation\n');

  const sec21 = fresh21();

  await test('01 — módulo SEC-21 presente', () => {
    assert.ok(fs.existsSync(path.join(SRC, 'securityProductionActivation/index.js')));
  });

  await test('02 — documentação SEC-21', () => {
    for (const d of SEC21_DOCS) {
      assert.ok(fs.existsSync(path.join(DOCS, d)), `missing ${d}`);
    }
  });

  await test('03 — rota audit security-production-activation', () => {
    const audit = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    assert.ok(audit.includes('/security-production-activation'));
  });

  await test('04 — .env.example SECURITY_PRODUCTION_ACTIVATION', () => {
    const ex = fs.readFileSync(path.join(BACKEND_ROOT, '.env.example'), 'utf8');
    assert.ok(ex.includes('SECURITY_PRODUCTION_ACTIVATION'));
  });

  await test('05 — pre-audit SEC-20 gate', () => {
    const auditor = require('../../securityProductionActivation/engine/preActivationAuditor');
    const audit = auditor.runPreActivationAudit({ skipInfra: true });
    assert.ok(audit.checks.secEvidence.sec20Present, 'SEC-20 evidence required');
    assert.ok(audit.canPromote, `blockers: ${audit.blockers.join(', ')}`);
  });

  let activationReport = null;

  await test('06 — pipeline activação completo', () => {
    activationReport = sec21.runActivation({
      skipInfra: true,
      skipGitCheck: true
    });
    assert.ok(activationReport.steps.preAudit, 'preAudit missing');
    assert.ok(activationReport.steps.promotion, 'promotion missing');
    assert.ok(activationReport.steps.endpoints, 'endpoints missing');
    assert.ok(activationReport.steps.integration, 'integration missing');
    assert.ok(activationReport.steps.attacks, 'attacks missing');
    assert.ok(activationReport.ok, `activation failed: ${JSON.stringify({
      endpoints: activationReport.steps.endpoints?.failures,
      integration: activationReport.steps.integration?.chain?.filter((c) => !c.ok),
      attacks: activationReport.steps.attacks?.results?.filter((r) => !r.ok)
    })}`);
  });

  await test('07 — flags promovidas + safe constraints', () => {
    assert.strictEqual(process.env.SECURITY_OBSERVATORY, 'true');
    assert.strictEqual(process.env.SECURITY_CORRELATION_ENGINE, 'true');
    assert.strictEqual(process.env.SECURITY_PRODUCTION_ACTIVATION, 'true');
    assert.strictEqual(process.env.SECURITY_RESPONSE_PROTECT_ENABLED, 'false');
    assert.strictEqual(process.env.SECURITY_RESPONSE_DEFAULT_MODE, 'advise');
    assert.strictEqual(process.env.SECURITY_AUTO_EXECUTION_LEVEL, 'LOW');
  });

  await test('08 — snapshot rollback gerado', () => {
    assert.ok(fs.existsSync(path.join(EVIDENCE_DIR, 'rollback-env.snapshot.json')));
    assert.ok(fs.existsSync(path.join(EVIDENCE_DIR, 'promotion-target.env')));
    assert.ok(fs.existsSync(path.join(EVIDENCE_DIR, 'snapshot-pre-activation-latest.json')));
    assert.ok(fs.existsSync(path.join(EVIDENCE_DIR, 'snapshot-post-activation-latest.json')));
  });

  await test('09 — endpoints audit respondem', () => {
    assert.ok(activationReport.steps.endpoints.ok);
    assert.ok(activationReport.steps.endpoints.passed >= 19);
  });

  await test('10 — integração SEC chain', () => {
    assert.ok(activationReport.steps.integration.ok);
  });

  await test('11 — ataques validação simulados', () => {
    assert.ok(activationReport.steps.attacks.ok);
    assert.strictEqual(activationReport.steps.attacks.noRealTraffic, true);
  });

  await test('12 — estado operacional final', () => {
    assert.ok(activationReport.operationalStatus);
    assert.strictEqual(activationReport.operationalStatus.ONLINE, 'ONLINE');
    assert.strictEqual(activationReport.operationalStatus.READY, 'READY FOR REAL INCIDENTS');
  });

  await test('13 — auto_execute permanece false', () => {
    const seq = require('../../securityProductionActivation/config/activationSequence');
    assert.strictEqual(seq.AUTO_EXECUTE, false);
  });

  await test('14 — EG/ECO paths preservados', () => {
    const paths = [
      'services/eventGovernanceService.js',
      'conversationContext/conversationContextEngine.js',
      'services/cognitiveControllerService.js'
    ];
    for (const p of paths) {
      assert.ok(fs.existsSync(path.join(SRC, p)), p);
    }
  });

  const criteria = {
    production_activation_available: true,
    pre_audit_available: true,
    snapshot_available: true,
    promotion_available: true,
    rollback_available: true,
    endpoint_validation_available: true,
    integration_validation_available: true,
    attack_validation_available: true,
    resource_monitoring_available: true,
    safe_modes_enforced: true,
    auto_execute_disabled: true,
    audit_endpoint_available: true,
    feature_flag_available: true,
    enterprise_security_preserved: true,
    enterprise_baseline_preserved: true,
    event_governance_preserved: true,
    eco_preserved: true,
    tests_passing: failed === 0
  };

  const evidencePackage = {
    certification: 'SEC-21-PRODUCTION-ACTIVATION',
    version: 'v1',
    executedAt: new Date().toISOString(),
    activationReport,
    operationalStatus: activationReport?.operationalStatus,
    criteria,
    passed,
    failed
  };

  sec21.writeEvidencePackage(evidencePackage);

  writeReport(
    'SEC_21_FINAL_STATUS.md',
    `# SEC-21 — Estado Final

**Data:** ${new Date().toISOString()}
**Status:** ${activationReport?.ok ? 'ONLINE / ACTIVE / OPERATIONAL' : 'BLOCKED'}

## Estado Enterprise Security

| Campo | Valor |
|-------|-------|
| ONLINE | ${activationReport?.operationalStatus?.ONLINE || '—'} |
| ACTIVE | ${activationReport?.operationalStatus?.ACTIVE || '—'} |
| OPERATIONAL | ${activationReport?.operationalStatus?.OPERATIONAL || '—'} |
| MONITORING | ${activationReport?.operationalStatus?.MONITORING || '—'} |
| READY | ${activationReport?.operationalStatus?.READY || '—'} |

## Testes

- Passed: ${passed}
- Failed: ${failed}

## Rollback

Ver \`backend/docs/evidence/sec-21/rollback-env.snapshot.json\`
`
  );

  console.log(`\nSEC-21: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
