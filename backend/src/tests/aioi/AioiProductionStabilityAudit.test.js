/**
 * AIOI-P3.5 — Production Stability Audit
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

const stabilityService = require('../../services/aioi/aioiProductionStabilityService');

const REQUIRED = [
  'worker_uptime', 'restart_count', 'processing_cycles', 'failed_cycles',
  'health_transitions', 'average_batch_duration', 'average_processing_latency'
];

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P3.5 — Production Stability Audit\n');

  await test('ST-DOC: AIOI_PRODUCTION_STABILITY_SPECIFICATION.md', () => {
    assert(readDoc('AIOI_PRODUCTION_STABILITY_SPECIFICATION.md'));
  });

  await test('ST-01: aioiProductionStabilityService.js existe', () => {
    assert(readSrc('services/aioi/aioiProductionStabilityService.js'));
  });

  for (const metric of REQUIRED) {
    await test(`ST-METRIC: ${metric}`, () => {
      assert(readSrc('services/aioi/aioiProductionStabilityService.js').includes(metric));
    });
  }

  await test('ST-02: getStabilitySnapshot exportado', () => {
    assert(typeof stabilityService.getStabilitySnapshot === 'function');
  });

  await test('ST-03: Worker integração recordCycle', () => {
    const c = readSrc('services/aioi/aioiOutboxWorkerService.js');
    assert(c.includes('recordCycle'));
    assert(c.includes('productionStability'));
  });

  await test('ST-04: Health integração recordHealthTransition', () => {
    const c = readSrc('services/aioi/aioiOperationalHealthService.js');
    assert(c.includes('recordHealthTransition'));
  });

  await test('ST-05: recordRestart em restartWorker', () => {
    const c = readSrc('services/aioi/aioiOutboxWorkerService.js');
    assert(c.includes('recordRestart'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
