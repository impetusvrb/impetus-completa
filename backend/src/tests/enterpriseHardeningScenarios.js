'use strict';

/**
 * Enterprise Hardening — testes offline (sem rede / sem BD).
 * Executar: node src/tests/enterpriseHardeningScenarios.js
 *
 * Cobertura mínima dos blocos críticos:
 *   • Bloco 1 — Internal Route Guard
 *   • Bloco 2 — Tenant Isolation Guard
 *   • Bloco 4 — Migration Governance Service (classify + lock key)
 *   • Bloco 7 — Authority Resolution Service
 *   • Bloco 9 — Audit Outbox (retry path)
 *   • Bloco 10 — Correlation ID middleware
 *   • Bloco 11 — Feature Governance Service
 */

const assert = require('assert');

/* eslint-disable no-process-env */

// ─── Bloco 1 — Internal Route Guard ───────────────────────────────────────────
function testInternalRouteGuardAnonymousDenied() {
  const { requireInternalAccess } = require('../middleware/internalRouteGuard');
  const guard = requireInternalAccess({ label: 'test' });
  const req = { headers: {}, originalUrl: '/api/internal/test', method: 'GET' };
  let statusCode = 200;
  let body = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(payload) { body = payload; return this; },
    setHeader() {}
  };
  let nextCalled = false;
  guard(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, false, 'anonymous deve ser bloqueado');
  assert.strictEqual(statusCode, 401, 'anonymous → 401');
  assert.ok(body && body.code === 'AUTH_REQUIRED');
}

function testInternalRouteGuardTenantUserDenied() {
  const { requireInternalAccess } = require('../middleware/internalRouteGuard');
  const guard = requireInternalAccess({ label: 'test' });
  const req = {
    headers: {},
    originalUrl: '/api/internal/test',
    method: 'GET',
    user: { id: 'u1', role: 'colaborador', company_id: 'c1' }
  };
  let statusCode = 200;
  let body = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(payload) { body = payload; return this; },
    setHeader() {}
  };
  let nextCalled = false;
  guard(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, false, 'utilizador tenant comum deve ser bloqueado');
  assert.strictEqual(statusCode, 403, 'role inválida → 403');
  assert.ok(body && body.code === 'INTERNAL_ROLE_DENIED');
}

function testInternalRouteGuardInternalAdminAllowed() {
  const { requireInternalAccess } = require('../middleware/internalRouteGuard');
  const guard = requireInternalAccess({ label: 'test' });
  const req = {
    headers: {},
    originalUrl: '/api/internal/test',
    method: 'GET',
    user: { id: 'admin1', role: 'internal_admin', company_id: 'c1' }
  };
  const res = { status() { return this; }, json() {}, setHeader() {} };
  let nextCalled = false;
  guard(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true, 'internal_admin deve passar');
}

function testInternalRouteGuardFlagDisabled() {
  process.env.IMPETUS_INTERNAL_ROUTES_ENABLED = 'false';
  // Reset cache modular para apanhar mudança? O guard lê env dinamicamente.
  const { requireInternalAccess } = require('../middleware/internalRouteGuard');
  const guard = requireInternalAccess({ label: 'test' });
  const req = {
    headers: {},
    originalUrl: '/api/internal/test',
    method: 'GET',
    user: { id: 'admin1', role: 'internal_admin', company_id: 'c1' }
  };
  let statusCode = 200;
  let body = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(payload) { body = payload; return this; },
    setHeader() {}
  };
  let nextCalled = false;
  guard(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, false, 'flag disabled deve bloquear');
  assert.strictEqual(statusCode, 503, 'flag disabled → 503');
  assert.ok(body && body.code === 'INTERNAL_ROUTES_DISABLED');
  delete process.env.IMPETUS_INTERNAL_ROUTES_ENABLED;
}

// ─── Bloco 2 — Tenant Isolation Guard ─────────────────────────────────────────
function testTenantIsolationGuardMissing() {
  const { tenantIsolationGuard } = require('../middleware/tenantIsolationGuard');
  const req = { headers: {}, body: {}, query: {}, params: {} };
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return this; }, json() {} };
  let nextCalled = false;
  tenantIsolationGuard(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(statusCode, 403);
}

function testTenantIsolationGuardMismatch() {
  const { tenantIsolationGuard } = require('../middleware/tenantIsolationGuard');
  const req = {
    headers: {},
    body: { company_id: 'evil-tenant' },
    query: {},
    params: {},
    user: { id: 'u1', company_id: 'safe-tenant' }
  };
  let statusCode = 200;
  let body = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(payload) { body = payload; return this; }
  };
  let nextCalled = false;
  tenantIsolationGuard(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(statusCode, 403);
  assert.ok(body && body.code === 'TENANT_MISMATCH');
}

function testTenantIsolationGuardMatch() {
  const { tenantIsolationGuard } = require('../middleware/tenantIsolationGuard');
  const req = {
    headers: {},
    body: { company_id: 'tenant-a' },
    query: {},
    params: {},
    user: { id: 'u1', company_id: 'tenant-a' }
  };
  const res = { status() { return this; }, json() {} };
  let nextCalled = false;
  tenantIsolationGuard(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req._tenantCompanyId, 'tenant-a');
}

function testAssertSameTenantThrowsOnMismatch() {
  const { assertSameTenant } = require('../middleware/tenantIsolationGuard');
  assert.throws(
    () => assertSameTenant('a', 'b', 'unit-test'),
    (err) => err && err.code === 'TENANT_ASSERTION_FAILED'
  );
  assert.strictEqual(assertSameTenant('a', 'a', 'unit-test'), true);
}

// ─── Bloco 4 — Migration Governance ───────────────────────────────────────────
function testMigrationLockKeyDeterministic() {
  const gov = require('../services/migrationGovernanceService');
  const k1 = gov.migrationAdvisoryLockKey();
  const k2 = gov.migrationAdvisoryLockKey();
  assert.strictEqual(k1, k2, 'lock key deve ser determinístico');
  assert.ok(/^\d+$/.test(k1), 'lock key numérica positiva');
}

function testClassifySqlErrorIdempotent() {
  const gov = require('../services/migrationGovernanceService');
  const cls = gov.classifySqlError({ code: '42P07', message: 'relation already exists' });
  assert.strictEqual(cls.idempotent, true);
  assert.strictEqual(cls.sqlstate, '42P07');
}

function testClassifySqlErrorReal() {
  const gov = require('../services/migrationGovernanceService');
  const cls = gov.classifySqlError({ code: '23505', message: 'unique violation' });
  assert.strictEqual(cls.idempotent, false, 'unique_violation NÃO é idempotente em geral');
}

// ─── Bloco 7 — Authority Resolution ───────────────────────────────────────────
function testAuthorityDecorateBasic() {
  const svc = require('../services/authorityResolutionService');
  const env = { content: 'x', meta: {} };
  svc.decorate(env, { deciding_authority: 'council', engine: 'A', degraded: false, trace_id: 't1' });
  assert.strictEqual(env.meta.authority.deciding_authority, 'council');
  assert.strictEqual(env.meta.authority.engine, 'A');
  assert.strictEqual(env.meta.authority.trace_id, 't1');
  assert.ok(Array.isArray(env.meta.authority.precedence));
}

function testAuthorityDetectConflicts() {
  const svc = require('../services/authorityResolutionService');
  const env = {
    meta: {
      authority: { deciding_authority: 'council' },
      gateway: { deciding_authority: 'gateway_v2' },
      dossier: { meta: { deciding_authority: 'orchestrator' } }
    }
  };
  const conflicts = svc.detectConflicts(env);
  assert.ok(conflicts.length >= 1, 'deve detetar conflito entre 3 autoridades distintas');
}

// ─── Bloco 9 — Audit Outbox ───────────────────────────────────────────────────
async function testAuditOutboxImmediateSuccess() {
  const outbox = require('../services/auditOutboxService');
  let calls = 0;
  const r = await outbox.enqueueAuditWrite('test', { x: 1 }, async () => { calls += 1; });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(calls, 1);
}

async function testAuditOutboxDeferred() {
  const outbox = require('../services/auditOutboxService');
  let calls = 0;
  const r = await outbox.enqueueAuditWrite('test', { x: 2 }, async () => {
    calls += 1;
    throw new Error('transient');
  });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.deferred, true);
  assert.ok(r.id);
  // Verifica que a entrada está em fila.
  const stats = outbox.getStats();
  assert.ok(stats.queue_size >= 1);
  outbox.stop();
}

// ─── Bloco 10 — Correlation ID ────────────────────────────────────────────────
function testCorrelationIdGenerated() {
  const { correlationIdMiddleware } = require('../middleware/correlationId');
  const req = { headers: {} };
  const setHeaderCalls = [];
  const res = { setHeader(k, v) { setHeaderCalls.push([k, v]); } };
  let nextCalled = false;
  correlationIdMiddleware(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true);
  assert.ok(req.id && req.id.length > 0);
  assert.ok(setHeaderCalls.some(([k]) => k === 'X-Request-Id'));
}

function testCorrelationIdPreservesIncoming() {
  const { correlationIdMiddleware } = require('../middleware/correlationId');
  const req = { headers: { 'x-request-id': 'abc-123' } };
  const res = { setHeader() {} };
  correlationIdMiddleware(req, res, () => {});
  assert.strictEqual(req.id, 'abc-123');
}

function testCorrelationIdSanitizesGarbage() {
  const { correlationIdMiddleware } = require('../middleware/correlationId');
  const req = { headers: { 'x-request-id': '<<<injected>>>' } };
  const res = { setHeader() {} };
  correlationIdMiddleware(req, res, () => {});
  assert.ok(req.id && req.id.startsWith('imp-'), 'header garbage deve cair em ID gerado');
}

// ─── Bloco 11 — Feature Governance ────────────────────────────────────────────
function testFeatureGovernanceSnapshotMasksSecrets() {
  process.env.JWT_SECRET = 'super-secret-value-1234567890';
  const fg = require('../services/featureGovernanceService');
  const snap = fg.getSnapshot();
  assert.ok(snap.JWT_SECRET && /^\[redacted/.test(snap.JWT_SECRET), 'JWT_SECRET deve ser redacted');
}

function testFeatureGovernanceDevOpenInProdError() {
  const prev = { node: process.env.NODE_ENV, dev: process.env.IMPETUS_INTERNAL_ROUTES_DEV_OPEN };
  process.env.NODE_ENV = 'production';
  process.env.IMPETUS_INTERNAL_ROUTES_DEV_OPEN = 'true';
  // Re-import — limpamos o cache.
  delete require.cache[require.resolve('../services/featureGovernanceService')];
  const fg = require('../services/featureGovernanceService');
  const v = fg.getValidation();
  assert.ok(!v.ok || v.findings.some((f) => f.id === 'INTERNAL_DEV_OPEN_IN_PROD'));
  process.env.NODE_ENV = prev.node || 'development';
  if (prev.dev != null) process.env.IMPETUS_INTERNAL_ROUTES_DEV_OPEN = prev.dev;
  else delete process.env.IMPETUS_INTERNAL_ROUTES_DEV_OPEN;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────
async function run() {
  const tests = [
    testInternalRouteGuardAnonymousDenied,
    testInternalRouteGuardTenantUserDenied,
    testInternalRouteGuardInternalAdminAllowed,
    testInternalRouteGuardFlagDisabled,
    testTenantIsolationGuardMissing,
    testTenantIsolationGuardMismatch,
    testTenantIsolationGuardMatch,
    testAssertSameTenantThrowsOnMismatch,
    testMigrationLockKeyDeterministic,
    testClassifySqlErrorIdempotent,
    testClassifySqlErrorReal,
    testAuthorityDecorateBasic,
    testAuthorityDetectConflicts,
    testAuditOutboxImmediateSuccess,
    testAuditOutboxDeferred,
    testCorrelationIdGenerated,
    testCorrelationIdPreservesIncoming,
    testCorrelationIdSanitizesGarbage,
    testFeatureGovernanceSnapshotMasksSecrets,
    testFeatureGovernanceDevOpenInProdError
  ];

  let pass = 0;
  let fail = 0;
  for (const t of tests) {
    try {
      await t();
      console.log(`  \u2713 ${t.name}`);
      pass += 1;
    } catch (e) {
      console.error(`  \u2717 ${t.name}: ${e.message}`);
      fail += 1;
    }
  }
  console.log(`\n[enterprise-hardening] passed=${pass} failed=${fail}`);
  if (fail > 0) process.exit(1);
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Fatal', err);
    process.exit(1);
  });
}

module.exports = { run };
