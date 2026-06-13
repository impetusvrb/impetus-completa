/**
 * AIOI-P2.1 — Worker Governance Audit (PC-PROD-01)
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

const worker = require('../../services/aioi/aioiOutboxWorkerService');

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P2.1 — Worker Governance Audit\n');

  await test('WG-DOC: AIOI_WORKER_GOVERNANCE_CONTRACT.md existe', () => {
    assert(readDoc('AIOI_WORKER_GOVERNANCE_CONTRACT.md'));
  });

  await test('WG-01: setInterval controlado', () => {
    const c = readSrc('services/aioi/aioiOutboxWorkerService.js');
    assert(c.includes('setInterval'));
    assert(c.includes('IMPETUS_AIOI_OUTBOX_WORKER_INTERVAL_MS'));
    assert(c.includes('clearInterval'));
  });

  await test('WG-02: single instance lock (advisory lock)', () => {
    const c = readSrc('services/aioi/aioiOutboxWorkerService.js');
    assert(c.includes('pg_try_advisory_lock'));
    assert(c.includes('pg_advisory_unlock'));
    assert(worker.ADVISORY_LOCK_KEY);
  });

  await test('WG-03: safe shutdown', () => {
    assert(typeof worker.stopWorker === 'function');
    const c = readSrc('services/aioi/aioiOutboxWorkerService.js');
    assert(c.includes('registerShutdownHandlers'));
    assert(c.includes('SIGTERM'));
    assert(c.includes('SIGINT'));
  });

  await test('WG-04: graceful restart', () => {
    assert(typeof worker.restartWorker === 'function');
  });

  await test('WG-05: batch processing configurável', () => {
    const c = readSrc('services/aioi/aioiOutboxWorkerService.js');
    assert(c.includes('IMPETUS_AIOI_OUTBOX_BATCH_SIZE'));
    assert(c.includes('processClassificationBatch'));
  });

  await test('WG-06: retry governance preservada (consumer inalterado)', () => {
    const consumer = readSrc('services/aioi/aioiOutboxConsumerService.js');
    assert(consumer.includes('markFailedOrRetry'));
    assert(consumer.includes('BACKOFF_MINUTES'));
  });

  await test('WG-07: DLQ preservada (MAX_ATTEMPTS → failed)', () => {
    const consumer = readSrc('services/aioi/aioiOutboxConsumerService.js');
    assert(consumer.includes('MAX_ATTEMPTS'));
    assert(consumer.includes("'failed'"));
  });

  await test('WG-08: RLS preservado', () => {
    const consumer = readSrc('services/aioi/aioiOutboxConsumerService.js');
    assert(consumer.includes('app.current_company_id'));
    assert(consumer.includes("app.bypass_rls', 'false'"));
  });

  await test('WG-09: company isolation (pilot tenants)', () => {
    const c = readSrc('services/aioi/aioiOutboxWorkerService.js');
    assert(c.includes('getPilotTenants') || c.includes('pilotFlags'));
    assert(c.includes('aioiPilotFlags'));
  });

  await test('WG-10: idempotência (SKIP LOCKED no consumer)', () => {
    const consumer = readSrc('services/aioi/aioiOutboxConsumerService.js');
    assert(consumer.includes('FOR UPDATE SKIP LOCKED'));
  });

  await test('WG-11: Sem LLM / execução autónoma no worker', () => {
    const c = stripComments(readSrc('services/aioi/aioiOutboxWorkerService.js')).toLowerCase();
    assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic'));
    assert(!c.includes('executionbridge') && !c.includes('learningbridge'));
  });

  await test('WG-12: Ativação explícita via flags', () => {
    const c = readSrc('services/aioi/aioiOutboxWorkerService.js');
    assert(c.includes('IMPETUS_AIOI_OUTBOX_WORKER_ENABLED'));
    assert(c.includes('IMPETUS_AIOI_ENABLED'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
