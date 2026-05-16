'use strict';

/**
 * WAVE 2 — Enterprise Observability (flags, correlation, tracing, SLO, monitors, OTLP).
 */

const { v4: uuidv4 } = require('uuid');

let passed = 0;
let failed = 0;
const COMPANY_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
const savedEnv = {};

function saveEnv(keys) {
  keys.forEach((k) => {
    savedEnv[k] = process.env[k];
  });
}

function restoreEnv(keys) {
  keys.forEach((k) => {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  });
}

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

function clearModuleCache(prefix) {
  for (const key of Object.keys(require.cache)) {
    if (key.includes(prefix)) delete require.cache[key];
  }
}

const ENV_KEYS = [
  'IMPETUS_OBSERVABILITY_V2_ENABLED',
  'IMPETUS_WORKFLOW_TRACING_ENABLED',
  'IMPETUS_CORRELATION_PROPAGATION_ENABLED',
  'IMPETUS_OTEL_EXPORTER_ENABLED',
  'IMPETUS_OTEL_ENDPOINT',
  'IMPETUS_PROMETHEUS_ENDPOINT_ENABLED',
  'IMPETUS_SLO_MONITORING_ENABLED',
  'IMPETUS_SATURATION_MONITORING_ENABLED',
  'IMPETUS_EVENT_LAG_MONITORING_ENABLED',
  'IMPETUS_DLQ_MONITORING_ENABLED',
  'IMPETUS_COGNITIVE_PRESSURE_OBS_ENABLED',
  'IMPETUS_WORKFLOW_OBSERVABILITY_ENABLED',
  'IMPETUS_TENANT_METRICS_CARDINALITY_CAP'
];

(async () => {
  console.log('\n══ WAVE 2 — ENTERPRISE OBSERVABILITY ══\n');
  saveEnv(ENV_KEYS);

  try {
    for (const k of ENV_KEYS) delete process.env[k];

    console.log('── Flags default ──');
    clearModuleCache('observability');
    const flags = require('../observability/observabilityFlags');
    assert('W2.1 v2 disabled por defeito', flags.isObservabilityV2Enabled() === false);
    assert('W2.2 OTLP off sem endpoint', flags.isOtelExporterEnabled() === false);

    console.log('\n── Correlation context ──');
    process.env.IMPETUS_OBSERVABILITY_V2_ENABLED = 'true';
    process.env.IMPETUS_CORRELATION_PROPAGATION_ENABLED = 'true';
    clearModuleCache('observability');

    const correlation = require('../observability/correlationContext');
    const req = {
      id: 'imp-test-corr',
      headers: { 'x-workflow-id': 'wf-test-1', 'x-request-id': 'imp-test-corr' },
      user: { company_id: COMPANY_ID }
    };
    correlation.bindFromRequest(req);
    const ctx = correlation.runWithContext(
      {
        correlation_id: 'imp-test-corr',
        trace_id: 'imp-test-corr',
        workflow_id: 'wf-test-1',
        company_id: COMPANY_ID
      },
      () => correlation.getContext()
    );
    assert('W2.3 correlation propagado', ctx.workflow_id === 'wf-test-1');
    const headers = correlation.runWithContext(ctx, () => correlation.propagationHeaders());
    assert('W2.4 headers downstream', headers['X-Workflow-Id'] === 'wf-test-1');

    const enriched = correlation.runWithContext(ctx, () =>
      correlation.enrichIndustrialEnvelope({
        event_name: 'quality.ncr.opened',
        company_id: COMPANY_ID
      })
    );
    assert('W2.5 envelope enriquecido', enriched.correlation_id === 'imp-test-corr');

    console.log('\n── Workflow tracing ──');
    process.env.IMPETUS_WORKFLOW_TRACING_ENABLED = 'true';
    clearModuleCache('observability');
    const wf = require('../observability/workflowTracingService');
    const started = wf.startWorkflow('ncr', { company_id: COMPANY_ID });
    assert('W2.6 workflow iniciado', started && started.workflow_id);
    wf.recordWorkflowStep(started.workflow_id, 'validate');
    const ended = wf.endWorkflow(started.workflow_id, 'ok');
    assert('W2.7 workflow terminado', ended && ended.duration_ms >= 0);

    console.log('\n── Tenant metrics + cardinality ──');
    clearModuleCache('observability');
    const metrics = require('../observability/tenantMetricsRegistry');
    for (let i = 0; i < 10; i += 1) {
      metrics.incrementCounter('test_counter', 1, {}, { company_id: uuidv4() });
    }
    const prom = metrics.exportPrometheusText();
    assert('W2.8 prometheus text export', prom.includes('test_counter'));
    assert('W2.9 tenant_bucket others presente', prom.includes('tenant_bucket="others"') || prom.includes('tenant_id='));

    console.log('\n── SLO/SLI ──');
    process.env.IMPETUS_SLO_MONITORING_ENABLED = 'true';
    clearModuleCache('observability');
    const slo = require('../observability/sloSliRegistry');
    slo.recordHttpSli(200, 150);
    slo.recordHttpSli(500, 3000);
    const evalSlos = slo.evaluateSlos();
    assert('W2.10 SLO avaliados', evalSlos.enabled && evalSlos.slos.length >= 1);

    console.log('\n── Saturation ──');
    process.env.IMPETUS_SATURATION_MONITORING_ENABLED = 'true';
    const sat = require('../observability/saturationMonitor');
    const sample = sat.sampleSaturation();
    assert('W2.11 saturação amostrada', sample && sample.overall_score >= 0);

    console.log('\n── Event lag ──');
    process.env.IMPETUS_EVENT_LAG_MONITORING_ENABLED = 'true';
    const lag = require('../observability/eventLagMonitor');
    lag.recordEventLag({
      event_name: 'quality.ncr.opened',
      domain: 'quality',
      enqueued_at: Date.now() - 500
    });
    const lagStats = lag.getLagStats();
    assert('W2.12 lag stats', lagStats.count >= 1);

    console.log('\n── DLQ monitor ──');
    process.env.IMPETUS_DLQ_MONITORING_ENABLED = 'true';
    const dlqMon = require('../observability/dlqMonitor');
    const dlqSnap = dlqMon.pollDlqStats();
    assert('W2.13 dlq poll', dlqSnap && typeof dlqSnap.depth === 'number');

    console.log('\n── Cognitive pressure obs ──');
    process.env.IMPETUS_COGNITIVE_PRESSURE_OBS_ENABLED = 'true';
    const cpObs = require('../observability/cognitivePressureObservability');
    const cp = cpObs.sampleCognitivePressure({ queue_depth: 10 });
    assert('W2.14 cognitive pressure sample', cp && cp.overall_pressure >= 0);

    console.log('\n── Alerts observe-only ──');
    const alerts = require('../observability/alertEvaluator');
    const fired = alerts.evaluateAlerts({
      saturation: { overall_score: 0.95 },
      event_lag: { p95_ms: 50000 },
      slos: { slos: [{ name: 'api_availability', burn_rate: 3 }] }
    });
    assert('W2.15 alertas emitidos', fired.length >= 1);
    assert('W2.16 observe only', fired[0].observe_only === true);

    console.log('\n── Runtime health ──');
    process.env.IMPETUS_WORKFLOW_OBSERVABILITY_ENABLED = 'true';
    clearModuleCache('observability');
    const runtime = require('../observability/enterpriseObservabilityV2Runtime');
    runtime.bootstrap();
    const health = runtime.getHealth();
    assert('W2.17 health enabled', health.enabled === true);
    assert('W2.18 workflow obs', health.workflow_observability.enabled === true);

    console.log('\n── Feature governance ──');
    process.env.IMPETUS_OTEL_EXPORTER_ENABLED = 'true';
    delete process.env.IMPETUS_OTEL_ENDPOINT;
    clearModuleCache('featureGovernanceService');
    const fg = require('../services/featureGovernanceService');
    const validation = fg.bootstrap().validation;
    assert(
      'W2.19 warn OTEL sem endpoint',
      validation.findings.some((f) => f.id === 'OTEL_WITHOUT_ENDPOINT')
    );

    console.log('\n── OTLP exporter (disabled) ──');
    const otlp = require('../observability/otlpExporter');
    const flush = await otlp.flushBatch();
    assert('W2.20 OTLP flush disabled', flush.reason === 'disabled' || flush.ok === true);
  } catch (e) {
    assert('W2.X ' + (e && e.message ? e.message : e), false);
    console.error(e);
  } finally {
    restoreEnv(ENV_KEYS);
  }

  console.log(`\n══ Resultado: ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
