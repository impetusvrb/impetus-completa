#!/usr/bin/env node
'use strict';

/**
 * Teste comparativo legacy vs canónico — IMPETUS-SEC-ANTI-RECON-002 Fase B.
 * node backend/scripts/sec-anti-recon-ip-equivalence.js
 */

const assert = require('assert');
const {
  resolveLegacyClientIp,
  resolveCanonicalClientIp,
  resolveClientIpComparison
} = require('../src/services/clientIpResolver');

function mockReq(opts = {}) {
  const headers = { ...(opts.headers || {}) };
  return {
    ip: opts.ip,
    headers,
    get(name) {
      const k = String(name).toLowerCase();
      return headers[k] || headers[name];
    },
    socket: { remoteAddress: opts.remoteAddress || '127.0.0.1' }
  };
}

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

console.log('\n  SEC-ANTI-RECON-002 — IP equivalence regression\n');

test('loopback directo — canónico 127.0.0.1', () => {
  const req = mockReq({ remoteAddress: '127.0.0.1' });
  const c = resolveCanonicalClientIp(req);
  assert.strictEqual(c.clientIp, '127.0.0.1');
  assert.ok(c.resolutionSource === 'socket' || c.resolutionSource === 'socket-via-proxy');
});

test('IPv4-mapped loopback normalizado', () => {
  const req = mockReq({ remoteAddress: '::ffff:127.0.0.1' });
  const c = resolveCanonicalClientIp(req);
  assert.strictEqual(c.clientIp, '127.0.0.1');
});

test('proxy confiável + XFF — IP real do cliente', () => {
  const req = mockReq({
    remoteAddress: '127.0.0.1',
    headers: { 'x-forwarded-for': '203.0.113.50, 127.0.0.1' }
  });
  const c = resolveCanonicalClientIp(req);
  assert.strictEqual(c.clientIp, '203.0.113.50');
  assert.strictEqual(c.trustedProxy, true);
});

test('XFF falsificado sem proxy confiável — ignora XFF', () => {
  const req = mockReq({
    remoteAddress: '203.0.113.99',
    headers: { 'x-forwarded-for': '1.2.3.4' }
  });
  const c = resolveCanonicalClientIp(req);
  assert.strictEqual(c.clientIp, '203.0.113.99');
  assert.strictEqual(c.spoofRisk, true);
});

test('X-Real-IP via proxy confiável', () => {
  const req = mockReq({
    remoteAddress: '127.0.0.1',
    headers: { 'x-real-ip': '2804:2980::1' }
  });
  const c = resolveCanonicalClientIp(req);
  assert.strictEqual(c.clientIp, '2804:2980::1');
});

test('comparação legacy vs canónico — proxy confiável', () => {
  const req = mockReq({
    remoteAddress: '127.0.0.1',
    headers: { 'x-forwarded-for': '203.0.113.50' }
  });
  const cmp = resolveClientIpComparison(req);
  assert.strictEqual(cmp.resolutionMatch, true);
});

test('comparação — spoof detectado (legacy aceitaria XFF)', () => {
  const req = mockReq({
    remoteAddress: '203.0.113.99',
    headers: { 'x-forwarded-for': '1.2.3.4' }
  });
  const cmp = resolveClientIpComparison(req);
  assert.strictEqual(cmp.legacyResolvedIp, '1.2.3.4');
  assert.strictEqual(cmp.canonicalResolvedIp, '203.0.113.99');
  assert.strictEqual(cmp.resolutionMatch, false);
});

console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
