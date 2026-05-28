#!/usr/bin/env node
'use strict';

/**
 * Teste de carga controlado — Industrial Event Backbone (tenant piloto).
 * Uso: node scripts/industrial-backbone-pilot-load-test.js [--count=200] [--concurrency=20]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { v4: uuidv4 } = require('uuid');

const PILOT = (
  process.env.IMPETUS_INDUSTRIAL_BACKBONE_PILOT_TENANTS ||
  process.env.IMPETUS_MQTT_REAL_PILOT_TENANTS ||
  '21dd3cee-2efa-4936-908f-9ff1ba04e2a3'
)
  .split(',')[0]
  .trim();

const COUNT = parseInt(process.argv.find((a) => a.startsWith('--count='))?.split('=')[1] || '200', 10);
const CONCURRENCY = parseInt(
  process.argv.find((a) => a.startsWith('--concurrency='))?.split('=')[1] || '20',
  10
);

async function publishBatch(backbone, start, n) {
  const results = { ok: 0, fail: 0, throttled: 0, latencies: [] };
  for (let i = 0; i < n; i++) {
    const t0 = Date.now();
    const r = await backbone.publishIndustrialEvent({
      event_name: 'quality.ncr.opened',
      company_id: PILOT,
      correlation_id: `load-${start + i}-${uuidv4().slice(0, 6)}`,
      payload: { load_test: true, seq: start + i, ts: new Date().toISOString() }
    });
    results.latencies.push(Date.now() - t0);
    if (r.ok) results.ok += 1;
    else if (r.reason === 'tenant_throttled' || r.reason === 'global_backpressure') results.throttled += 1;
    else results.fail += 1;
  }
  return results;
}

async function main() {
  const flags = require('../src/eventPipeline/industrialFlags');
  const backbone = require('../src/eventPipeline/industrialEventBackbone');
  const outbox = require('../src/eventPipeline/outbox/industrialOutboxService');

  console.log(
    JSON.stringify(
      {
        event: 'INDUSTRIAL_LOAD_TEST_START',
        pilot: PILOT,
        count: COUNT,
        concurrency: CONCURRENCY,
        backbone_mode: flags.industrialBackboneMode(),
        archive_enabled: flags.isIndustrialArchiveEnabled(),
        archive_mode: flags.industrialArchiveMode(),
        backpressure: flags.industrialBackpressureMode(),
        scheduler: flags.isIndustrialBackboneSchedulerEnabled()
      },
      null,
      2
    )
  );

  const tStart = Date.now();
  let totalOk = 0;
  let totalFail = 0;
  let totalThrottled = 0;
  const allLatencies = [];

  const perWorker = Math.ceil(COUNT / CONCURRENCY);
  const workers = [];
  for (let w = 0; w < CONCURRENCY; w++) {
    workers.push(publishBatch(backbone, w * perWorker, Math.min(perWorker, COUNT - w * perWorker)));
  }
  const batches = await Promise.all(workers);
  for (const b of batches) {
    totalOk += b.ok;
    totalFail += b.fail;
    totalThrottled += b.throttled;
    allLatencies.push(...b.latencies);
  }

  const drain = await outbox.drainOutboxBatch(
    require('../src/eventPipeline/replay/shadowReplayWorker').shadowReplayHandler
  );

  const elapsedMs = Date.now() - tStart;
  allLatencies.sort((a, b) => a - b);
  const p50 = allLatencies[Math.floor(allLatencies.length * 0.5)] || 0;
  const p95 = allLatencies[Math.floor(allLatencies.length * 0.95)] || 0;
  const throughput = elapsedMs > 0 ? (totalOk / elapsedMs) * 1000 : 0;

  const health = backbone.getIndustrialBackboneHealth();

  const report = {
    event: 'INDUSTRIAL_LOAD_TEST_COMPLETE',
    pilot: PILOT,
    elapsed_ms: elapsedMs,
    published_ok: totalOk,
    published_fail: totalFail,
    throttled: totalThrottled,
    throughput_eps: Math.round(throughput * 100) / 100,
    latency_ms: { p50, p95, max: allLatencies[allLatencies.length - 1] || 0 },
    drain_processed: drain.processed,
    outbox: health.outbox,
    backpressure: health.wave2?.backpressure || health.throttle,
    pass: totalOk >= COUNT * 0.95 && totalFail === 0
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error('[INDUSTRIAL_LOAD_TEST_FATAL]', e?.message || e);
  process.exit(1);
});
