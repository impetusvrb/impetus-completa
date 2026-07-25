'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  REDACTED,
  isSensitiveDiagnosticKey,
  sanitizeDiagnosticPayload,
  sanitizePm2ProcessList
} = require('../../securityApplication/diagnosticRedaction');
const secretManagement = require('../../securityApplication/secretManagement');

test('MB-005: redação diagnóstica bloqueia nomes sensíveis em profundidade', () => {
  assert.equal(isSensitiveDiagnosticKey('IMPETUS_ADMIN_JWT_SECRET'), true);
  assert.equal(isSensitiveDiagnosticKey('OPENAI_API_KEY'), true);
  assert.equal(isSensitiveDiagnosticKey('IMPETUS_SAFETY_RUNTIME'), false);

  const sanitized = sanitizeDiagnosticPayload({
    ok: true,
    nested: {
      IMPETUS_ADMIN_JWT_SECRET: 'sentinel-secret-value',
      IMPETUS_SAFETY_RUNTIME: 'on'
    }
  });

  assert.equal(sanitized.nested.IMPETUS_ADMIN_JWT_SECRET, REDACTED);
  assert.equal(sanitized.nested.IMPETUS_SAFETY_RUNTIME, 'on');
  assert.doesNotMatch(JSON.stringify(sanitized), /sentinel-secret-value/);
});

test('MB-005: allowlist PM2 remove pm2_env e conserva apenas metadados operacionais', () => {
  const processes = sanitizePm2ProcessList([
    {
      name: 'impetus-backend',
      pid: 123,
      pm2_env: {
        status: 'online',
        restart_time: 4,
        pm_uptime: 1000,
        pm_exec_path: '/srv/backend.js',
        pm_cwd: '/srv',
        JWT_SECRET: 'sentinel-secret-value'
      },
      monit: { cpu: 1, memory: 2048 }
    }
  ]);

  assert.deepEqual(processes, [{
    name: 'impetus-backend',
    pid: 123,
    status: 'online',
    restart_time: 4,
    pm_uptime: 1000,
    pm_exec_path: '/srv/backend.js',
    pm_cwd: '/srv',
    cpu: 1,
    memory: 2048
  }]);
  assert.doesNotMatch(JSON.stringify(processes), /pm2_env|JWT_SECRET|sentinel-secret-value/);
});

test('MB-005: reconciler e Rollout Center omitem variáveis IMPETUS sensíveis', () => {
  const sensitiveName = 'IMPETUS_ADMIN_JWT_SECRET';
  const safeName = 'IMPETUS_MB005_SAFE_FLAG';
  const previousSensitive = process.env[sensitiveName];
  const previousSafe = process.env[safeName];
  process.env[sensitiveName] = 'sentinel-secret-value';
  process.env[safeName] = 'on';

  try {
    const reconciler = require('../../governance/flagReconcilerRuntime');
    const rolloutFlags = require('../../rolloutCenter/resolvers/effectiveFlagsResolver');
    const snapshot = reconciler.reconcile().snapshot;
    const global = rolloutFlags.resolveGlobalEffectiveFlags(10000);

    assert.equal(snapshot[sensitiveName], undefined);
    assert.equal(snapshot[safeName].effective, 'on');
    assert.equal(global.impetus_env_sample.some(({ key }) => key === sensitiveName), false);
    assert.equal(global.impetus_env_sample.some(({ key }) => key === safeName), true);
    assert.equal(global.reconciler_effective[sensitiveName], undefined);
  } finally {
    if (previousSensitive === undefined) delete process.env[sensitiveName];
    else process.env[sensitiveName] = previousSensitive;
    if (previousSafe === undefined) delete process.env[safeName];
    else process.env[safeName] = previousSafe;
  }
});

test('MB-005: scanner cobre evidências textuais sem reproduzir valores', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mb005-'));
  try {
    fs.writeFileSync(path.join(tempRoot, 'snapshot.txt'), 'DB_PASSWORD=[test-only]\n');
    const findings = secretManagement.scanEvidenceSecretLeaks(tempRoot);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].type, 'EVIDENCE_SECRET_LEAK');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('MB-005: validação e persistência SEC-21C usam payload sanitizado', () => {
  const runtimeValidator = fs.readFileSync(
    path.resolve(__dirname, '../../securityGoLiveValidation/engine/runtimeHealthValidator.js'),
    'utf8'
  );
  const evidenceWriter = fs.readFileSync(
    path.resolve(__dirname, '../../securityGoLiveValidation/index.js'),
    'utf8'
  );

  assert.match(runtimeValidator, /sanitizePm2ProcessList\(pm2Probe\.output\)/);
  assert.match(runtimeValidator, /output:\s*REDACTED/);
  assert.doesNotMatch(runtimeValidator, /checks\.pm2\s*=\s*safeExec/);
  assert.match(evidenceWriter, /safeEvaluation\s*=\s*sanitizeDiagnosticPayload\(evaluation\)/);
  assert.match(evidenceWriter, /JSON\.stringify\(safeEvaluation/);
});

test('MB-005: geradores auxiliares não persistem pm2 jlist bruto', () => {
  const infrastructureGate = fs.readFileSync(
    path.resolve(__dirname, '../../securityGoLiveGate/engine/infrastructureGateValidator.js'),
    'utf8'
  );
  const certDay0 = fs.readFileSync(
    path.resolve(__dirname, '../../../scripts/audit/cert04_pilot_day0.js'),
    'utf8'
  );
  const environmentDeploy = fs.readFileSync(
    path.resolve(__dirname, '../../../scripts/environment-shadow-activation-deploy.js'),
    'utf8'
  );

  assert.match(infrastructureGate, /sanitizePm2ProcessList\(pm2Probe\.output\)/);
  assert.match(infrastructureGate, /output:\s*REDACTED/);
  assert.doesNotMatch(infrastructureGate, /head -c 500/);
  assert.match(certDay0, /sanitizePm2ProcessList\(sh\('pm2 jlist/);
  assert.doesNotMatch(certDay0, /head -c 500/);
  assert.match(environmentDeploy, /writeSanitizedPm2Snapshot/);
  assert.doesNotMatch(environmentDeploy, /pm2 jlist > /);
  assert.match(environmentDeploy, /fs\.chmodSync\(dst, 0o600\)/);
});

test('MB-005: serviços e scripts sensíveis não possuem credenciais default', () => {
  const timeClock = fs.readFileSync(
    path.resolve(__dirname, '../../services/timeClockIntegrationService.js'),
    'utf8'
  );
  const labOidc = fs.readFileSync(
    path.resolve(__dirname, '../../../scripts/industrial-lab-oidc-provider.js'),
    'utf8'
  );
  const adminSeed = fs.readFileSync(
    path.resolve(__dirname, '../../../scripts/seed-admin-portal.js'),
    'utf8'
  );

  assert.doesNotMatch(timeClock, /impetus-default-key-32b/);
  assert.match(timeClock, /TIME_CLOCK_ENC_KEY_NOT_CONFIGURED/);
  assert.match(labOidc, /IMPETUS_LAB_OIDC_SECRET_NOT_CONFIGURED/);
  assert.match(adminSeed, /ADMIN_PORTAL_SEED_CREDENTIALS_NOT_CONFIGURED/);
  assert.doesNotMatch(adminSeed, /123456/);
});
