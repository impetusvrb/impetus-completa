/**
 * AIOI-P2.4 — Operational Health Audit (PC-PROD-04)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');

function readSrc(r) { const p = path.join(SRC, r); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

const healthService = require('../../services/aioi/aioiOperationalHealthService');

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P2.4 — Operational Health Audit\n');

  await test('HL-01: GET /api/aioi/health route', () => {
    const routes = readSrc('routes/aioi/aioiQueueRoutes.js');
    assert(routes.includes("'/health'"));
    assert(routes.includes('aioiHealthController'));
  });

  await test('HL-02: Health controller existe', () => {
    assert(readSrc('controllers/aioi/aioiHealthController.js'));
  });

  await test('HL-03: getHealthSnapshot exportado', () => {
    assert(typeof healthService.getHealthSnapshot === 'function');
  });

  await test('HL-04: Campos obrigatórios no health service', () => {
    const c = readSrc('services/aioi/aioiOperationalHealthService.js');
    for (const field of ['aioi_enabled', 'queue_active', 'worker_running', 'outbox_pending', 'outbox_failed', 'dlq_count', 'status']) {
      assert(c.includes(field), `Campo ${field} ausente`);
    }
  });

  await test('HL-05: Status HEALTHY / DEGRADED / STANDBY', () => {
    const c = readSrc('services/aioi/aioiOperationalHealthService.js');
    assert(c.includes('HEALTHY'));
    assert(c.includes('DEGRADED'));
    assert(c.includes('STANDBY'));
  });

  await test('HL-06: Sem reconstruir filas', () => {
    const c = stripComments(readSrc('services/aioi/aioiOperationalHealthService.js'));
    assert(!c.toLowerCase().includes('rebuild') && !c.toLowerCase().includes('priority_queue'));
  });

  await test('HL-07: Cache-Control no-store', () => {
    const c = readSrc('controllers/aioi/aioiHealthController.js');
    assert(c.includes('Cache-Control'));
    assert(c.includes('no-store'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
