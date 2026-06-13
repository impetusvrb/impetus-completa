/**
 * AIOI-P2.3 — Operational Observability Audit (PC-PROD-03)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');

function readDoc(n) { const p = path.join(DOCS, n); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function readSrc(r) { const p = path.join(SRC, r); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

const REQUIRED_METRICS = [
  'worker_status', 'outbox_pending', 'outbox_processing', 'outbox_delivered',
  'outbox_failed', 'dlq_count', 'classification_rate', 'decision_rate',
  'execution_rate', 'learning_rate', 'sla_breached', 'sla_at_risk'
];

(async () => {
  console.log('\n  AIOI-P2.3 — Operational Observability Audit\n');

  await test('OBS-DOC: AIOI_OPERATIONAL_OBSERVABILITY_SPECIFICATION.md', () => {
    assert(readDoc('AIOI_OPERATIONAL_OBSERVABILITY_SPECIFICATION.md'));
  });

  await test('OBS-01: aioiOperationalMetricsService.js existe', () => {
    assert(readSrc('services/aioi/aioiOperationalMetricsService.js'));
  });

  await test('OBS-02: aioiOperationalHealthService.js existe', () => {
    assert(readSrc('services/aioi/aioiOperationalHealthService.js'));
  });

  await test('OBS-03: aioiOperationalTelemetryService.js existe', () => {
    assert(readSrc('services/aioi/aioiOperationalTelemetryService.js'));
  });

  for (const metric of REQUIRED_METRICS) {
    await test(`OBS-METRIC: ${metric}`, () => {
      const c = readSrc('services/aioi/aioiOperationalMetricsService.js');
      assert(c.includes(metric), `Métrica ${metric} ausente`);
    });
  }

  await test('OBS-04: Sem F47 rebuild', () => {
    const files = [
      'aioiOperationalMetricsService.js',
      'aioiOperationalHealthService.js',
      'aioiOperationalTelemetryService.js'
    ];
    for (const f of files) {
      const c = stripComments(readSrc(`services/aioi/${f}`)).toLowerCase();
      assert(!c.includes('f47') && !c.includes('priority_queue'));
    }
  });

  await test('OBS-05: Sem LLM', () => {
    const files = [
      'aioiOperationalMetricsService.js',
      'aioiOperationalHealthService.js',
      'aioiOperationalTelemetryService.js'
    ];
    for (const f of files) {
      const c = stripComments(readSrc(`services/aioi/${f}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic'));
    }
  });

  await test('OBS-06: Telemetria ring buffer', () => {
    const c = readSrc('services/aioi/aioiOperationalTelemetryService.js');
    assert(c.includes('getRecentEvents'));
    assert(c.includes('MAX_EVENTS'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
