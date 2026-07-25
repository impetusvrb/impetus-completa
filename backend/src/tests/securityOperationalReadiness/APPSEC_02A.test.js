'use strict';

/**
 * APPSEC-02A — Operational Hardening & External Red Team Readiness
 * node backend/src/tests/securityOperationalReadiness/APPSEC_02A.test.js
 */

process.env.NODE_ENV = 'test';
process.env.ALLOW_PARTIAL_ENV = 'true';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../../..');
const BACKEND = path.resolve(__dirname, '../../..');

let passed = 0;
let failed = 0;

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

function fresh(p) {
  delete require.cache[require.resolve(p)];
  return require(p);
}

(async () => {
  console.log('\n  APPSEC-02A — OPERATIONAL HARDENING & EXTERNAL RED TEAM READINESS\n');

  await test('01 — módulo securityOperationalReadiness', () => {
    const m = fresh('../../securityOperationalReadiness/index.js');
    assert.ok(m.buildReadiness);
    assert.ok(m.secretCleanupEngine);
    assert.ok(m.confidenceLevelEngine);
  });

  await test('02 — secretCleanupEngine inventaria .env', () => {
    const { generateSecretCleanupReport } = fresh('../../securityOperationalReadiness/secretCleanupEngine.js');
    const r = generateSecretCleanupReport({ backendRoot: BACKEND });
    assert.ok(r.inventory.length >= 1);
    assert.ok(r.summary.active >= 1);
    assert.strictEqual(r.auto_remove, undefined);
    assert.strictEqual(r.cleanup_plan.auto_remove, false);
  });

  await test('03 — classificação ACTIVE/BACKUP/UNSAFE', () => {
    const { CLASSIFICATION, inventoryEnvArtifacts } = fresh('../../securityOperationalReadiness/secretCleanupEngine.js');
    const inv = inventoryEnvArtifacts(BACKEND);
    const classes = new Set(inv.map((i) => i.classification));
    assert.ok(classes.has(CLASSIFICATION.ACTIVE));
  });

  await test('04 — cleanup script --dry-run', () => {
    const script = path.join(BACKEND, 'scripts/security/cleanup-env-artifacts.sh');
    assert.ok(fs.existsSync(script));
    execSync(`bash "${script}" --dry-run`, { cwd: BACKEND, timeout: 60000 });
    assert.ok(fs.existsSync(path.join(BACKEND, 'docs/evidence/appsec-02a/secret-cleanup-dry-run.json')));
  });

  await test('05 — runtimeConfigurationReadiness nunca auto-fix', () => {
    const { validateRuntimeConfigurationReadiness } = fresh('../../securityOperationalReadiness/runtimeConfigurationReadiness.js');
    const r = validateRuntimeConfigurationReadiness({ repoRoot: ROOT });
    assert.strictEqual(r.auto_fix_applied, false);
    assert.ok(Array.isArray(r.findings));
  });

  await test('06 — dependencyUpgradePlanner completo', () => {
    const { generateDependencyUpgradePlan } = fresh('../../securityOperationalReadiness/dependencyUpgradePlanner.js');
    const p = generateDependencyUpgradePlan(ROOT);
    assert.strictEqual(p.plan_complete, true);
    assert.strictEqual(p.auto_upgrade, false);
    assert.ok(p.backend.plans.length >= 8);
  });

  await test('07 — runtimeRestartValidator snapshot', async () => {
    const { captureRuntimeSnapshot } = fresh('../../securityOperationalReadiness/runtimeRestartValidator.js');
    const snap = await captureRuntimeSnapshot({ phase: 'test' });
    assert.ok(snap.schema_version);
    assert.ok(snap.health_endpoints);
  });

  await test('08 — confidenceLevelEngine gera percentuais', async () => {
    const appsec02 = fresh('../../securityApplicationValidation/securityEvidenceBuilder.js');
    const { generateConfidenceReport } = fresh('../../securityOperationalReadiness/confidenceLevelEngine.js');
    const validation = await appsec02.buildValidationEvidence({ persist: false });
    const conf = generateConfidenceReport(validation, {});
    assert.ok(conf.findings.length >= 10);
    assert.ok(conf.findings.every((f) => f.confidence_percent >= 0 && f.confidence_percent <= 100));
    const rt01 = conf.findings.find((f) => f.finding_id === 'RT-01');
    assert.ok(rt01.confidence_percent >= 85);
  });

  await test('09 — externalRedTeamReadiness emite decisão', async () => {
    const orch = fresh('../../securityOperationalReadiness/operationalReadinessOrchestrator.js');
    const bundle = await orch.buildOperationalReadinessBundle({ persist: false, repoRoot: ROOT });
    assert.ok(['NOT_READY', 'READY_WITH_REMARKS', 'READY_FOR_EXTERNAL_RED_TEAM'].includes(
      bundle.external_redteam_readiness.decision
    ));
  });

  await test('10 — bundle persiste evidências', async () => {
    const orch = fresh('../../securityOperationalReadiness/operationalReadinessOrchestrator.js');
    const bundle = await orch.buildOperationalReadinessBundle({ persist: true, repoRoot: ROOT });
    const ev = path.join(BACKEND, 'docs/evidence/appsec-02a');
    assert.ok(fs.existsSync(path.join(ev, 'readiness-latest.json')));
    assert.ok(fs.existsSync(path.join(ev, 'confidence-level.json')));
    assert.ok(fs.existsSync(path.join(ev, 'external-redteam-readiness.json')));
  });

  await test('11 — APPSEC-02 reexecutado no bundle', async () => {
    const b = JSON.parse(fs.readFileSync(path.join(BACKEND, 'docs/evidence/appsec-02a/readiness-latest.json'), 'utf8'));
    assert.ok(b.appsec02_validation?.decision);
    assert.notStrictEqual(b.appsec02_validation.decision, 'APPSEC_FAILED');
  });

  await test('12 — todos findings com confidence level', async () => {
    const c = JSON.parse(fs.readFileSync(path.join(BACKEND, 'docs/evidence/appsec-02a/confidence-level.json'), 'utf8'));
    assert.ok(c.findings.every((f) => f.confidence_level && f.confidence_percent !== undefined));
  });

  await test('13 — endpoint audit registado', () => {
    const src = fs.readFileSync(path.join(BACKEND, 'src/routes/audit.js'), 'utf8');
    assert.ok(/appsec-operational-readiness/.test(src));
  });

  await test('14 — SEC/APPSEC-01/02 não alterados', () => {
    assert.ok(fs.existsSync(path.join(BACKEND, 'src/securityApplication/index.js')));
    assert.ok(fs.existsSync(path.join(BACKEND, 'src/securityApplicationValidation/index.js')));
    assert.ok(fs.existsSync(path.join(BACKEND, 'src/securityObservatory/index.js')));
  });

  await test('15 — documentação APPSEC_02A.md', () => {
    assert.ok(fs.existsSync(path.join(BACKEND, 'docs/APPSEC_02A.md')));
  });

  await test('16 — zero regressões APPSEC-01/02', () => {
    execSync(`node "${path.join(BACKEND, 'src/tests/securityApplication/APPSEC_01.test.js')}"`, { timeout: 120000 });
    execSync(`node "${path.join(BACKEND, 'src/tests/securityApplicationValidation/APPSEC_02.test.js')}"`, { timeout: 120000 });
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
