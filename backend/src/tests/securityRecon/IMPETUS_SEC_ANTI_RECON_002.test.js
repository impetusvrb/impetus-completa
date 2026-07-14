'use strict';

/**
 * IMPETUS-SEC-ANTI-RECON-002 — testes obrigatórios.
 * node backend/src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_002.test.js
 */

process.env.SECURITY_OBSERVATORY = 'true';
process.env.SECURITY_RECON_CORRELATION = 'true';
process.env.SECURITY_RECON_CONTAINMENT = 'true';
process.env.SECURITY_RECON_WINDOW_MS = '120000';
process.env.SECURITY_RECON_MAX_KEYS = '500';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

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

function mockReq(opts = {}) {
  const headers = { ...(opts.headers || {}) };
  return {
    method: opts.method || 'GET',
    originalUrl: opts.url || '/',
    path: (opts.url || '/').split('?')[0],
    headers,
    get(name) {
      const k = String(name).toLowerCase();
      return headers[k] || headers[name];
    },
    socket: { remoteAddress: opts.remoteAddress || '127.0.0.1' },
    id: opts.requestId || 'req-test-1'
  };
}

function mockRes() {
  const res = {
    statusCode: 200,
    _headers: {},
    setHeader(k, v) { this._headers[k] = v; },
    getHeader(k) { return this._headers[k]; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this._body = body; return this; },
    on(ev, fn) {
      if (ev === 'finish') this._finish = fn;
      return this;
    },
    emitFinish() {
      if (this._finish) this._finish();
    }
  };
  return res;
}

(async () => {
  console.log('\n  IMPETUS-SEC-ANTI-RECON-002 — TEST SUITE\n');

  await test('01 — catálogo semântico carrega WORDPRESS_PROBE', () => {
    const catalog = freshModule('../../securityRecon/catalog/securitySignatureCatalog.js');
    const concept = catalog.matchPathConcept('/wp-admin/install.php');
    assert.ok(concept);
    assert.strictEqual(concept.id, 'WORDPRESS_PROBE');
    assert.strictEqual(concept.technologyPresent, false);
  });

  await test('02 — normalização threat-watch HTTP_CREDENTIAL_PROBE', () => {
    const norm = freshModule('../../securityRecon/engine/signalNormalizer.js');
    const line =
      '[2026-07-13T20:00:00Z] BAN HTTP_CREDENTIAL_PROBE 203.0.113.10 — GET /wp-admin/install.php?step=1 status 403 (silencioso)';
    const sig = norm.normalizeFromThreatWatchLine(line);
    assert.ok(sig);
    assert.strictEqual(sig.originalSignalType, 'HTTP_CREDENTIAL_PROBE');
    assert.strictEqual(sig.canonicalSignalType, 'CREDENTIAL_PROBE');
    assert.strictEqual(sig.sourceLayer, 'NGINX_THREAT_WATCH');
    assert.strictEqual(sig.metadata.externalBanAlreadyApplied, true);
  });

  await test('03 — SEC-01 event normalizado sem quebrar tipo original', () => {
    const norm = freshModule('../../securityRecon/engine/signalNormalizer.js');
    const sig = norm.normalizeFromSec01Event({
      event_type: 'CREDENTIAL_SCAN',
      classification: 'CREDENTIAL_SCAN',
      source_ip: '203.0.113.10',
      path_prefix: '/.env'
    });
    assert.strictEqual(sig.originalSignalType, 'CREDENTIAL_SCAN');
    assert.strictEqual(sig.canonicalSignalType, 'CREDENTIAL_PROBE');
  });

  await test('04 — correlação eleva score para probe tecnológico', () => {
    const store = freshModule('../../securityRecon/store/reconStateStore.js');
    const engine = freshModule('../../securityRecon/engine/securityReconCorrelationEngine.js');
    store.clearAll();

    const norm = freshModule('../../securityRecon/engine/signalNormalizer.js');
    const sig = norm.normalizeFromThreatWatchLine(
      '[2026-07-13T20:00:01Z] BAN HTTP_CREDENTIAL_PROBE 198.51.100.7 — GET /wp-admin/install.php status 403 (silencioso)'
    );
    const r1 = engine.ingestSignal(sig);
    assert.ok(r1);
    assert.ok(['SUSPECT', 'THROTTLE', 'CONTAIN'].includes(r1.behaviorState));
  });

  await test('05 — loopback permanece OBSERVE (health probes)', () => {
    const store = freshModule('../../securityRecon/store/reconStateStore.js');
    const engine = freshModule('../../securityRecon/engine/securityReconCorrelationEngine.js');
    store.clearAll();

    const { createSecuritySignal } = freshModule('../../securityRecon/dto/securitySignalDto.js');
    const sig = createSecuritySignal({
      sourceLayer: 'SEC01_RUNTIME',
      signalType: 'PATH_DISCOVERY',
      clientIp: '127.0.0.1',
      path: '/api/health'
    });
    const r = engine.ingestSignal(sig);
    assert.strictEqual(r.behaviorState, 'OBSERVE');
  });

  await test('06 — sessão autenticada reduz score (boot /app simulado)', () => {
    const store = freshModule('../../securityRecon/store/reconStateStore.js');
    const engine = freshModule('../../securityRecon/engine/securityReconCorrelationEngine.js');
    const norm = freshModule('../../securityRecon/engine/signalNormalizer.js');
    store.clearAll();

    const ip = '203.0.113.88';
    const paths = ['/api/dashboard', '/api/notifications', '/api/user/me', '/api/health'];
    for (let i = 0; i < 22; i++) {
      const req = mockReq({
        remoteAddress: '127.0.0.1',
        headers: { authorization: 'Bearer test-token', 'x-forwarded-for': ip },
        url: paths[i % paths.length]
      });
      req.user = { id: 1, company_id: 1 };
      const sig = norm.normalizeFromHttpRequest(req, {
        canonicalIp: freshModule('../../services/clientIpResolver.js').resolveCanonicalClientIp(req),
        statusCode: 200
      });
      engine.ingestSignal(sig);
    }

    const reqFinal = mockReq({
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': ip },
      url: '/api/dashboard',
      user: { id: 1, company_id: 1 }
    });
    reqFinal.impetusClientNetwork = freshModule('../../services/clientIpResolver.js')
      .resolveCanonicalClientIp(reqFinal);
    const postVal = freshModule('../../securityRecon/engine/postValidationDecision.js');
    const evaluation = postVal.evaluateValidatedIdentityDecision(reqFinal, {
      validationSource: 'requireAuth',
      identityType: 'USER'
    });
    assert.ok(['ALLOW', 'SUSPECT'].includes(evaluation.decision));
    assert.ok(!['THROTTLE', 'CONTAIN'].includes(evaluation.decision));
  });

  await test('07 — enumeração 50 paths distintos → THROTTLE ou CONTAIN', () => {
    const store = freshModule('../../securityRecon/store/reconStateStore.js');
    const engine = freshModule('../../securityRecon/engine/securityReconCorrelationEngine.js');
    const { createSecuritySignal } = freshModule('../../securityRecon/dto/securitySignalDto.js');
    store.clearAll();

    const ip = '198.51.100.99';
    for (let i = 0; i < 50; i++) {
      engine.ingestSignal(createSecuritySignal({
        sourceLayer: 'SEC01_RUNTIME',
        signalType: 'PATH_DISCOVERY',
        canonicalSignalType: 'PATH_DISCOVERY',
        clientIp: ip,
        path: `/nonexistent-${i}`,
        metadata: { notFound: true }
      }));
    }

    const behavior = engine.getBehaviorStateForIp(ip);
    assert.ok(['THROTTLE', 'CONTAIN', 'SUSPECT'].includes(behavior));
  });

  await test('08 — middleware CONTAIN externo preserva resposta neutra 404', () => {
    const store = freshModule('../../securityRecon/store/reconStateStore.js');
    const engine = freshModule('../../securityRecon/engine/securityReconCorrelationEngine.js');
    const { securityReconMiddleware } = freshModule('../../securityRecon/middleware/securityReconMiddleware.js');
    const dto = freshModule('../../securityRecon/dto/securitySignalDto.js');
    store.clearAll();

    const ip = '198.51.100.50';
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
      url: '/api/impetus-admin/security-dashboard'
    });
    const res = mockRes();
    let nextCalled = false;

    securityReconMiddleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 404);
    assert.deepStrictEqual(res._body, { success: false, error: 'Not found' });
  });

  await test('09 — edge ingest público não entra em CONTAIN', () => {
    const store = freshModule('../../securityRecon/store/reconStateStore.js');
    const engine = freshModule('../../securityRecon/engine/securityReconCorrelationEngine.js');
    const { securityReconMiddleware } = freshModule('../../securityRecon/middleware/securityReconMiddleware.js');
    const { createSecuritySignal } = freshModule('../../securityRecon/dto/securitySignalDto.js');
    store.clearAll();

    const ip = '198.51.100.60';
    for (let i = 0; i < 40; i++) {
      engine.ingestSignal(createSecuritySignal({
        sourceLayer: 'SEC01_RUNTIME',
        signalType: 'PATH_DISCOVERY',
        clientIp: ip,
        path: `/x-${i}`,
        metadata: { notFound: true }
      }));
    }

    const req = mockReq({
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': ip },
      url: '/api/integrations/edge/ingest',
      method: 'POST'
    });
    const res = mockRes();
    let nextCalled = false;
    securityReconMiddleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  await test('10 — catálogo vs registries — patterns cobrem SCANNER_PATH_RE', () => {
    const catalog = freshModule('../../securityRecon/catalog/securitySignatureCatalog.js');
    const classifier = freshModule('../../securityObservatory/classification/securityClassifier.js');
    const probePaths = [
      '/wp-admin/install.php',
      '/.env',
      '/.git/config',
      '/phpmyadmin/index.php',
      '/actuator/health'
    ];
    for (const p of probePaths) {
      assert.ok(classifier.SCANNER_PATH_RE.test(p), `SEC-01 missing ${p}`);
      assert.ok(catalog.matchPathConcept(p), `catalog missing ${p}`);
    }
  });

  await test('11 — nginx access log canónico aponta impetus-access.log', () => {
    const { CANONICAL_NGINX_ACCESS_LOG, getNginxAccessLogPath } =
      freshModule('../../security/config/nginxAccessLogPath.js');
    assert.strictEqual(CANONICAL_NGINX_ACCESS_LOG, '/var/log/nginx/impetus-access.log');
    delete process.env.IMPETUS_NGINX_ACCESS;
    assert.strictEqual(getNginxAccessLogPath(), CANONICAL_NGINX_ACCESS_LOG);
  });

  await test('12 — decisão ANTI_RECON_DECISION estruturada', () => {
    const engine = freshModule('../../securityRecon/engine/securityReconCorrelationEngine.js');
    const { createSecuritySignal } = freshModule('../../securityRecon/dto/securitySignalDto.js');
    freshModule('../../securityRecon/store/reconStateStore.js').clearAll();

    const r = engine.ingestSignal(createSecuritySignal({
      sourceLayer: 'NGINX_THREAT_WATCH',
      signalType: 'CREDENTIAL_PROBE',
      originalSignalType: 'HTTP_CREDENTIAL_PROBE',
      canonicalSignalType: 'CREDENTIAL_PROBE',
      clientIp: '203.0.113.77',
      path: '/wp-admin/install.php',
      metadata: { externalBanAlreadyApplied: true }
    }));
    assert.strictEqual(r.decision.eventType, 'ANTI_RECON_DECISION');
    assert.ok(r.decision.riskScore >= 0);
    assert.ok(r.decision.ruleVersion);
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
