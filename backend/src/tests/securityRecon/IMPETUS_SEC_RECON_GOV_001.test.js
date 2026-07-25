'use strict';

/**
 * SEC-RECON-GOV-001 — falso positivo sistémico do painel admin.
 * node backend/src/tests/securityRecon/IMPETUS_SEC_RECON_GOV_001.test.js
 */
process.env.SECURITY_RECON_CORRELATION = 'true';
process.env.SECURITY_RECON_CONTAINMENT = 'true';

const assert = require('assert');
const path = require('path');

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

function freshModule(rel) {
  const abs = path.resolve(__dirname, rel);
  delete require.cache[abs];
  return require(abs);
}

function freshStack() {
  const store = freshModule('../../securityRecon/store/reconStateStore');
  const engine = freshModule('../../securityRecon/engine/securityReconCorrelationEngine');
  const dto = freshModule('../../securityRecon/dto/securitySignalDto');
  const postVal = freshModule('../../securityRecon/engine/postValidationDecision');
  const guard = freshModule('../../securityRecon/guard/validatedIdentityReconGuard');
  store.clearAll();
  return { store, engine, dto, postVal, guard };
}

function mockReq(path, admin = true) {
  const req = {
    originalUrl: path,
    path,
    method: 'GET',
    headers: { authorization: 'Bearer x' },
    impetusClientNetwork: { clientIp: '198.18.0.99', immediatePeerIp: '127.0.0.1' }
  };
  if (admin) req.adminUser = { id: 'a1', perfil: 'super_admin' };
  return req;
}

function mockRes() {
  const r = { statusCode: 200, headers: {}, _body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.setHeader = () => r;
  r.json = (b) => { r._body = b; return r; };
  return r;
}

(async () => {
  console.log('\nSEC-RECON-GOV-001\n');

  await test('01 — navegação admin 12 módulos não bloqueia pós-validação', () => {
    const { engine, dto, guard } = freshStack();
    const paths = [
      '/api/impetus-admin/dashboard/stats',
      '/api/impetus-admin/companies',
      '/api/impetus-admin/users',
      '/api/impetus-admin/logs',
      '/api/impetus-admin/auth/mfa/status',
      '/api/impetus-admin/device-trust/devices',
      '/api/impetus-admin/security-dashboard',
      '/api/admin-portal/risk-intelligence/overview',
      '/api/admin-portal/ai-incidents/metrics',
      '/api/admin-portal/compliance/overview',
      '/api/impetus-admin/auth/me',
      '/api/impetus-admin/device-trust/ips'
    ];
    for (const p of paths) {
      engine.ingestSignal(dto.createSecuritySignal({
        sourceLayer: 'SEC01_RUNTIME',
        signalType: 'PATH_DISCOVERY',
        canonicalSignalType: 'PATH_DISCOVERY',
        clientIp: '198.18.0.99',
        path: p,
        authenticated: true
      }));
      const ok = guard.runValidatedIdentityReconGuard(
        mockReq(p),
        mockRes(),
        { validationSource: 'requireAdminAuth', identityType: 'ADMIN' }
      );
      assert.strictEqual(ok, true, `blocked at ${p}`);
    }
    const st = engine.getStateForIp('198.18.0.99');
    assert.strictEqual(st.score, 0);
  });

  // GOV-003: PATH_DISCOVERY puro (probeHits=0) com sessão autenticada em user-portal → downgrade SUSPECT → permitido.
  // Resolve CEO/diretor bloqueado por score acumulado de navegação normal antes de GOV-002.
  await test('02 — PATH_DISCOVERY puro + user-portal autenticado: downgrade SUSPECT (GOV-003)', () => {
    const { engine, dto, guard } = freshStack();
    const ip = '203.0.113.55';
    for (let i = 0; i < 25; i++) {
      engine.ingestSignal(dto.createSecuritySignal({
        clientIp: ip,
        path: `/api/dashboard/path-${i}`,
        signalType: 'PATH_DISCOVERY',
        canonicalSignalType: 'PATH_DISCOVERY',
        sourceLayer: 'SEC01_RUNTIME'
      }));
    }
    const req = mockReq('/api/dashboard/me', false);
    req.user = { id: 1, company_id: 1 };
    req.adminUser = undefined;
    req.impetusClientNetwork = { clientIp: ip };
    const ok = guard.runValidatedIdentityReconGuard(req, mockRes(), { validationSource: 'requireAuth' });
    // probeHits=0 → downgrade CONTAIN→SUSPECT → guard retorna true (passa)
    assert.strictEqual(ok, true, 'GOV-003: navegação normal acumulada não deve bloquear utilizador autenticado');
  });

  // GOV-003: recon real (TECHNOLOGY_MISMATCH_PROBE) → probeHits >= 1 → mantém CONTAIN mesmo com auth.
  await test('02b — recon com TECHNOLOGY_MISMATCH_PROBE continua bloqueado após auth (GOV-003)', () => {
    const { engine, dto, guard } = freshStack();
    const ip = '203.0.113.77';
    // 3 probes reais — accionam probeHits
    for (let i = 0; i < 3; i++) {
      engine.ingestSignal(dto.createSecuritySignal({
        clientIp: ip,
        path: `/api/v${i}/.env`,
        signalType: 'TECHNOLOGY_MISMATCH_PROBE',
        canonicalSignalType: 'TECHNOLOGY_MISMATCH_PROBE',
        sourceLayer: 'SEC01_RUNTIME'
      }));
    }
    // score adicional de PATH_DISCOVERY para atingir CONTAIN
    for (let i = 0; i < 5; i++) {
      engine.ingestSignal(dto.createSecuritySignal({
        clientIp: ip,
        path: `/api/dashboard/x-${i}`,
        signalType: 'PATH_DISCOVERY',
        canonicalSignalType: 'PATH_DISCOVERY',
        sourceLayer: 'SEC01_RUNTIME'
      }));
    }
    const req = mockReq('/api/dashboard/me', false);
    req.user = { id: 2, company_id: 1 };
    req.adminUser = undefined;
    req.impetusClientNetwork = { clientIp: ip };
    const ok = guard.runValidatedIdentityReconGuard(req, mockRes(), { validationSource: 'requireAuth' });
    // probeHits >= 1 → GOV-003 NÃO aplica → mantém CONTAIN → guard retorna false
    assert.strictEqual(ok, false, 'GOV-003: IP com probes reais deve permanecer bloqueado mesmo após auth');
  });

  await test('03 — /api/admin-portal classificado ADMIN_SENSITIVE', () => {
    const { classifyRoute } = freshModule('../../securityRecon/engine/routeExposurePolicy');
    assert.strictEqual(classifyRoute('/api/admin-portal/compliance/overview'), 'ADMIN_SENSITIVE');
  });

  // GOV-004: Base Estrutural (/api/admin/structural) — tenant admin no user-portal.
  await test('04 — PATH_DISCOVERY acumulado + /api/admin/structural autenticado: permitido (GOV-004)', () => {
    const { engine, dto, guard } = freshStack();
    const ip = '203.0.113.88';
    for (let i = 0; i < 25; i++) {
      engine.ingestSignal(dto.createSecuritySignal({
        clientIp: ip,
        path: `/api/dashboard/path-${i}`,
        signalType: 'PATH_DISCOVERY',
        canonicalSignalType: 'PATH_DISCOVERY',
        sourceLayer: 'SEC01_RUNTIME'
      }));
    }
    const paths = [
      '/api/admin/structural/roles',
      '/api/admin/structural/references',
      '/api/admin/structural/sectors',
      '/api/admin/users'
    ];
    for (const p of paths) {
      const req = mockReq(p, false);
      req.user = { id: 1, company_id: 1 };
      req.adminUser = undefined;
      req.impetusClientNetwork = { clientIp: ip };
      const ok = guard.runValidatedIdentityReconGuard(req, mockRes(), { validationSource: 'requireAuth' });
      assert.strictEqual(ok, true, `GOV-004: bloqueado indevidamente em ${p}`);
    }
  });

  await test('05 — /api/admin-portal não confundido com prefixo /api/admin (GOV-004)', () => {
    const policy = freshModule('../../securityRecon/engine/adminOperationalRoutePolicy');
    assert.strictEqual(policy.isUserPortalOperationalPath('/api/admin/structural/roles'), true);
    assert.strictEqual(policy.isUserPortalOperationalPath('/api/admin-portal/risk-intelligence/overview'), false);
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
