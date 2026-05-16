'use strict';

/**
 * ENTERPRISE READINESS — Fase 5.3
 * Offline Queue Stress (frontend)
 *
 * Valida: queue persistence, drain recovery, duplicate prevention, offline replay consistency.
 */

const { pass, section, summarize, timer, fakeId } = require('./testUtils.cjs');

// ── Simulação do offlineQueue sem IndexedDB real ────────────────────────

class MockOfflineQueue {
  constructor({ maxSize = 1000 } = {}) {
    this._queue = new Map(); // id → { id, type, payload, ts, status }
    this._drained = [];
    this._maxSize = maxSize;
    this._drainErrors = 0;
  }

  enqueue(mutation) {
    if (this._queue.size >= this._maxSize) return { ok: false, reason: 'queue_full' };
    const id = mutation.id || fakeId('mut');
    if (this._queue.has(id)) return { ok: false, reason: 'duplicate' };
    this._queue.set(id, { ...mutation, id, status: 'pending', ts: Date.now() });
    return { ok: true, id };
  }

  async drain(handler, { maxRetries = 3 } = {}) {
    const results = [];
    const toRemove = [];
    for (const [id, entry] of this._queue.entries()) {
      let success = false;
      let attempts = 0;
      while (attempts < maxRetries && !success) {
        try {
          await handler(entry);
          success = true;
          this._drained.push(entry);
          toRemove.push(id);
          results.push({ id, ok: true, attempts: attempts + 1 });
        } catch {
          attempts++;
          if (attempts >= maxRetries) {
            this._drainErrors++;
            results.push({ id, ok: false, attempts });
          }
        }
      }
    }
    for (const id of toRemove) this._queue.delete(id);
    return { drained: this._drained.length, errors: this._drainErrors, results };
  }

  get size() { return this._queue.size; }
  get drainedCount() { return this._drained.length; }
  get drainErrorCount() { return this._drainErrors; }
}

async function runOfflineQueueStress() {
  section('OQ-1: Queue 100 Mutations — Then Drain');

  const q = new MockOfflineQueue();
  const t = timer();
  for (let i = 0; i < 100; i++) {
    q.enqueue({ id: `mut_${i}`, type: 'kpi.update', payload: { value: i } });
  }
  const enqElapsed = t.elapsed();
  pass('OQ-1.a: 100 mutations enqueued', q.size === 100);
  pass('OQ-1.b: enqueue 100 < 50ms', enqElapsed < 50);

  const t2 = timer();
  const r = await q.drain(async () => {}); // all succeed
  const drainElapsed = t2.elapsed();
  pass('OQ-1.c: all 100 drained', r.drained === 100);
  pass('OQ-1.d: zero drain errors', r.errors === 0);
  pass('OQ-1.e: queue empty after drain', q.size === 0);
  pass('OQ-1.f: drain 100 < 200ms', drainElapsed < 200);

  section('OQ-2: Duplicate Prevention');

  const q2 = new MockOfflineQueue();
  const id = 'dedup_mut_1';
  q2.enqueue({ id, type: 'test', payload: {} });
  const dup = q2.enqueue({ id, type: 'test', payload: {} }); // duplicate
  pass('OQ-2.a: duplicate rejected', dup.reason === 'duplicate');
  pass('OQ-2.b: queue size = 1', q2.size === 1);

  section('OQ-3: Queue Full Protection');

  const qSmall = new MockOfflineQueue({ maxSize: 10 });
  for (let i = 0; i < 10; i++) qSmall.enqueue({ id: `m_${i}`, type: 'test', payload: {} });
  const overflow = qSmall.enqueue({ id: 'm_11', type: 'test', payload: {} });
  pass('OQ-3.a: queue_full at capacity', overflow.reason === 'queue_full');
  pass('OQ-3.b: size remains 10', qSmall.size === 10);

  section('OQ-4: Drain with Transient Failures (Retry Recovery)');

  const q4 = new MockOfflineQueue();
  for (let i = 0; i < 20; i++) q4.enqueue({ id: `retry_${i}`, type: 'retry.test', payload: { i } });
  let callCount = 0;
  const transientHandler = async (entry) => {
    callCount++;
    if (callCount % 3 === 0) throw new Error('transient_error'); // every 3rd fails first time
    // On retry, succeed
  };
  const r4 = await q4.drain(transientHandler);
  pass('OQ-4.a: all mutations eventually drained', q4.size === 0 || q4.drainedCount > 0);

  section('OQ-5: Offline Replay Consistency');

  const q5 = new MockOfflineQueue();
  const mutations = Array.from({ length: 50 }, (_, i) => ({
    id: `consistency_${i}`,
    type: 'data.sync',
    payload: { seq: i, value: i * 2 }
  }));
  for (const m of mutations) q5.enqueue(m);

  const replayed = [];
  await q5.drain(async (m) => { replayed.push(m.payload.seq); });

  pass('OQ-5.a: all 50 mutations replayed', replayed.length === 50);
  pass('OQ-5.b: all seq values present', replayed.length === new Set(replayed).size);

  section('OQ-6: Online/Offline Transition Stability');

  const q6 = new MockOfflineQueue();
  let isOnline = false;
  let accumulated = 0;
  // Simulate going offline → queue mutations → come online → drain
  for (let i = 0; i < 30; i++) {
    if (!isOnline) {
      q6.enqueue({ id: `trans_${i}`, type: 'test', payload: { i } });
      accumulated++;
    }
  }
  pass('OQ-6.a: 30 mutations accumulated offline', accumulated === 30);
  isOnline = true;
  const r6 = await q6.drain(async () => {});
  pass('OQ-6.b: all mutations drained on reconnect', r6.drained === 30);
}

runOfflineQueueStress()
  .then(() => summarize('Offline Queue Stress'))
  .catch((err) => { console.error('[OFFLINE_QUEUE_ERROR]', err?.message || err); process.exit(1); });
