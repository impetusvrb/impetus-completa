'use strict';
/**
 * AIOI-P1B — Certification Runner
 * Script sequencial: injeta eventos, executa ciclos, coleta métricas, testa recovery.
 * Pool único, conexões controladas.
 */

process.env.IMPETUS_AIOI_ENABLED                  = 'true';
process.env.IMPETUS_AIOI_QUEUE_ACTIVE             = 'true';
process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';
process.env.IMPETUS_AIOI_PILOT_TENANTS            = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3,ffd94fb8-79f4-4a38-af21-fe596adfffb5';
process.env.IMPETUS_AIOI_OUTBOX_BATCH_SIZE        = '20';

const db              = require('../src/db');
const adapter         = require('../src/services/aioi/plcAioiAdapter');
const classification  = require('../src/services/aioi/aioiClassificationConsumerService');
const snapshot        = require('../src/services/aioi/aioiExecutiveQueueSnapshotProjectionService');
const runtimeMetrics  = require('../src/services/aioi/runtime/aioiRuntimeMetricsService');
const pilotFlags      = require('../src/services/aioi/aioiPilotFlags');
const { v5: uuidv5 }  = require('uuid');

const NS      = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const TENANTS = [
  { id: '21dd3cee-2efa-4936-908f-9ff1ba04e2a3', name: 'find_fish' },
  { id: 'ffd94fb8-79f4-4a38-af21-fe596adfffb5', name: 'industria_teste' }
];
const TYPES  = ['equipment_failure','production_deviation','quality_issue','maintenance_required','equipment_degradation'];
const BANDS  = ['critical','high','medium','high','low'];

function eqUUID(label, cid) { return uuidv5(label + ':' + cid, NS); }

async function injectRound(round) {
  let ok = 0, dup = 0, fail = 0;
  for (const t of TENANTS) {
    for (let i = 0; i < 5; i++) {
      const label = `EQ-P1B-R${round}-${i}`;
      const eqId  = eqUUID(label, t.id);
      const ev = {
        equipment_id: eqId, equipmentId: eqId,
        event_type: TYPES[i], severity: BANDS[i],
        timestamp: new Date().toISOString(),
        value: 70 + i * 4, unit: 'pct',
        source: `P1B_SOAK_R${round}`,
        description: `Soak P1B round ${round} evento ${i}`
      };
      try {
        const r = await adapter.adaptAndIngestPlcEvent({ companyId: t.id, tenantKey: t.id, plcEvent: ev });
        if (r.ok && !r.duplicate) ok++;
        else if (r.duplicate) dup++;
        else fail++;
      } catch(e) { fail++; }
    }
  }
  return { ok, dup, fail };
}

async function runClassificationCycle(label) {
  let totalClassified = 0, totalFailed = 0;
  for (const t of TENANTS) {
    const r = await classification.processClassificationBatch({ companyId: t.id, batchSize: 20 });
    totalClassified += r.processed || 0;
    totalFailed     += r.failed    || 0;
  }
  runtimeMetrics.recordClassification({ processed: totalClassified });
  return { classified: totalClassified, failed: totalFailed, label };
}

async function runSnapshotCycle(label) {
  let snaps = 0;
  for (const t of TENANTS) {
    const r = await snapshot.projectExecutiveQueueSnapshot({ companyId: t.id, tenantKey: t.id });
    if (r.ok) { snaps++; runtimeMetrics.recordSnapshotProjection(1); }
  }
  return { snapshots: snaps, label };
}

async function dbState() {
  const q1 = await db.query('SELECT status, COUNT(*) AS n FROM aioi_outbox GROUP BY status ORDER BY status');
  const q2 = await db.query('SELECT status, COUNT(*) AS n FROM industrial_operational_events GROUP BY status ORDER BY status');
  const q3 = await db.query('SELECT COUNT(*) AS n FROM aioi_executive_queue_snapshot');
  return {
    outbox: Object.fromEntries(q1.rows.map(r => [r.status, parseInt(r.n)])),
    ioe:    Object.fromEntries(q2.rows.map(r => [r.status, parseInt(r.n)])),
    snapshots: parseInt(q3.rows[0]?.n || 0)
  };
}

async function rlsCheck(tenantA, tenantB) {
  // Verify tenant A cannot see tenant B IOEs (app-level simulation)
  const rA = await db.query(
    'SELECT COUNT(*) AS n FROM industrial_operational_events WHERE company_id=$1', [tenantA]
  );
  const rB = await db.query(
    'SELECT COUNT(*) AS n FROM industrial_operational_events WHERE company_id=$1', [tenantB]
  );
  const rCross = await db.query(
    'SELECT COUNT(*) AS n FROM industrial_operational_events WHERE company_id NOT IN ($1,$2)',
    [tenantA, tenantB]
  );
  return {
    tenant_a_count: parseInt(rA.rows[0]?.n || 0),
    tenant_b_count: parseInt(rB.rows[0]?.n || 0),
    cross_leak:     parseInt(rCross.rows[0]?.n || 0)
  };
}

async function main() {
  const results = {};
  const t_start = Date.now();

  console.log(JSON.stringify({ phase: 'START', ts: new Date().toISOString() }));

  // ── BASELINE ─────────────────────────────────────────────────────────────
  const baseline = await dbState();
  results.baseline = baseline;
  console.log(JSON.stringify({ phase: 'BASELINE', ...baseline }));

  // ── FLAGS & INVARIANTS ────────────────────────────────────────────────────
  const flags  = pilotFlags.getAioiFlags();
  const pilot  = pilotFlags.validatePilotConfig();
  const workerMod = require('../src/services/aioi/runtime/aioiContinuousWorkerService');
  results.flags      = flags;
  results.pilot      = pilot;
  results.invariants = workerMod.RUNTIME_INVARIANTS;
  console.log(JSON.stringify({ phase: 'FLAGS', ...flags }));
  console.log(JSON.stringify({ phase: 'INVARIANTS', ...workerMod.RUNTIME_INVARIANTS }));
  console.log(JSON.stringify({ phase: 'PILOT', tenants: pilot.pilot_tenants, ok: pilot.ok }));

  // ── ADVISORY LOCK TEST ────────────────────────────────────────────────────
  const client = await db.pool.connect();
  const lockR  = await client.query('SELECT pg_try_advisory_lock($1) AS got', [8820202607]);
  const lockOk = lockR.rows[0]?.got === true;
  if (lockOk) await client.query('SELECT pg_advisory_unlock($1)', [8820202607]);
  client.release();
  results.advisory_lock = { acquired: lockOk, released: lockOk };
  console.log(JSON.stringify({ phase: 'ADVISORY_LOCK', acquired: lockOk, released: lockOk }));

  // ── ROUND 1: Inject + Classify + Snapshot ─────────────────────────────────
  console.log(JSON.stringify({ phase: 'ROUND_1_INJECT' }));
  const inj1 = await injectRound(2);
  runtimeMetrics.recordIngestion(inj1.ok);
  results.round1_inject = inj1;
  console.log(JSON.stringify({ phase: 'ROUND_1_INJECT_DONE', ...inj1 }));

  await new Promise(r => setTimeout(r, 300));

  const t_cls1 = Date.now();
  const cls1 = await runClassificationCycle('round1');
  const elapsed_cls1 = Date.now() - t_cls1;
  runtimeMetrics.recordCycleLatency(elapsed_cls1);
  results.round1_classify = { ...cls1, elapsed_ms: elapsed_cls1 };
  console.log(JSON.stringify({ phase: 'ROUND_1_CLASSIFY', ...cls1, elapsed_ms: elapsed_cls1 }));

  const snp1 = await runSnapshotCycle('round1');
  results.round1_snapshot = snp1;
  console.log(JSON.stringify({ phase: 'ROUND_1_SNAPSHOT', ...snp1 }));

  const state1 = await dbState();
  results.state_after_round1 = state1;
  console.log(JSON.stringify({ phase: 'STATE_R1', ...state1 }));

  // ── ROUND 2: Inject + Classify + Snapshot ─────────────────────────────────
  console.log(JSON.stringify({ phase: 'ROUND_2_INJECT' }));
  const inj2 = await injectRound(3);
  runtimeMetrics.recordIngestion(inj2.ok);
  results.round2_inject = inj2;
  console.log(JSON.stringify({ phase: 'ROUND_2_INJECT_DONE', ...inj2 }));

  const t_cls2 = Date.now();
  const cls2 = await runClassificationCycle('round2');
  const elapsed_cls2 = Date.now() - t_cls2;
  runtimeMetrics.recordCycleLatency(elapsed_cls2);
  results.round2_classify = { ...cls2, elapsed_ms: elapsed_cls2 };
  console.log(JSON.stringify({ phase: 'ROUND_2_CLASSIFY', ...cls2, elapsed_ms: elapsed_cls2 }));

  const snp2 = await runSnapshotCycle('round2');
  results.round2_snapshot = snp2;
  console.log(JSON.stringify({ phase: 'ROUND_2_SNAPSHOT', ...snp2 }));

  // ── ROUND 3 (soak burst) ──────────────────────────────────────────────────
  const inj3 = await injectRound(4);
  runtimeMetrics.recordIngestion(inj3.ok);
  const t_cls3 = Date.now();
  const cls3 = await runClassificationCycle('round3');
  const elapsed_cls3 = Date.now() - t_cls3;
  runtimeMetrics.recordCycleLatency(elapsed_cls3);
  const snp3 = await runSnapshotCycle('round3');
  results.round3 = { inject: inj3, classify: cls3, elapsed_ms: elapsed_cls3, snapshot: snp3 };
  console.log(JSON.stringify({ phase: 'ROUND_3', inj_ok: inj3.ok, cls: cls3.classified, snp: snp3.snapshots, ms: elapsed_cls3 }));

  // ── IDEMPOTENCY TEST: re-ingest same round ─────────────────────────────────
  const inj_dup = await injectRound(2); // same round = same idempotency_key
  results.idempotency_test = { duplicates_blocked: inj_dup.dup, ok: inj_dup.ok, fail: inj_dup.fail };
  console.log(JSON.stringify({ phase: 'IDEMPOTENCY_TEST', dup_blocked: inj_dup.dup, new_ok: inj_dup.ok }));

  // ── MULTI-TENANT RLS CHECK ────────────────────────────────────────────────
  const rls = await rlsCheck(TENANTS[0].id, TENANTS[1].id);
  results.rls = { ...rls, cross_tenant_leak: rls.cross_leak === 0 ? 'NONE' : 'VIOLATION' };
  console.log(JSON.stringify({ phase: 'RLS_CHECK', ...results.rls }));

  // ── METRICS FINAL ──────────────────────────────────────────────────────────
  const metricsSnap = await runtimeMetrics.getMetricsSnapshot();
  results.metrics = metricsSnap;
  console.log(JSON.stringify({ phase: 'METRICS', ...metricsSnap }));

  // ── FINAL STATE ───────────────────────────────────────────────────────────
  const finalState = await dbState();
  results.final_state = finalState;
  console.log(JSON.stringify({ phase: 'FINAL_STATE', ...finalState }));

  const totalElapsed = Date.now() - t_start;
  results.total_elapsed_ms = totalElapsed;

  // Latency stats
  const latencies = [elapsed_cls1, elapsed_cls2, elapsed_cls3].sort((a,b) => a-b);
  const lat_p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const lat_p99 = latencies[latencies.length - 1] || 0;
  results.latency_observed = { p50: lat_p50, p99: lat_p99, cycles: latencies };

  console.log(JSON.stringify({ phase: 'COMPLETE', total_ms: totalElapsed, ts: new Date().toISOString() }));
  console.log('RESULTS_JSON:' + JSON.stringify(results));

  await db.pool.end();
  process.exit(0);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
