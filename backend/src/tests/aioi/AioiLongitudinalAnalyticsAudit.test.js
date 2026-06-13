/**
 * AIOI-P6.3 — Longitudinal Analytics Audit
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
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

const longitudinal = require('../../services/aioi/aioiLongitudinalAnalyticsService');

const WINDOWS = ['30d', '60d', '90d'];
const METRICS = ['throughput', 'latency', 'sla', 'health', 'dlq', 'compliance', 'trend_evolution'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P6.3 — Longitudinal Analytics Audit\n');

  await test('LA-DOC: spec existe', () => assert(readDoc('AIOI_LONGITUDINAL_ANALYTICS_SPECIFICATION.md')));
  await test('LA-01: getLongitudinalAnalytics', () => assert(typeof longitudinal.getLongitudinalAnalytics === 'function'));

  for (const w of WINDOWS) {
    await test(`LA-WINDOW: ${w}`, () => assert(readSrc('services/aioi/aioiLongitudinalAnalyticsService.js').includes(`'${w}'`)));
  }

  for (const m of METRICS) {
    await test(`LA-METRIC: ${m}`, () => assert(readSrc('services/aioi/aioiLongitudinalAnalyticsService.js').includes(m)));
  }

  await test('LA-02: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiLongitudinalAnalyticsService.js'));
    assert(!c.includes('UPDATE industrial_operational_events'));
    assert(!c.includes('INSERT INTO'));
  });

  await test('LA-03: getLongitudinalAnalytics executa', async () => {
    const r = await longitudinal.getLongitudinalAnalytics();
    assert(r.windows);
    assert(r.throughput);
    assert(r.trend_evolution);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
