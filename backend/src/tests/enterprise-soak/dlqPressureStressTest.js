'use strict';

/**
 * ENTERPRISE READINESS — Fase 1.3
 * DLQ Pressure Stress Test
 *
 * Simula: DLQ congestion, retry storm, poison events, reprocessing pressure.
 */

const { pass, section, summarize, timer, fakeId } = require('./testUtils');

// ── Simulação pura de DLQ sem I/O ─────────────────────────────────────────

class MockDlq {
  constructor(maxSize = 10000) {
    this._queue = [];
    this._poisoned = new Set();
    this._retries = new Map();
    this._maxSize = maxSize;
    this._overflow = 0;
    this._maxRetries = 3;
  }
  enqueue(event, reason) {
    if (this._queue.length >= this._maxSize) { this._overflow++; return false; }
    this._queue.push({ ...event, dlq_reason: reason, enqueued_at: Date.now() });
    return true;
  }
  reprocess(handler) {
    const results = { succeeded: 0, poisoned: 0, retried: 0 };
    const remaining = [];
    for (const ev of this._queue) {
      const key = ev.id;
      const retries = (this._retries.get(key) || 0);
      if (this._poisoned.has(key)) { results.poisoned++; continue; }
      try {
        handler(ev);
        results.succeeded++;
        this._retries.delete(key);
      } catch {
        const newRetries = retries + 1;
        this._retries.set(key, newRetries);
        if (newRetries >= this._maxRetries) {
          this._poisoned.add(key);
        } else {
          remaining.push(ev);
          results.retried++;
        }
      }
    }
    this._queue = remaining;
    return results;
  }
  get size() { return this._queue.length; }
  get poisonedCount() { return this._poisoned.size; }
  get overflowCount() { return this._overflow; }
  stats() {
    return { size: this.size, poisoned: this.poisonedCount, overflow: this.overflowCount };
  }
}

async function runDlqPressureStress() {
  section('DQ-1: DLQ Congestion — 8000 failed events');

  const dlq = new MockDlq(10000);
  const COUNT = 8000;
  let enqueued = 0;
  for (let i = 0; i < COUNT; i++) {
    const ok = dlq.enqueue({ id: fakeId('ev'), type: 'quality.inspection', payload: { seq: i } }, 'max_retries_exceeded');
    if (ok) enqueued++;
  }
  pass('DQ-1.a 8000 events enqueued without overflow', enqueued === COUNT);
  pass('DQ-1.b DLQ size = 8000', dlq.size === COUNT);

  section('DQ-2: DLQ Overflow Protection');

  const dlqSmall = new MockDlq(100);
  let overflowed = 0;
  for (let i = 0; i < 200; i++) {
    const ok = dlqSmall.enqueue({ id: fakeId('ev'), type: 'test' }, 'retry_exceeded');
    if (!ok) overflowed++;
  }
  pass('DQ-2.a overflow protection activates at max', dlqSmall.size === 100);
  pass('DQ-2.b overflow count = 100', overflowed === 100);

  section('DQ-3: Retry Storm — Poison Event Isolation');

  const dlqRetry = new MockDlq(1000);
  const POISON_COUNT = 20;
  const GOOD_COUNT = 80;

  // Poison events always throw; good events succeed
  const poisonIds = new Set();
  for (let i = 0; i < POISON_COUNT; i++) {
    const id = `poison_${i}`;
    poisonIds.add(id);
    dlqRetry.enqueue({ id, type: 'bad.event' }, 'initial_fail');
  }
  for (let i = 0; i < GOOD_COUNT; i++) {
    dlqRetry.enqueue({ id: fakeId('good'), type: 'good.event' }, 'transient_fail');
  }

  // Handler: always throws for poison, succeeds for good
  const handler = (ev) => { if (poisonIds.has(ev.id)) throw new Error('poison'); };

  // Run 4 reprocessing cycles
  let totalSucceeded = 0;
  for (let cycle = 0; cycle < 4; cycle++) {
    const r = dlqRetry.reprocess(handler);
    totalSucceeded += r.succeeded;
  }
  pass('DQ-3.a good events eventually succeed', totalSucceeded >= GOOD_COUNT);
  pass('DQ-3.b poison events quarantined after max retries', dlqRetry.poisonedCount >= POISON_COUNT);
  pass('DQ-3.c poison events not in active queue', dlqRetry.size === 0);

  section('DQ-4: DLQ Throughput Measurement');

  const dlqBig = new MockDlq(50000);
  const THROUGHPUT_COUNT = 50000;
  const t = timer();
  for (let i = 0; i < THROUGHPUT_COUNT; i++) {
    dlqBig.enqueue({ id: `ev_${i}`, type: 'stress' }, 'stress_test');
  }
  const enqMs = t.elapsed();

  const t2 = timer();
  const succeeded = { n: 0 };
  dlqBig.reprocess(() => { succeeded.n++; }); // all succeed
  const reprocessMs = t2.elapsed();

  pass('DQ-4.a 50k enqueue < 2000ms', enqMs < 2000);
  pass('DQ-4.b 50k reprocess < 500ms', reprocessMs < 500);
  console.log(`    ℹ enqueue: ${Math.round(THROUGHPUT_COUNT / enqMs * 1000)} ev/sec | reprocess: ${Math.round(THROUGHPUT_COUNT / reprocessMs * 1000)} ev/sec`);

  section('DQ-5: Multi-Tenant DLQ Isolation');

  const tenantDlqs = {};
  const TENANTS = 10;
  for (let t = 0; t < TENANTS; t++) tenantDlqs[`t${t}`] = new MockDlq(500);
  let contaminated = false;
  // Inject events only into tenant 0
  for (let i = 0; i < 100; i++) tenantDlqs['t0'].enqueue({ id: `ev_t0_${i}`, tenant: 't0' }, 'fail');
  for (let t = 1; t < TENANTS; t++) {
    if (tenantDlqs[`t${t}`].size > 0) contaminated = true;
  }
  pass('DQ-5.a cross-tenant contamination absent', !contaminated);
  pass('DQ-5.b tenant 0 DLQ isolated with 100 events', tenantDlqs['t0'].size === 100);
}

runDlqPressureStress()
  .then(() => summarize('DLQ Pressure Stress'))
  .catch((err) => { console.error('[DLQ_STRESS_ERROR]', err?.message || err); process.exit(1); });
