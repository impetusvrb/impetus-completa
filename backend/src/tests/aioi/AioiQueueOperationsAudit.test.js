/**
 * AIOI-P2.2 — Queue Operations Audit (PC-PROD-02)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');

function readSrc(r) { const p = path.join(SRC, r); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }

const outboxConsumer = require('../../services/aioi/aioiOutboxConsumerService');

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P2.2 — Queue Operations Audit\n');

  const svc = readSrc('services/aioi/aioiOutboxConsumerService.js');

  await test('QO-01: pending → processing', () => {
    assert(svc.includes("status = 'processing'"));
    assert(svc.includes("status = 'pending'") || svc.includes("WHERE status = 'pending'"));
  });

  await test('QO-02: processing → delivered', () => {
    assert(svc.includes("status       = 'delivered'"));
    assert(svc.includes("status     = 'processing'"));
  });

  await test('QO-03: processing → failed (via retry path)', () => {
    assert(svc.includes('markFailedOrRetry'));
    assert(svc.includes("'failed'"));
    assert(svc.includes("'pending'"));
  });

  await test('QO-04: DLQ após MAX_ATTEMPTS', () => {
    assert(outboxConsumer.MAX_ATTEMPTS === 3);
    assert(svc.includes('newAttempts > MAX_ATTEMPTS') || svc.includes('> MAX_ATTEMPTS'));
  });

  await test('QO-05: sem double pick (SKIP LOCKED)', () => {
    assert(svc.includes('FOR UPDATE SKIP LOCKED'));
  });

  await test('QO-06: SKIP LOCKED preservado', () => {
    assert(svc.includes('FOR UPDATE SKIP LOCKED'));
  });

  await test('QO-07: correlation_id preservado (fetch IOE + outbox schema)', () => {
    assert(svc.includes('correlation_id'));
    const migration = fs.readFileSync(
      path.join(BACKEND_ROOT, 'migrations/aioi_outbox_foundation_migration.sql'),
      'utf8'
    );
    assert(migration.includes('correlation_id'));
  });

  await test('QO-08: evidence_refs preservados no fetch IOE', () => {
    assert(svc.includes('evidence_refs'));
  });

  await test('QO-09: Backoff governance', () => {
    assert(Array.isArray(outboxConsumer.BACKOFF_MINUTES));
    assert(outboxConsumer.BACKOFF_MINUTES.length >= 3);
  });

  await test('QO-10: Classification consumer usa outbox consumer', () => {
    const cls = readSrc('services/aioi/aioiClassificationConsumerService.js');
    assert(cls.includes('aioiOutboxConsumerService'));
    assert(cls.includes('pickBatch'));
    assert(cls.includes('markDelivered'));
    assert(cls.includes('markFailedOrRetry'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
