'use strict';

/**
 * IMPETUS-SEC-ANTI-RECON-004 — validated identity enforcement.
 * node backend/src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_004.test.js
 */

process.env.SECURITY_RECON_CORRELATION = 'true';
process.env.SECURITY_RECON_CONTAINMENT = 'true';

const assert = require('assert');
const path = require('path');
const jwt = require('jsonwebtoken');
const { timingSafeEqualHex, hashEdgeToken } = require('../../services/edgeTokenCrypto');

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
  [
    '../../securityRecon/store/reconStateStore.js',
    '../../securityRecon/engine/decisionEventLimiter.js',
    '../../securityRecon/engine/securityReconCorrelationEngine.js',
    '../../securityRecon/engine/postValidationDecision.js',
    '../../securityRecon/guard/validatedIdentityReconGuard.js'
  ].forEach((p) => delete require.cache[path.resolve(__dirname, p)]);
  return {
    store: freshModule('../../securityRecon/store/reconStateStore.js'),
    engine: freshModule('../../securityRecon/engine/securityReconCorrelationEngine.js'),
    postVal: freshModule('../../securityRecon/engine/postValidationDecision.js'),
    guard: freshModule('../../securityRecon/guard/validatedIdentityReconGuard.js'),
    dto: freshModule('../../securityRecon/dto/securitySignalDto.js'),
    norm: freshModule('../../securityRecon/engine/signalNormalizer.js'),
    ip: freshModule('../../services/clientIpResolver.js'),
    limiter: freshModule('../../securityRecon/engine/decisionEventLimiter.js')
  };
}

function mockReq(opts = {}) {
  const headers = { ...(opts.headers || {}) };
  return {
    method: opts.method || 'GET',
    originalUrl: opts.url || '/api/test',
    path: (opts.url || '/api/test').split('?')[0],
    headers,
    user: opts.user,
    adminUser: opts.adminUser,
    get(n) { return headers[String(n).toLowerCase()] || headers[n]; },
    socket: { remoteAddress: opts.remoteAddress || '127.0.0.1' },
    id: 'req-004'
  };
}

function mockRes() {
  return {
    statusCode: 200,
    _headers: {},
    setHeader(k, v) { this._headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this._body = b; return this; }
  };
}

function inflateScore(engine, dto, ip, n = 40) {
  for (let i = 0; i < n; i++) {
    engine.ingestSignal(dto.createSecuritySignal({
      sourceLayer: 'SEC01_RUNTIME',
      signalType: 'TECHNOLOGY_MISMATCH_PROBE',
      canonicalSignalType: 'TECHNOLOGY_MISMATCH_PROBE',
      clientIp: ip,
      path: `/probe-${i}`
    }));
  }
}

(async () => {
  console.log('\n  IMPETUS-SEC-ANTI-RECON-004 — VALIDATED IDENTITY SUITE\n');

  await test('01 — fake Authorization sem trust reduction no ingest', () => {
    const { store, engine, dto } = freshStack();
    store.clearAll();
    const ip = '203.0.113.1';
    engine.ingestSignal(dto.createSecuritySignal({
      clientIp: ip, path: '/a', credentialPresent: true, authenticated: false,
      signalType: 'PATH_DISCOVERY', canonicalSignalType: 'PATH_DISCOVERY', sourceLayer: 'SEC01_RUNTIME'
    }));
    engine.ingestSignal(dto.createSecuritySignal({
      clientIp: ip, path: '/b', credentialPresent: false, authenticated: false,
      signalType: 'PATH_DISCOVERY', canonicalSignalType: 'PATH_DISCOVERY', sourceLayer: 'SEC01_RUNTIME'
    }));
    assert.strictEqual(engine.getStateForIp(ip).score, 2);
  });

  await test('02 — JWT inválido não produz validated identity', () => {
    const norm = freshModule('../../securityRecon/engine/signalNormalizer.js');
    const req = mockReq({ headers: { authorization: 'Bearer fake' } });
    const sig = norm.normalizeFromHttpRequest(req, { canonicalIp: { clientIp: '1.2.3.4' }, statusCode: 401 });
    assert.strictEqual(sig.authenticated, false);
  });

  await test('03 — JWT expirado isolado não THROTTLE na pós-validação', () => {
    const { postVal } = freshStack();
    const req = mockReq({ headers: { authorization: 'Bearer x' } });
    req.impetusClientNetwork = { clientIp: '203.0.113.2' };
    const ev = postVal.evaluateValidatedIdentityDecision(req, { validationSource: 'none' });
    assert.strictEqual(ev.decision, 'ALLOW');
  });

  await test('04 — req.user produz validated identity context', () => {
    const ctx = freshModule('../../securityRecon/engine/validatedIdentityContext.js');
    const req = mockReq({ user: { id: 10, company_id: 2 } });
    const v = ctx.buildValidatedIdentityContext(req, { validationSource: 'requireAuth' });
    assert.strictEqual(v.authenticatedIdentity, true);
    assert.strictEqual(v.identityType, 'USER');
  });

  await test('05 — score baixo + identidade validada → ALLOW', () => {
    const { store, engine, postVal } = freshStack();
    store.clearAll();
    const req = mockReq({ user: { id: 1, company_id: 1 }, url: '/api/dashboard' });
    req.impetusClientNetwork = { clientIp: '203.0.113.3' };
    const ev = postVal.evaluateValidatedIdentityDecision(req, { validationSource: 'requireAuth' });
    assert.strictEqual(ev.decision, 'ALLOW');
  });

  await test('06 — score alto + identidade validada → redutor contextual, não imunidade', () => {
    const { store, engine, dto, postVal } = freshStack();
    store.clearAll();
    const ip = '203.0.113.4';
    inflateScore(engine, dto, ip, 30);
    const req = mockReq({ user: { id: 1 }, url: '/api/data' });
    req.impetusClientNetwork = { clientIp: ip };
    const ev = postVal.evaluateValidatedIdentityDecision(req, { validationSource: 'requireAuth' });
    assert.ok(ev.rawScore >= 9);
    assert.ok(ev.effectiveScore < ev.rawScore);
    assert.ok(['THROTTLE', 'CONTAIN', 'SUSPECT'].includes(ev.decision));
  });

  await test('07 — autenticado em THROTTLE → handler bloqueado', () => {
    const { store, engine, dto, guard } = freshStack();
    store.clearAll();
    const ip = '203.0.113.5';
    inflateScore(engine, dto, ip, 25);
    const req = mockReq({ user: { id: 1 }, url: '/api/protected' });
    req.impetusClientNetwork = { clientIp: ip };
    const res = mockRes();
    let nextCalled = false;
    const ok = guard.runValidatedIdentityReconGuard(req, res, { validationSource: 'requireAuth' });
    assert.strictEqual(ok, false);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(nextCalled, false);
  });

  await test('08 — autenticado em CONTAIN efetivo → handler bloqueado', () => {
    const { store, engine, dto, guard } = freshStack();
    store.clearAll();
    const ip = '203.0.113.6';
    inflateScore(engine, dto, ip, 50);
    const req = mockReq({ user: { id: 1 }, url: '/api/admin/x' });
    req.impetusClientNetwork = { clientIp: ip };
    const res = mockRes();
    const ok = guard.runValidatedIdentityReconGuard(req, res, { validationSource: 'requireAuth' });
    assert.strictEqual(ok, false);
    assert.strictEqual(res.statusCode, 404);
  });

  await test('09 — admin validado passa pelo guard com score baixo', () => {
    const { guard } = freshStack();
    const req = mockReq({ adminUser: { id: 1, perfil: 'super_admin' }, url: '/api/impetus-admin/x' });
    req.impetusClientNetwork = { clientIp: '203.0.113.7' };
    const res = mockRes();
    assert.strictEqual(guard.runValidatedIdentityReconGuard(req, res, { validationSource: 'requireAdminAuth' }), true);
  });

  await test('10 — fake admin credential sem req.adminUser → sem trust', () => {
    const norm = freshModule('../../securityRecon/engine/signalNormalizer.js');
    const req = mockReq({ headers: { authorization: 'Bearer admin-fake' } });
    const sig = norm.normalizeFromHttpRequest(req, { canonicalIp: { clientIp: '1.1.1.1' }, statusCode: 401 });
    assert.strictEqual(sig.authenticated, false);
  });

  await test('11 — rota pública fraca não bloqueada pre-auth', () => {
    const middleware = freshModule('../../securityRecon/middleware/securityReconMiddleware.js');
    const mw = middleware.securityReconMiddleware;
    const req = mockReq({ url: '/api/auth/login', remoteAddress: '127.0.0.1' });
    const res = mockRes();
    res.on = () => res;
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  await test('12 — externalBanObserved pre-auth bloqueia', () => {
    const { store, engine, dto, middleware } = {
      ...freshStack(),
      middleware: freshModule('../../securityRecon/middleware/securityReconMiddleware.js')
    };
    store.clearAll();
    const ip = '203.0.113.8';
    engine.ingestSignal(dto.createSecuritySignal({
      sourceLayer: 'NGINX_THREAT_WATCH',
      signalType: 'CREDENTIAL_PROBE',
      canonicalSignalType: 'CREDENTIAL_PROBE',
      clientIp: ip,
      metadata: { externalBanAlreadyApplied: true }
    }));
    const req = mockReq({ url: '/api/x', remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': ip } });
    const res = mockRes();
    res.on = () => res;
    let nextCalled = false;
    middleware.securityReconMiddleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 404);
  });

  await test('13 — timing-safe edge: token correct length', () => {
    const t = 'a'.repeat(48);
    const h = hashEdgeToken(t);
    assert.strictEqual(timingSafeEqualHex(h, h), true);
    assert.strictEqual(timingSafeEqualHex(h, hashEdgeToken('b'.repeat(48))), false);
  });

  await test('14 — timing-safe edge: length mismatch safe false', () => {
    assert.strictEqual(timingSafeEqualHex('abc', 'abcd'), false);
  });

  await test('15 — timing-safe edge: empty token safe false', () => {
    assert.strictEqual(timingSafeEqualHex('', ''), false);
  });

  await test('16 — decisionEventLimiter bounded under flood', () => {
    const { store, engine, dto, limiter } = freshStack();
    store.clearAll();
    limiter.clearAll();
    let pub = 0;
    engine.subscribeDecision(() => { pub += 1; });
    const ip = '198.51.100.1';
    for (let i = 0; i < 500; i++) {
      engine.ingestSignal(dto.createSecuritySignal({
        clientIp: ip, path: `/f-${i}`, signalType: 'PATH_DISCOVERY',
        canonicalSignalType: 'PATH_DISCOVERY', sourceLayer: 'SEC01_RUNTIME'
      }));
    }
    assert.ok(pub < 30);
  });

  await test('17 — guard fail-open em exception', () => {
    const guard = freshModule('../../securityRecon/guard/validatedIdentityReconGuard.js');
    const postVal = freshModule('../../securityRecon/engine/postValidationDecision.js');
    const orig = postVal.evaluateValidatedIdentityDecision;
    postVal.evaluateValidatedIdentityDecision = () => { throw new Error('boom'); };
    const req = mockReq({ user: { id: 1 } });
    const res = mockRes();
    assert.strictEqual(guard.runValidatedIdentityReconGuard(req, res, {}), true);
    postVal.evaluateValidatedIdentityDecision = orig;
  });

  await test('18 — flag false → guard no-op', () => {
    const prev = process.env.SECURITY_RECON_CORRELATION;
    process.env.SECURITY_RECON_CORRELATION = 'false';
    delete require.cache[path.resolve(__dirname, '../../securityRecon/config/securityReconFlags.js')];
    delete require.cache[path.resolve(__dirname, '../../securityRecon/guard/validatedIdentityReconGuard.js')];
    const guard = freshModule('../../securityRecon/guard/validatedIdentityReconGuard.js');
    const req = mockReq({ user: { id: 1 } });
    const res = mockRes();
    assert.strictEqual(guard.runValidatedIdentityReconGuard(req, res, {}), true);
    process.env.SECURITY_RECON_CORRELATION = prev;
  });

  await test('19 — handler spy THROTTLE zero next()', () => {
    const { store, engine, dto, guard } = freshStack();
    store.clearAll();
    const ip = '203.0.113.9';
    inflateScore(engine, dto, ip, 22);
    const req = mockReq({ user: { id: 99 }, url: '/api/heavy' });
    req.impetusClientNetwork = { clientIp: ip };
    const res = mockRes();
    let handlerRan = false;
    const guardOk = guard.runValidatedIdentityReconGuard(req, res, { validationSource: 'requireAuth' });
    if (guardOk) handlerRan = true;
    assert.strictEqual(handlerRan, false);
  });

  await test('20 — boot /app ~22 requests → ALLOW pós-validação', () => {
    const { store, engine, dto, postVal, ip: ipMod } = freshStack();
    store.clearAll();
    const clientIp = '203.0.113.20';
    const paths = ['/api/dashboard', '/api/notifications', '/api/user/me', '/api/health'];
    for (let i = 0; i < 22; i++) {
      const req = mockReq({
        url: paths[i % paths.length],
        user: { id: 1, company_id: 1 },
        remoteAddress: '127.0.0.1',
        headers: { 'x-forwarded-for': clientIp }
      });
      const sig = freshModule('../../securityRecon/engine/signalNormalizer.js').normalizeFromHttpRequest(req, {
        canonicalIp: ipMod.resolveCanonicalClientIp(req),
        statusCode: 200
      });
      engine.ingestSignal(sig);
    }
    const finalReq = mockReq({
      user: { id: 1, company_id: 1 },
      url: '/api/dashboard/final',
      headers: { 'x-forwarded-for': clientIp }
    });
    finalReq.impetusClientNetwork = ipMod.resolveCanonicalClientIp(finalReq);
    const ev = postVal.evaluateValidatedIdentityDecision(finalReq, { validationSource: 'requireAuth' });
    assert.ok(['ALLOW', 'SUSPECT'].includes(ev.decision));
    assert.ok(!['THROTTLE', 'CONTAIN'].includes(ev.decision));
  });

  await test('21 — service identity marker module-scoped', () => {
    const marker = freshModule('../../securityRecon/engine/serviceIdentityMarker.js');
    const req = {};
    marker.markValidatedServiceIdentity(req, { source: 'edge_ingest', edgeId: 'e1', companyId: 1 });
    assert.strictEqual(marker.hasValidatedServiceIdentity(req), true);
    assert.strictEqual(req.impetusValidatedServiceIdentity, undefined);
  });

  await test('22 — authenticated não é bypass absoluto em score 12', () => {
    const { store, engine, dto, postVal } = freshStack();
    store.clearAll();
    const ip = '203.0.113.22';
    for (let i = 0; i < 12; i++) {
      engine.ingestSignal(dto.createSecuritySignal({
        clientIp: ip, path: `/p-${i}`, signalType: 'CREDENTIAL_PROBE',
        canonicalSignalType: 'CREDENTIAL_PROBE', sourceLayer: 'SEC01_RUNTIME'
      }));
    }
    const req = mockReq({ user: { id: 1 }, url: '/api/x' });
    req.impetusClientNetwork = { clientIp: ip };
    const ev = postVal.evaluateValidatedIdentityDecision(req, { validationSource: 'requireAuth' });
    assert.ok(ev.effectiveScore >= 6);
    assert.ok(['THROTTLE', 'CONTAIN'].includes(ev.decision));
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
