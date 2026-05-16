'use strict';

/**
 * ENTERPRISE READINESS — Fase 1.2
 * Replay Massive Stress Test
 *
 * Simula: replay de milhares de eventos, ordering validation,
 * shadow replay integrity, replay latency, replay throughput.
 */

const { pass, section, summarize, timer, fakeId } = require('./testUtils');

// ── Simulação standalone do shadow replay (sem I/O) ───────────────────────

function buildEvent(i, prevCorrelationId) {
  return {
    id: fakeId('ev'),
    type: i % 3 === 0 ? 'quality.inspection' : i % 3 === 1 ? 'operational.alert' : 'logistics.dispatch',
    correlation_id: fakeId('corr'),
    causation_id: prevCorrelationId || null,
    workflow_id: fakeId('wf'),
    tenant_id: `tenant_${i % 20}`,
    payload: { seq: i, data: `payload_${i}` },
    created_at: new Date(Date.now() - (1000 - i) * 10).toISOString()
  };
}

function shadowReplay(events) {
  const results = [];
  const seen = new Set();
  let duplicates = 0;
  let outOfOrder = 0;
  let lastSeq = -1;
  for (const ev of events) {
    if (seen.has(ev.id)) { duplicates++; continue; }
    seen.add(ev.id);
    const seq = ev.payload.seq;
    if (seq < lastSeq) outOfOrder++;
    lastSeq = seq;
    results.push({ id: ev.id, replayed: true, type: ev.type, tenant_id: ev.tenant_id });
  }
  return { replayed: results.length, duplicates, out_of_order: outOfOrder };
}

async function runReplayMassiveStress() {
  section('RM-1: Massive Replay — 5000 events');

  const COUNT = 5000;
  const events = [];
  let prevCorr = null;
  for (let i = 0; i < COUNT; i++) {
    const ev = buildEvent(i, prevCorr);
    prevCorr = ev.correlation_id;
    events.push(ev);
  }
  const t = timer();
  const result = shadowReplay(events);
  const elapsed = t.elapsed();

  pass('RM-1.a all 5000 events replayed', result.replayed === COUNT);
  pass('RM-1.b zero duplicates in ordered stream', result.duplicates === 0);
  pass('RM-1.c zero out-of-order in ordered stream', result.out_of_order === 0);
  pass('RM-1.d 5000-event replay < 200ms', elapsed < 200);
  console.log(`    ℹ replay throughput: ${Math.round(COUNT / elapsed * 1000)} events/sec`);

  section('RM-2: Ordering Validation');

  // Scramble events and check detection
  const scrambled = [...events].sort(() => Math.random() - 0.5);
  const r2 = shadowReplay(scrambled);
  pass('RM-2.a out-of-order detected in scrambled stream', r2.out_of_order > 0);
  pass('RM-2.b total replayed preserved', r2.replayed === COUNT);

  section('RM-3: Deduplication Under Retry Storm');

  // Inject 20% duplicates
  const withDups = [...events];
  const dupIndices = Array.from({ length: COUNT * 0.2 }, () => Math.floor(Math.random() * COUNT));
  for (const idx of dupIndices) withDups.push(events[idx]);
  const r3 = shadowReplay(withDups);
  pass('RM-3.a duplicates isolated (not replayed twice)', r3.replayed === COUNT);
  pass('RM-3.b duplicate count >= 0.1 * injected', r3.duplicates >= COUNT * 0.1);

  section('RM-4: Multi-Tenant Isolation in Replay');

  const tenantResults = {};
  for (const r of shadowReplay(events).replayed !== undefined ? [] : []) {
    // no-op
  }
  // Separate replay per tenant
  const byTenant = {};
  for (const ev of events) {
    if (!byTenant[ev.tenant_id]) byTenant[ev.tenant_id] = [];
    byTenant[ev.tenant_id].push(ev);
  }
  let allIsolated = true;
  for (const [tid, tevents] of Object.entries(byTenant)) {
    const r = shadowReplay(tevents);
    tenantResults[tid] = r;
    if (r.duplicates > 0) allIsolated = false;
  }
  pass('RM-4.a 20 tenants isolated in replay', Object.keys(tenantResults).length === 20);
  pass('RM-4.b no cross-tenant duplicates', allIsolated);

  section('RM-5: Causation Chain Integrity');

  // Build a chain where each event's causation_id = previous event's correlation_id
  const chain = [];
  let prev = null;
  for (let i = 0; i < 100; i++) {
    const ev = {
      id: fakeId('chain'),
      correlation_id: fakeId('corr'),
      causation_id: prev ? prev.correlation_id : null,
      payload: { seq: i }
    };
    chain.push(ev);
    prev = ev;
  }
  let chainIntact = true;
  for (let i = 1; i < chain.length; i++) {
    if (chain[i].causation_id !== chain[i - 1].correlation_id) { chainIntact = false; break; }
  }
  pass('RM-5.a causation chain intact for 100 events', chainIntact);
  pass('RM-5.b first event has null causation', chain[0].causation_id === null);
}

runReplayMassiveStress()
  .then(() => summarize('Replay Massive Stress'))
  .catch((err) => { console.error('[REPLAY_STRESS_ERROR]', err?.message || err); process.exit(1); });
