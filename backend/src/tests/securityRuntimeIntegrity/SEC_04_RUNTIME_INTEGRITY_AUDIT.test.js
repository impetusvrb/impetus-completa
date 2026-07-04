'use strict';

/**
 * SEC-04 — Runtime Integrity Audit (20+ checks).
 * node backend/src/tests/securityRuntimeIntegrity/SEC_04_RUNTIME_INTEGRITY_AUDIT.test.js
 */

process.env.SECURITY_RUNTIME_INTEGRITY = 'true';
process.env.SEC04_SKIP_GIT_CHECK = 'true';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');

let passed = 0;
let failed = 0;

function freshSec04() {
  const mods = [
    '../../securityRuntimeIntegrity/index.js',
    '../../securityRuntimeIntegrity/store/integrityReportStore.js',
    '../../securityRuntimeIntegrity/metrics/integrityMetrics.js',
    '../../securityRuntimeIntegrity/engine/integrityEngine.js',
    '../../securityRuntimeIntegrity/config/securityRuntimeIntegrityFlags.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  return require('../../securityRuntimeIntegrity');
}

function mockBaselineHashes(baseline) {
  const fileHashes = new Map();
  for (const e of baseline.criticalFiles) fileHashes.set(e.path, e.hash);
  return fileHashes;
}

function mockHealthyProcesses(baseline) {
  return (baseline.pm2Snapshot || [])
    .filter((p) => ['impetus-backend', 'impetus-frontend'].includes(p.name))
    .map((p) => ({
      name: p.name,
      status: 'online',
      script: p.script,
      restarts: p.restarts,
      pm2_env: { status: 'online', pm_exec_path: p.script, restart_time: p.restarts }
    }));
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

(async () => {
  console.log('\n  SEC-04 — ENTERPRISE RUNTIME INTEGRITY AUDIT\n');

  const baseline = require('../../securityRuntimeIntegrity/baseline/baselineLoader').loadBaseline();

  await test('01 — módulo securityRuntimeIntegrity exporta API', () => {
    const s = freshSec04();
    assert.ok(s.runIntegrityCheck);
    assert.ok(s.getAuditPayload);
  });

  await test('02 — feature flag default false sem env', () => {
    const prev = process.env.SECURITY_RUNTIME_INTEGRITY;
    delete process.env.SECURITY_RUNTIME_INTEGRITY;
    delete require.cache[require.resolve('../../securityRuntimeIntegrity/config/securityRuntimeIntegrityFlags.js')];
    const f = require('../../securityRuntimeIntegrity/config/securityRuntimeIntegrityFlags');
    assert.strictEqual(f.isSecurityRuntimeIntegrityEnabled(), false);
    process.env.SECURITY_RUNTIME_INTEGRITY = prev || 'true';
  });

  await test('03 — Runtime Integrity DTO schema v1', () => {
    const { createRuntimeIntegrityDto } = require('../../securityRuntimeIntegrity/dto/runtimeIntegrityDto');
    const r = createRuntimeIntegrityDto({ integrityStatus: 'INTEGRITY_OK', integrityScore: 1 });
    assert.strictEqual(r.schema_version, 'runtime_integrity_v1');
    assert.strictEqual(r.no_auto_remediation, true);
  });

  await test('04 — baseline loader carrega SECURITY-BASELINE-01', () => {
    assert.strictEqual(baseline.version, 'SECURITY-BASELINE-01');
    assert.ok(baseline.criticalFiles.length >= 10);
    assert.ok(baseline.gitHead);
  });

  await test('05 — baseline íntegra (hashes mock conformes)', () => {
    const s = freshSec04();
    s.store.resetForTests();
    s.metrics.resetForTests();
    const report = s.runIntegrityCheck({
      force: true,
      fileHashes: mockBaselineHashes(baseline),
      processes: mockHealthyProcesses(baseline),
      ports: [
        { address: '127.0.0.1', port: 4000 },
        { address: '127.0.0.1', port: 3000 },
        { address: '0.0.0.0', port: 443 },
        { address: '0.0.0.0', port: 80 },
        { address: '0.0.0.0', port: 22 }
      ],
      env: { LISTEN_HOST: '127.0.0.1', NODE_ENV: 'production' },
      skipBlueprintSample: true,
      gitHeadCurrent: baseline.gitHead
    });
    assert.ok(report.integrityScore >= 0.85);
    assert.strictEqual(report.hashValidation.passed, true);
  });

  await test('06 — hash alterado detectado', () => {
    const { validateHashes } = require('../../securityRuntimeIntegrity/validators/hashValidator');
    const hashes = mockBaselineHashes(baseline);
    const first = baseline.criticalFiles[0];
    hashes.set(first.path, '0'.repeat(64));
    const result = validateHashes(baseline, { fileHashes: hashes });
    assert.ok(result.drift >= 1);
    assert.ok(result.findings.some((f) => f.code === 'HASH_DRIFT'));
  });

  await test('07 — arquivo apagado detectado', () => {
    const { validateHashes } = require('../../securityRuntimeIntegrity/validators/hashValidator');
    const result = validateHashes(baseline, { missing: [baseline.criticalFiles[0].path] });
    assert.ok(result.missing >= 1);
    assert.ok(result.findings.some((f) => f.code === 'FILE_MISSING'));
  });

  await test('08 — processo reiniciado (restart drift)', () => {
    const { validateRuntime } = require('../../securityRuntimeIntegrity/validators/runtimeValidator');
    const procs = mockHealthyProcesses(baseline).map((p) => ({
      ...p,
      restarts: 9999,
      pm2_env: { ...p.pm2_env, restart_time: 9999 }
    }));
    const result = validateRuntime(baseline, { processes: procs });
    assert.ok(result.findings.some((f) => f.code === 'UNEXPECTED_RESTARTS'));
  });

  await test('09 — porta inesperada detectada', () => {
    const { validateNetwork } = require('../../securityRuntimeIntegrity/validators/networkValidator');
    const result = validateNetwork(baseline, {
      ports: [{ address: '0.0.0.0', port: 9999 }],
      unexpectedPorts: [9999]
    });
    assert.ok(result.findings.some((f) => f.code === 'UNEXPECTED_PORT'));
  });

  await test('10 — configuração modificada (LISTEN_HOST)', () => {
    const { validateConfiguration } = require('../../securityRuntimeIntegrity/validators/configValidator');
    const result = validateConfiguration(baseline, { env: { LISTEN_HOST: '0.0.0.0' } });
    assert.ok(result.findings.some((f) => f.code === 'ENV_DRIFT'));
  });

  await test('11 — Nginx alterado detectado', () => {
    const { validateConfiguration } = require('../../securityRuntimeIntegrity/validators/configValidator');
    const nginx = baseline.criticalFiles.find((f) => f.path.includes('nginx'));
    const result = validateConfiguration(baseline, { nginxHash: 'deadbeef'.repeat(8) });
    if (nginx) assert.ok(result.findings.some((f) => f.code === 'NGINX_CONFIG_DRIFT'));
  });

  await test('12 — PM2 script alterado', () => {
    const { validateRuntime } = require('../../securityRuntimeIntegrity/validators/runtimeValidator');
    const procs = mockHealthyProcesses(baseline).map((p) => ({
      ...p,
      pm2_env: { ...p.pm2_env, pm_exec_path: '/tmp/evil.js' }
    }));
    const result = validateRuntime(baseline, { processes: procs });
    assert.ok(result.findings.some((f) => f.code === 'SCRIPT_CHANGED'));
  });

  await test('13 — integrity score determinístico', () => {
    const { computeIntegrityScore } = require('../../securityRuntimeIntegrity/engine/integrityScoreCalculator');
    const score = computeIntegrityScore({
      hash: { status: 'OK', passed: true, findings: [] },
      configuration: { status: 'OK', passed: true, findings: [] },
      runtime: { status: 'OK', passed: true, findings: [] },
      filesystem: { status: 'OK', passed: true, findings: [] },
      network: { status: 'OK', passed: true, findings: [] }
    });
    assert.strictEqual(score, 1);
  });

  await test('14 — dashboard DTO schema v1', () => {
    const s = freshSec04();
    s.runIntegrityCheck({ force: true, fileHashes: mockBaselineHashes(baseline), processes: mockHealthyProcesses(baseline), ports: [], skipBlueprintSample: true });
    const dash = s.buildDashboard();
    assert.strictEqual(dash.schema_version, 'integrity_dashboard_v1');
    assert.ok(typeof dash.integrity_score === 'number');
  });

  await test('15 — audit payload SEC-04 criteria', () => {
    const s = freshSec04();
    const p = s.getAuditPayload();
    assert.strictEqual(p.phase, 'SEC-04');
    assert.strictEqual(p.no_auto_remediation, true);
    assert.strictEqual(p.criteria.runtime_integrity_available, true);
  });

  await test('16 — métricas integrity_checks incrementam', () => {
    const s = freshSec04();
    s.metrics.resetForTests();
    s.runIntegrityCheck({ force: true, fileHashes: mockBaselineHashes(baseline), skipBlueprintSample: true });
    assert.ok(s.metrics.getSnapshot().integrity_checks >= 1);
  });

  await test('17 — endpoint registado em audit.js', () => {
    const src = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    assert.ok(src.includes('/security-runtime-integrity'));
  });

  await test('18 — SEC-03 preservado', () => {
    const ti = require('../../securityThreatIntelligence');
    assert.ok(ti.analyzeIncident);
    const eg = fs.readFileSync(path.join(SRC, 'services/eventGovernanceService.js'), 'utf8');
    assert.ok(!eg.includes('securityRuntimeIntegrity'));
  });

  await test('19 — flag off → runIntegrityCheck null', () => {
    const prev = process.env.SECURITY_RUNTIME_INTEGRITY;
    process.env.SECURITY_RUNTIME_INTEGRITY = 'false';
    delete require.cache[require.resolve('../../securityRuntimeIntegrity/index.js')];
    delete require.cache[require.resolve('../../securityRuntimeIntegrity/config/securityRuntimeIntegrityFlags.js')];
    const s = require('../../securityRuntimeIntegrity');
    assert.strictEqual(s.runIntegrityCheck(), null);
    process.env.SECURITY_RUNTIME_INTEGRITY = prev || 'true';
  });

  await test('20 — documentação SEC_04 presente', () => {
    for (const f of ['SEC_04_RUNTIME_INTEGRITY.md', 'SEC_04_ARCHITECTURE.md', 'SEC_04_REPORT.md']) {
      assert.ok(fs.existsSync(path.join(DOCS, f)), `missing ${f}`);
    }
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
