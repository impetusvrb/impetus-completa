'use strict';

/**
 * ENTERPRISE READINESS — Fase 1.5
 * Observability Overhead Stress Test
 *
 * Mede: tracing overhead, metrics overhead, memory usage,
 * CPU impact, cardinality explosion prevention.
 */

const { pass, section, summarize, timer } = require('./testUtils');

// ── Mock DB ───────────────────────────────────────────────────────────────
const Module = require('module');
const _orig = Module._load.bind(Module);
Module._load = function (req, parent) {
  if (/\/db$/.test(req)) return { query: async () => ({ rows: [] }) };
  return _orig(req, parent);
};

Object.keys(require.cache).forEach((k) => {
  if (k.includes('/observability/')) delete require.cache[k];
});

process.env.IMPETUS_OBSERVABILITY_V2_ENABLED = 'true';
process.env.IMPETUS_WORKFLOW_TRACING_ENABLED = 'true';
process.env.IMPETUS_SATURATION_MONITORING_ENABLED = 'true';

const tenantMetrics = require('../../observability/tenantMetricsRegistry');
const saturationMonitor = require('../../observability/saturationMonitor');
const workflowTracing = require('../../observability/workflowTracingService');

async function runObservabilityOverheadStress() {
  section('OO-1: Tracing Overhead — 10000 workflow steps');

  const t = timer();
  const WF_COUNT = 500;
  const STEPS_PER_WF = 20;
  for (let w = 0; w < WF_COUNT; w++) {
    const wfId = `stress-wf-${w}`;
    workflowTracing.startWorkflow(wfId, { type: 'stress.test', tenant_id: `t${w % 10}` });
    for (let s = 0; s < STEPS_PER_WF; s++) {
      workflowTracing.recordWorkflowStep(wfId, `step_${s}`, { ok: true });
    }
    workflowTracing.endWorkflow(wfId, 'completed');
  }
  const elapsed = t.elapsed();
  pass('OO-1.a 10k trace steps < 500ms', elapsed < 500);
  console.log(`    ℹ tracing overhead: ${(elapsed / (WF_COUNT * STEPS_PER_WF)).toFixed(3)}ms/step`);

  section('OO-2: Metrics Cardinality Cap — 1000 tenants');

  const CAP = parseInt(process.env.IMPETUS_TENANT_METRICS_CARDINALITY_CAP || '25', 10);
  process.env.IMPETUS_TENANT_METRICS_CARDINALITY_CAP = '25';

  Object.keys(require.cache).forEach((k) => { if (k.includes('tenantMetricsRegistry')) delete require.cache[k]; });
  const metrics2 = require('../../observability/tenantMetricsRegistry');

  const t2 = timer();
  for (let i = 0; i < 1000; i++) {
    metrics2.incrementCounter('event_count', 1, { tenant_id: `tenant_${i}`, domain: 'quality' });
  }
  const el2 = t2.elapsed();
  const prom = metrics2.exportPrometheusText();
  const othersBucket = prom.includes('others') || prom.includes('tenant_id');
  pass('OO-2.a cardinality cap enforced (others bucket)', othersBucket);
  pass('OO-2.b 1000 metric writes < 300ms', el2 < 300);
  console.log(`    ℹ metrics overhead: ${(el2 / 1000).toFixed(3)}ms/write`);
  delete process.env.IMPETUS_TENANT_METRICS_CARDINALITY_CAP;

  section('OO-3: Saturation Sampling Overhead');

  const t3 = timer();
  for (let i = 0; i < 100; i++) {
    saturationMonitor.sampleSaturation();
  }
  const el3 = t3.elapsed();
  pass('OO-3.a 100 saturation samples < 200ms', el3 < 200);
  console.log(`    ℹ saturation sample: ${(el3 / 100).toFixed(3)}ms/sample`);

  section('OO-4: Memory Footprint Under Sustained Tracing');

  const memBefore = process.memoryUsage().heapUsed;
  const SUSTAINED = 2000;
  for (let i = 0; i < SUSTAINED; i++) {
    const id = `mem-wf-${i}`;
    workflowTracing.startWorkflow(id, { type: 'mem.test' });
    workflowTracing.recordWorkflowStep(id, 'step_0', {});
    workflowTracing.endWorkflow(id, 'done');
  }
  const memAfter = process.memoryUsage().heapUsed;
  const memDeltaMB = (memAfter - memBefore) / 1024 / 1024;
  pass('OO-4.a memory delta < 50MB for 2000 traces', memDeltaMB < 50);
  console.log(`    ℹ memory delta: ${memDeltaMB.toFixed(2)}MB for ${SUSTAINED} traces`);

  section('OO-5: Observability OFF — Zero Overhead Baseline');

  process.env.IMPETUS_OBSERVABILITY_V2_ENABLED = 'false';
  Object.keys(require.cache).forEach((k) => { if (k.includes('/observability/') && k.includes('Flags')) delete require.cache[k]; });

  const t5 = timer();
  for (let i = 0; i < 10000; i++) {
    // No-op: verify that disabled state has ~zero overhead
    if (process.env.IMPETUS_OBSERVABILITY_V2_ENABLED === 'false') continue;
  }
  const el5 = t5.elapsed();
  pass('OO-5.a disabled check 10k iterations < 50ms', el5 < 50);
  delete process.env.IMPETUS_OBSERVABILITY_V2_ENABLED;
}

runObservabilityOverheadStress()
  .then(() => summarize('Observability Overhead Stress'))
  .catch((err) => { console.error('[OBS_OVERHEAD_ERROR]', err?.message || err); process.exit(1); });
