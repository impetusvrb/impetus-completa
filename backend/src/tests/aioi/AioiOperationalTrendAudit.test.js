/**
 * AIOI-P4.4 — Operational Trend Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');

function readDoc(n) { return fs.existsSync(path.join(DOCS, n)) ? fs.readFileSync(path.join(DOCS, n), 'utf8') : null; }
function readSrc(r) { return fs.existsSync(path.join(SRC, r)) ? fs.readFileSync(path.join(SRC, r), 'utf8') : null; }

const trends = require('../../services/aioi/aioiOperationalTrendService');

const TREND_METRICS = [
  'throughput_trend', 'latency_trend', 'sla_trend',
  'dlq_trend', 'health_trend', 'tenant_trend'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P4.4 — Operational Trend Audit\n');

  await test('OT-DOC: spec existe', () => assert(readDoc('AIOI_OPERATIONAL_TRENDS_SPECIFICATION.md')));
  await test('OT-01: captureTrendSnapshot', () => assert(typeof trends.captureTrendSnapshot === 'function'));
  await test('OT-02: getOperationalTrends', () => assert(typeof trends.getOperationalTrends === 'function'));
  await test('OT-03: getTrendSnapshots', () => assert(typeof trends.getTrendSnapshots === 'function'));

  for (const t of TREND_METRICS) {
    await test(`OT-TREND: ${t}`, () => assert(readSrc('services/aioi/aioiOperationalTrendService.js').includes(t)));
  }

  await test('OT-04: trend snapshot após capture', async () => {
    trends.resetTrendSnapshots();
    await trends.captureTrendSnapshot();
    const r = trends.getOperationalTrends();
    assert.strictEqual(r.snapshot_count, 1);
    assert(r.trends);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
