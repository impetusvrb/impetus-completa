'use strict';

/**
 * IMPETUS-SEC-ANTI-RECON-003 — anti-evasion + production readiness.
 * node backend/src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_003.test.js
 */

process.env.SECURITY_RECON_CORRELATION = 'true';
process.env.SECURITY_RECON_CONTAINMENT = 'true';
process.env.SECURITY_RECON_WINDOW_MS = '120000';
process.env.SECURITY_RECON_MAX_KEYS = '500';

const assert = require('assert');
const path = require('path');
const jwt = require('jsonwebtoken');

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

function freshModule(relPath) {
  const abs = path.resolve(__dirname, relPath);
  delete require.cache[abs];
  return require(abs);
}

function freshEngineStack() {
  [
    '../../securityRecon/store/reconStateStore.js',
    '../../securityRecon/engine/decisionEventLimiter.js',
    '../../securityRecon/engine/securityReconCorrelationEngine.js',
    '../../securityRecon/engine/signalNormalizer.js',
    '../../securityRecon/middleware/securityReconMiddleware.js'
  ].forEach((p) => delete require.cache[path.resolve(__dirname, p)]);
  return {
    store: freshModule('../../securityRecon/store/reconStateStore.js'),
    engine: freshModule('../../securityRecon/engine/securityReconCorrelationEngine.js'),
    norm: freshModule('../../securityRecon/engine/signalNormalizer.js'),
    limiter: freshModule('../../securityRecon/engine/decisionEventLimiter.js'),
    middleware: freshModule('../../securityRecon/middleware/securityReconMiddleware.js'),
    dto: freshModule('../../securityRecon/dto/securitySignalDto.js'),
    identity: freshModule('../../securityRecon/engine/identityContext.js'),
    ip: freshModule('../../services/clientIpResolver.js'),
    postVal: freshModule('../../securityRecon/engine/postValidationDecision.js')
  };
}

function mockReq(opts = {}) {
  const headers = { ...(opts.headers || {}) };
  return {
    method: opts.method || 'GET',
    originalUrl: opts.url || '/',
    path: (opts.url || '/').split('?')[0],
    headers,
    user: opts.user,
    adminUser: opts.adminUser,
    impetusValidatedServiceIdentity: opts.serviceValidated,
    get(name) {
      const k = String(name).toLowerCase();
      return headers[k] || headers[name];
    },
    socket: { remoteAddress: opts.remoteAddress || '127.0.0.1' },
    id: opts.requestId || 'req-test'
  };
}

function mockRes() {
  const res = {
    statusCode: 200,
    _headers: {},
    setHeader(k, v) { this._headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this._body = body; return this; },
    on(ev, fn) { if (ev === 'finish') this._finish = fn; },
    emitFinish() { if (this._finish) this._finish(); }
  };
  return res;
}

function probeSequence(engine, dto, ip, opts = {}) {
  const scores = [];
  for (let i = 0; i < (opts.count || 10); i++) {
    const r = engine.ingestSignal(dto.createSecuritySignal({
      sourceLayer: 'SEC01_RUNTIME',
      signalType: 'PATH_DISCOVERY',
      canonicalSignalType: 'PATH_DISCOVERY',
      clientIp: ip,
      path: opts.samePath ? '/same' : `/path-${i}`,
      credentialPresent: opts.credentialPresent,
      authenticated: opts.authenticated,
      metadata: { notFound: true }
    }));
    scores.push(r?.state?.score ?? 0);
  }
  return scores;
}

(async () => {
  console.log('\n  IMPETUS-SEC-ANTI-RECON-003 — ANTI-EVASION SUITE\n');

  await test('01 — fake Authorization NÃO reduz score vs sem header', () => {
    const { store, engine, dto } = freshEngineStack();
    store.clearAll();
    const ip = '203.0.113.50';
    const without = probeSequence(engine, dto, ip, { count: 8 });
    store.clearAll();
    const withFake = probeSequence(engine, dto, ip, {
      count: 8,
      credentialPresent: true,
      authenticated: false
    });
    assert.strictEqual(without[without.length - 1], withFake[withFake.length - 1]);
  });

  await test('02 — JWT inválido (credencial presente) NÃO reduz score', () => {
    const { store, engine, norm, ip: ipMod } = freshEngineStack();
    store.clearAll();
    const ip = '203.0.113.51';
    const secret = 'test-secret-for-sec-recon-003-invalid';
    const badToken = jwt.sign({ user_id: 1 }, secret, { algorithm: 'HS256' });

    for (let i = 0; i < 6; i++) {
      const req = mockReq({
        remoteAddress: '127.0.0.1',
        headers: { authorization: `Bearer ${badToken}`, 'x-forwarded-for': ip },
        url: `/scan-${i}`
      });
      const sig = norm.normalizeFromHttpRequest(req, {
        canonicalIp: ipMod.resolveCanonicalClientIp(req),
        statusCode: 404
      });
      assert.strictEqual(sig.authenticated, false);
      assert.strictEqual(sig.credentialPresent, true);
      engine.ingestSignal(sig);
    }
    const st = engine.getStateForIp(ip);
    assert.ok(st.score >= 3);
  });

  await test('03 — identidade validada reduz score efectivo na pós-validação', () => {
    const { store, engine, norm, ip: ipMod, postVal } = freshEngineStack();
    store.clearAll();
    const ip = '203.0.113.52';
    for (let i = 0; i < 6; i++) {
      const req = mockReq({
        remoteAddress: '127.0.0.1',
        headers: { 'x-forwarded-for': ip },
        url: `/app-${i}`,
        user: { id: 42, company_id: 1 }
      });
      const sig = norm.normalizeFromHttpRequest(req, {
        canonicalIp: ipMod.resolveCanonicalClientIp(req),
        statusCode: 200
      });
      assert.strictEqual(sig.authenticated, true);
      engine.ingestSignal(sig);
    }
    const reqFinal = mockReq({
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': ip },
      url: '/app-final',
      user: { id: 42, company_id: 1 }
    });
    reqFinal.impetusClientNetwork = ipMod.resolveCanonicalClientIp(reqFinal);
    const ev = postVal.evaluateValidatedIdentityDecision(reqFinal, { validationSource: 'requireAuth' });
    assert.ok(ev.rawScore >= 3);
    assert.ok(ev.effectiveScore < ev.rawScore);
  });

  await test('04 — fake service header NÃO reduz score', () => {
    const { store, engine, dto } = freshEngineStack();
    store.clearAll();
    const ip = '203.0.113.53';
    for (let i = 0; i < 5; i++) {
      engine.ingestSignal(dto.createSecuritySignal({
        sourceLayer: 'SEC01_RUNTIME',
        signalType: 'PATH_DISCOVERY',
        clientIp: ip,
        path: `/svc-${i}`,
        serviceIdentityPresent: false,
        metadata: { serviceHeader: 'edge-agent-fake' }
      }));
    }
    const st = engine.getStateForIp(ip);
    assert.ok(st.score >= 3);
  });

  await test('05 — XFF loopback spoof NÃO recebe trust reduction', () => {
    const { engine, norm, ip: ipMod } = freshEngineStack();
    const req = mockReq({
      remoteAddress: '203.0.113.99',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      url: '/wp-admin/install.php'
    });
    const sig = norm.normalizeFromHttpRequest(req, {
      canonicalIp: ipMod.resolveCanonicalClientIp(req),
      statusCode: 404
    });
    assert.strictEqual(sig.clientIp, '203.0.113.99');
    assert.strictEqual(norm.isTrustedLocalPeer(sig), false);
    const r = engine.ingestSignal(sig);
    assert.notStrictEqual(r.behaviorState, 'OBSERVE');
  });

  await test('06 — THROTTLE/CONTAIN interno não bloqueia pre-auth (sem external ban)', () => {
    const { store, engine, dto, middleware } = freshEngineStack();
    store.clearAll();
    const ip = '198.51.100.70';
    for (let i = 0; i < 40; i++) {
      engine.ingestSignal(dto.createSecuritySignal({
        sourceLayer: 'SEC01_RUNTIME',
        signalType: 'TECHNOLOGY_MISMATCH_PROBE',
        canonicalSignalType: 'TECHNOLOGY_MISMATCH_PROBE',
        clientIp: ip,
        path: `/probe-${i}`
      }));
    }
    assert.ok(['THROTTLE', 'CONTAIN'].includes(engine.getBehaviorStateForIp(ip)));

    const req = mockReq({
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': ip },
      url: '/api/secret-route-xyz'
    });
    const res = mockRes();
    let nextCalled = false;
    middleware.securityReconMiddleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'pre-auth: score interno não bloqueia antes de auth');
  });

  await test('06b — external ban observado bloqueia com 404 neutro', () => {
    const { store, engine, dto, middleware } = freshEngineStack();
    store.clearAll();
    const ip = '198.51.100.71';
    engine.ingestSignal(dto.createSecuritySignal({
      sourceLayer: 'NGINX_THREAT_WATCH',
      signalType: 'CREDENTIAL_PROBE',
      canonicalSignalType: 'CREDENTIAL_PROBE',
      clientIp: ip,
      path: '/wp-admin/install.php',
      metadata: { externalBanAlreadyApplied: true }
    }));

    const req = mockReq({
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': ip },
      url: '/api/admin/test'
    });
    const res = mockRes();
    let nextCalled = false;
    middleware.securityReconMiddleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 404);
    assert.deepStrictEqual(res._body, { success: false, error: 'Not found' });
  });

  await test('07 — engine exception não bloqueia request (fail-open)', () => {
    const { middleware } = freshEngineStack();
    const req = mockReq({ url: '/api/test' });
    const res = mockRes();
    let nextCalled = false;
    const engine = freshModule('../../securityRecon/engine/securityReconCorrelationEngine.js');
    const orig = engine.getBehaviorStateForIp;
    engine.getBehaviorStateForIp = () => { throw new Error('simulated'); };
    middleware.securityReconMiddleware(req, res, () => { nextCalled = true; });
    engine.getBehaviorStateForIp = orig;
    assert.strictEqual(nextCalled, true);
  });

  await test('08 — signal inválido não derruba ingest', () => {
    const { engine } = freshEngineStack();
    assert.strictEqual(engine.ingestSignal(null), null);
    assert.strictEqual(engine.ingestSignal({}), null);
  });

  await test('09 — decision events bounded (1000 sinais → poucas publicações)', () => {
    const { store, engine, dto, limiter } = freshEngineStack();
    store.clearAll();
    limiter.clearAll();
    let published = 0;
    engine.subscribeDecision(() => { published += 1; });
    const ip = '198.51.100.80';
    for (let i = 0; i < 1000; i++) {
      engine.ingestSignal(dto.createSecuritySignal({
        sourceLayer: 'SEC01_RUNTIME',
        signalType: 'PATH_DISCOVERY',
        clientIp: ip,
        path: `/flood-${i % 50}`,
        metadata: { notFound: true }
      }));
    }
    assert.ok(published < 50, `published=${published} expected bounded`);
    assert.ok(store.getSnapshot().keys <= 500);
  });

  await test('10 — path repetido deduplica contribuição PATH_DISCOVERY', () => {
    const { store, engine, dto } = freshEngineStack();
    store.clearAll();
    const ip = '198.51.100.81';
    for (let i = 0; i < 100; i++) {
      engine.ingestSignal(dto.createSecuritySignal({
        sourceLayer: 'SEC01_RUNTIME',
        signalType: 'PATH_DISCOVERY',
        clientIp: ip,
        path: '/same-path-repeated'
      }));
    }
    const st = engine.getStateForIp(ip);
    assert.ok(st.score < 20, `score=${st.score} expected dedup`);
    assert.strictEqual(st.distinctPaths.size, 1);
  });

  await test('11 — threat-watch → engine (ingestor parse real)', () => {
    const ingest = freshModule('../../securityRecon/ingest/threatWatchSignalIngestor.js');
    const line =
      '[2026-07-13T21:00:00Z] BAN HTTP_CREDENTIAL_PROBE 203.0.113.10 — GET /wp-admin/install.php?step=1 status 403 (silencioso)';
    const n = ingest.ingestThreatLogLines([line]);
    assert.strictEqual(n, 1);
  });

  await test('12 — identidade validada passa middleware (sem external ban)', () => {
    const { store, engine, dto, middleware } = freshEngineStack();
    store.clearAll();
    const ip = '198.51.100.90';
    for (let i = 0; i < 40; i++) {
      engine.ingestSignal(dto.createSecuritySignal({
        sourceLayer: 'SEC01_RUNTIME',
        signalType: 'TECHNOLOGY_MISMATCH_PROBE',
        canonicalSignalType: 'TECHNOLOGY_MISMATCH_PROBE',
        clientIp: ip,
        path: `/x-${i}`
      }));
    }
    const req = mockReq({
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': ip, authorization: 'Bearer fake' },
      url: '/api/impetus-admin/security-dashboard',
      user: { id: 1 }
    });
    const res = mockRes();
    let nextCalled = false;
    middleware.securityReconMiddleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  await test('13 — PM2 runtime documentado: fork_mode instância única', () => {
    const { execSync } = require('child_process');
    const out = execSync('pm2 describe impetus-backend 2>/dev/null | grep "exec mode"', { encoding: 'utf8' });
    assert.ok(out.includes('fork_mode'));
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
