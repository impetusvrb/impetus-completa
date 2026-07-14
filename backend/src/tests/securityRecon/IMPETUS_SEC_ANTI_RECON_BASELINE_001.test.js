'use strict';

/**
 * IMPETUS_SEC_ANTI_RECON_BASELINE_001 — regressão permanente pós-go-live.
 * node backend/src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_BASELINE_001.test.js
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND = path.resolve(__dirname, '../../..');
const SCORE_POLICY = path.join(BACKEND, 'src/securityRecon/engine/scorePolicy.js');
const MANIFEST = path.join(BACKEND, 'docs/evidence/sec-anti-recon-006/SECURITY_RECON_RUNTIME_MANIFEST.json');

const FROZEN_THRESHOLDS = Object.freeze({
  OBSERVE: { min: 0, max: 2 },
  SUSPECT: { min: 3, max: 5 },
  THROTTLE: { min: 6, max: 8 },
  CONTAIN: { min: 9, max: Infinity }
});

const FROZEN_SCORE_POLICY_SHA256 = 'bde2d3542bd6d7ee1a848a8652b33de0b6cc44895df074940e9404c218481d45';

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

function runSuite(rel) {
  execSync(`node ${path.join(BACKEND, rel)}`, { stdio: 'pipe', encoding: 'utf8' });
}

console.log('\n  IMPETUS_SEC_ANTI_RECON_BASELINE_001\n');

test('01 — scorePolicy thresholds congelados', () => {
  delete require.cache[require.resolve('../../securityRecon/engine/scorePolicy')];
  const sp = require('../../securityRecon/engine/scorePolicy');
  assert.deepStrictEqual(sp.STATE_THRESHOLDS.OBSERVE, FROZEN_THRESHOLDS.OBSERVE);
  assert.deepStrictEqual(sp.STATE_THRESHOLDS.SUSPECT, FROZEN_THRESHOLDS.SUSPECT);
  assert.deepStrictEqual(sp.STATE_THRESHOLDS.THROTTLE, FROZEN_THRESHOLDS.THROTTLE);
  assert.deepStrictEqual(sp.STATE_THRESHOLDS.CONTAIN, FROZEN_THRESHOLDS.CONTAIN);
});

test('02 — scorePolicy SHA-256 baseline fingerprint', () => {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(SCORE_POLICY)).digest('hex');
  assert.strictEqual(hash, FROZEN_SCORE_POLICY_SHA256);
});

test('03 — runtime manifest presente', () => {
  assert.ok(fs.existsSync(MANIFEST), 'SECURITY_RECON_RUNTIME_MANIFEST.json missing');
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  assert.ok(Array.isArray(m) && m.length >= 20);
});

test('04 — IP equivalence suite', () => runSuite('scripts/sec-anti-recon-ip-equivalence.js'));
test('05 — SEC-ANTI-RECON-002 suite', () => runSuite('src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_002.test.js'));
test('06 — SEC-ANTI-RECON-003 suite', () => runSuite('src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_003.test.js'));
test('07 — SEC-ANTI-RECON-004 suite', () => runSuite('src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_004.test.js'));

test('08 — flag false → guard no-op', () => {
  const prev = process.env.SECURITY_RECON_CORRELATION;
  process.env.SECURITY_RECON_CORRELATION = 'false';
  delete require.cache[require.resolve('../../securityRecon/config/securityReconFlags')];
  delete require.cache[require.resolve('../../securityRecon/guard/validatedIdentityReconGuard')];
  const flags = require('../../securityRecon/config/securityReconFlags');
  const guard = require('../../securityRecon/guard/validatedIdentityReconGuard');
  assert.strictEqual(flags.isSecurityReconCorrelationEnabled(), false);
  const req = { user: { id: 1 }, originalUrl: '/api/x' };
  const res = { status() { return this; }, setHeader() {}, json() {} };
  assert.strictEqual(guard.runValidatedIdentityReconGuard(req, res, {}), true);
  process.env.SECURITY_RECON_CORRELATION = prev;
});

test('09 — timingSafeEqual preservado', () => {
  const { timingSafeEqualHex, hashEdgeToken } = require('../../services/edgeTokenCrypto');
  const t = hashEdgeToken('test-token-sec-baseline-001');
  assert.strictEqual(timingSafeEqualHex(t, t), true);
  assert.strictEqual(timingSafeEqualHex(t, hashEdgeToken('other-token-sec-baseline-001')), false);
  assert.strictEqual(timingSafeEqualHex(t, 'short'), false);
});

console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
