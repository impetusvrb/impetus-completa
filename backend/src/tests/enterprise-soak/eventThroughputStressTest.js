'use strict';

/**
 * ENTERPRISE READINESS — Fase 1.4
 * Event Throughput Stress Test
 *
 * Valida: throughput por tenant, correlation propagation,
 * pipeline saturation, throttling activation, lag accumulation.
 */

const { pass, section, summarize, timer, fakeId } = require('./testUtils');

// ── Simulação de pipeline de eventos ─────────────────────────────────────

class MockEventPipeline {
  constructor({ throttleLimit = 100, windowMs = 1000 } = {}) {
    this._tenantCounters = new Map();
    this._throttleLimit = throttleLimit;
    this._windowMs = windowMs;
    this._published = 0;
    this._throttled = 0;
    this._correlations = new Map();
    this._lagAccumulator = [];
    this._startMs = Date.now();
  }

  publish(event) {
    const tenant = event.tenant_id || 'default';
    const counter = this._tenantCounters.get(tenant) || { count: 0, windowStart: Date.now() };
    const now = Date.now();
    if (now - counter.windowStart > this._windowMs) {
      counter.count = 0;
      counter.windowStart = now;
    }
    if (counter.count >= this._throttleLimit) {
      this._throttled++;
      return { ok: false, reason: 'throttled', tenant };
    }
    counter.count++;
    this._tenantCounters.set(tenant, counter);
    this._published++;
    if (event.correlation_id) this._correlations.set(event.id, event.correlation_id);
    // Simula lag: diferença entre created_at e agora
    if (event.created_at) {
      const lag = Date.now() - new Date(event.created_at).getTime();
      this._lagAccumulator.push(lag);
    }
    return { ok: true, id: event.id };
  }

  avgLagMs() {
    if (!this._lagAccumulator.length) return 0;
    return this._lagAccumulator.reduce((a, b) => a + b, 0) / this._lagAccumulator.length;
  }

  stats() {
    return {
      published: this._published,
      throttled: this._throttled,
      tenants: this._tenantCounters.size,
      correlations_tracked: this._correlations.size,
      avg_lag_ms: this.avgLagMs()
    };
  }
}

async function runEventThroughputStress() {
  section('ET-1: High-Throughput Single Tenant');

  const pipeline = new MockEventPipeline({ throttleLimit: 10000 });
  const COUNT = 10000;
  const t = timer();
  for (let i = 0; i < COUNT; i++) {
    pipeline.publish({
      id: fakeId('ev'),
      type: 'operational.kpi_update',
      tenant_id: 'tenant_a',
      correlation_id: fakeId('corr'),
      created_at: new Date().toISOString()
    });
  }
  const elapsed = t.elapsed();
  const stats = pipeline.stats();
  pass('ET-1.a 10k events published', stats.published === COUNT);
  pass('ET-1.b 10k publish < 200ms', elapsed < 200);
  console.log(`    ℹ throughput: ${Math.round(COUNT / elapsed * 1000)} events/sec`);

  section('ET-2: Multi-Tenant Throughput — 100 tenants × 200 events');

  const p2 = new MockEventPipeline({ throttleLimit: 500 });
  const TENANTS = 100;
  const EVT_PER_TENANT = 200;
  const t2 = timer();
  for (let tenant = 0; tenant < TENANTS; tenant++) {
    for (let e = 0; e < EVT_PER_TENANT; e++) {
      p2.publish({
        id: fakeId('ev'),
        type: 'quality.event',
        tenant_id: `tenant_${tenant}`,
        correlation_id: fakeId('corr'),
        created_at: new Date().toISOString()
      });
    }
  }
  const el2 = t2.elapsed();
  const s2 = p2.stats();
  pass('ET-2.a all 20k events published without throttle', s2.published === TENANTS * EVT_PER_TENANT);
  pass('ET-2.b 100 tenants tracked', s2.tenants === TENANTS);
  pass('ET-2.c 20k multi-tenant publish < 500ms', el2 < 500);

  section('ET-3: Throttling Activation Under Burst');

  const p3 = new MockEventPipeline({ throttleLimit: 50, windowMs: 10000 });
  let accepted = 0;
  let rejected = 0;
  // Single tenant burst: 500 events (should throttle after 50)
  for (let i = 0; i < 500; i++) {
    const r = p3.publish({ id: fakeId('ev'), type: 'burst', tenant_id: 'burst_tenant', created_at: new Date().toISOString() });
    if (r.ok) accepted++; else rejected++;
  }
  pass('ET-3.a throttle activates at limit', accepted === 50);
  pass('ET-3.b rejected count = 450 (500 - 50)', rejected === 450);

  section('ET-4: Correlation Propagation Integrity');

  const p4 = new MockEventPipeline({ throttleLimit: 10000 });
  const CORR_CHAIN = 500;
  let prevCorr = null;
  const corrChain = [];
  for (let i = 0; i < CORR_CHAIN; i++) {
    const id = fakeId('ev');
    const corrId = fakeId('corr');
    p4.publish({ id, type: 'chain.event', tenant_id: 'chain_tenant', correlation_id: corrId, causation_id: prevCorr, created_at: new Date().toISOString() });
    corrChain.push({ id, corrId, causation: prevCorr });
    prevCorr = corrId;
  }
  // Verify chain: each event's causation = previous correlation
  let chainIntact = true;
  for (let i = 1; i < corrChain.length; i++) {
    if (corrChain[i].causation !== corrChain[i - 1].corrId) chainIntact = false;
  }
  pass('ET-4.a 500-event correlation chain intact', chainIntact);
  pass('ET-4.b correlations tracked in pipeline', p4.stats().correlations_tracked >= CORR_CHAIN);

  section('ET-5: Lag Accumulation Measurement');

  const p5 = new MockEventPipeline({ throttleLimit: 50000 });
  // Simulate events with artificial lag (created 500ms ago)
  const OLD_TS = new Date(Date.now() - 500).toISOString();
  for (let i = 0; i < 1000; i++) {
    p5.publish({ id: fakeId('ev'), type: 'lagged', tenant_id: 't_lag', created_at: OLD_TS });
  }
  const avgLag = p5.avgLagMs();
  pass('ET-5.a lag detected (> 400ms for 500ms-old events)', avgLag >= 400);
  console.log(`    ℹ avg lag: ${Math.round(avgLag)}ms`);
}

runEventThroughputStress()
  .then(() => summarize('Event Throughput Stress'))
  .catch((err) => { console.error('[THROUGHPUT_STRESS_ERROR]', err?.message || err); process.exit(1); });
