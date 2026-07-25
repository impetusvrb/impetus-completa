'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const repository = path.resolve(__dirname, '../../../..');
const runtime = require('../../securityNotification/runtime/notificationRuntime');
const engine = require('../../securityNotification/engine/notificationEngine');
const observability = require('../../securityNotification/observability/bootstrapObservability');

const read = (relativePath) => fs.readFileSync(path.join(repository, relativePath), 'utf8');
const settle = () => new Promise((resolve) => setImmediate(resolve));
const restoreEnv = (name, value) => {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
};

test('MB-009: bootstrap desativado possui estado explícito', () => {
  const previous = process.env.SECURITY_NOTIFICATION_CENTER;
  process.env.SECURITY_NOTIFICATION_CENTER = 'false';
  observability.resetForTests();

  try {
    assert.deepEqual(runtime.bootstrap(), { enabled: false, status: 'disabled' });
    const status = runtime.getBootstrapStatus();
    assert.equal(status.status, 'disabled');
    assert.equal(status.enabled, false);
    assert.equal(status.attempts, 1);
  } finally {
    runtime.shutdown();
    restoreEnv('SECURITY_NOTIFICATION_CENTER', previous);
  }
});

test('MB-009: ciclo inicial bem-sucedido torna bootstrap observável como running', async () => {
  const previousFlag = process.env.SECURITY_NOTIFICATION_CENTER;
  const originalProcessAllSources = engine.processAllSources;
  process.env.SECURITY_NOTIFICATION_CENTER = 'true';
  engine.processAllSources = async () => [];
  observability.resetForTests();

  try {
    assert.deepEqual(runtime.bootstrap(), { enabled: true, status: 'starting' });
    await settle();
    const status = runtime.getBootstrapStatus();
    assert.equal(status.status, 'running');
    assert.equal(status.last_cycle_stage, 'initial');
    assert.ok(status.last_success_at);
  } finally {
    runtime.shutdown();
    engine.processAllSources = originalProcessAllSources;
    restoreEnv('SECURITY_NOTIFICATION_CENTER', previousFlag);
  }
});

test('MB-009: falha do ciclo inicial é explícita e não persiste mensagem sensível', async () => {
  const previousFlag = process.env.SECURITY_NOTIFICATION_CENTER;
  const originalProcessAllSources = engine.processAllSources;
  process.env.SECURITY_NOTIFICATION_CENTER = 'true';
  const failure = new Error('token=valor-que-nao-deve-ser-persistido');
  failure.code = 'SEC05_TEST_FAILURE';
  engine.processAllSources = async () => {
    throw failure;
  };
  observability.resetForTests();

  try {
    runtime.bootstrap();
    await settle();
    const status = runtime.getBootstrapStatus();
    assert.equal(status.status, 'failed');
    assert.equal(status.cycle_failures, 1);
    assert.deepEqual(status.last_error, {
      stage: 'initial_cycle',
      name: 'Error',
      code: 'SEC05_TEST_FAILURE'
    });
    assert.doesNotMatch(JSON.stringify(status), /valor-que-nao-deve-ser-persistido/);
  } finally {
    runtime.shutdown();
    engine.processAllSources = originalProcessAllSources;
    restoreEnv('SECURITY_NOTIFICATION_CENTER', previousFlag);
  }
});

test('MB-009: fontes SEC-02/03/04 não descartam exceções silenciosamente', () => {
  const source = read('backend/src/securityNotification/engine/notificationEngine.js');

  for (const phase of ['SEC-02', 'SEC-03', 'SEC-04']) {
    assert.match(source, new RegExp(`recordSourceFailure\\('${phase}', error\\)`));
  }
  assert.doesNotMatch(source, /catch\s*\(_e\)\s*\{\s*\}/);
});

test('MB-009: falha de fonte degrada estado com evento diagnosticável', async () => {
  const previousFlag = process.env.SECURITY_NOTIFICATION_CENTER;
  const originalLoad = Module._load;
  process.env.SECURITY_NOTIFICATION_CENTER = 'true';
  observability.resetForTests();

  Module._load = function loadWithSec02Failure(request, parent, isMain) {
    if (request === '../../securityCorrelation' && parent?.filename?.endsWith('notificationEngine.js')) {
      const error = new Error('detalhe sensível não persistido');
      error.code = 'SEC02_SOURCE_UNAVAILABLE';
      throw error;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    await engine.processAllSources();
    const status = observability.getSnapshot();
    assert.equal(status.status, 'degraded');
    assert.equal(status.source_failures, 1);
    assert.deepEqual(status.last_error, {
      stage: 'source_read',
      source: 'SEC-02',
      name: 'Error',
      code: 'SEC02_SOURCE_UNAVAILABLE'
    });
    assert.doesNotMatch(JSON.stringify(status), /detalhe sensível/);
  } finally {
    Module._load = originalLoad;
    restoreEnv('SECURITY_NOTIFICATION_CENTER', previousFlag);
  }
});

test('MB-009: auditoria e fallback expõem estado sem erro bruto', () => {
  observability.resetForTests();
  observability.recordBootstrapFailure('module_load_or_init', Object.assign(
    new SyntaxError('Unexpected token com segredo'),
    { code: 'SEC05_MODULE_INVALID' }
  ));

  const payload = runtime.getAuditPayload();
  assert.equal(payload.bootstrap.status, 'failed');
  assert.equal(payload.criteria.bootstrap_observable, true);
  assert.equal(payload.criteria.silent_bootstrap_failures_eliminated, true);
  assert.doesNotMatch(JSON.stringify(payload.bootstrap), /segredo/);

  const routes = read('backend/src/routes/audit.js');
  assert.match(routes, /SEC05_BOOTSTRAP_UNAVAILABLE/);
  assert.match(routes, /bootstrap: observability\.getSnapshot\(\)/);
  assert.doesNotMatch(routes, /Erro ao obter (?:Security Notifications|notificações pendentes)/);
});
