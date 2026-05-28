'use strict';

/**
 * Rotas internas — WAVE 2 Enterprise Observability.
 */

const express = require('express');
const router = express.Router();
const flags = require('../../observability/observabilityFlags');
const runtime = require('../../observability/enterpriseObservabilityV2Runtime');

function _safe(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('[ENTERPRISE_OBSERVABILITY_ROUTE]', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
    }
  };
}

router.get(
  '/health',
  _safe(async (_req, res) => {
    res.json({ ok: true, ...runtime.getHealth(), timestamp: new Date().toISOString() });
  })
);

router.get(
  '/flags',
  _safe(async (_req, res) => {
    res.json({ ok: true, flags: runtime.getEnabledFlags() });
  })
);

router.get(
  '/slos',
  _safe(async (_req, res) => {
    const slo = require('../../observability/sloSliRegistry');
    res.json({ ok: true, ...slo.evaluateSlos() });
  })
);

router.get(
  '/saturation',
  _safe(async (_req, res) => {
    const sat = require('../../observability/saturationMonitor');
    res.json({ ok: true, current: sat.sampleSaturation(), history: sat.getSaturationHistory(30) });
  })
);

router.get(
  '/event-lag',
  _safe(async (_req, res) => {
    const lag = require('../../observability/eventLagMonitor');
    res.json({ ok: true, stats: lag.getLagStats() });
  })
);

router.get(
  '/dlq',
  _safe(async (_req, res) => {
    const dlq = require('../../observability/dlqMonitor');
    res.json({ ok: true, ...dlq.pollDlqStats() });
  })
);

router.get(
  '/workflows',
  _safe(async (_req, res) => {
    const wf = require('../../observability/workflowObservability');
    res.json({ ok: true, ...wf.getWorkflowObservabilitySnapshot() });
  })
);

router.get(
  '/workflows/:workflowId',
  _safe(async (req, res) => {
    const wf = require('../../observability/workflowObservability');
    const detail = wf.getWorkflowDetail(req.params.workflowId);
    if (!detail) return res.status(404).json({ ok: false, error: 'workflow_not_found' });
    res.json({ ok: true, workflow: detail });
  })
);

router.get(
  '/cognitive-pressure',
  _safe(async (_req, res) => {
    const cp = require('../../observability/cognitivePressureObservability');
    res.json({ ok: true, ...cp.getCognitivePressureHealth() });
  })
);

router.get(
  '/alerts',
  _safe(async (req, res) => {
    const alerts = require('../../observability/alertEvaluator');
    const limit = Math.min(100, Number(req.query.limit) || 20);
    res.json({ ok: true, alerts: alerts.getRecentAlerts(limit), observe_only: flags.isAlertsObserveOnly() });
  })
);

router.post(
  '/collect',
  _safe(async (_req, res) => {
    const snap = await runtime.collectPeriodicSnapshot();
    res.json({ ok: true, snapshot: snap });
  })
);

router.post(
  '/otel/flush',
  _safe(async (_req, res) => {
    const otlp = require('../../observability/otlpExporter');
    const result = await otlp.flushBatch();
    res.json({ ok: true, ...result, stats: otlp.getOtelExporterStats() });
  })
);

router.get(
  '/metrics',
  _safe(async (_req, res) => {
    if (!flags.isPrometheusEndpointEnabled()) {
      return res.status(403).json({ ok: false, error: 'prometheus_endpoint_disabled' });
    }
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(runtime.exportPrometheus());
  })
);

router.get(
  '/apm',
  _safe(async (_req, res) => {
    const apm = require('../../observability/apmEnterpriseBridge');
    const slo = require('../../observability/sloSliRegistry');
    res.json({
      ok: true,
      apm: apm.getDiagnostics(),
      slos: flags.isSloMonitoringEnabled() ? slo.evaluateSlos() : { enabled: false },
      flags: runtime.getEnabledFlags(),
      timestamp: new Date().toISOString()
    });
  })
);

router.get(
  '/slas',
  _safe(async (_req, res) => {
    const slo = require('../../observability/sloSliRegistry');
    const evaluated = slo.evaluateSlos();
    const slas = (evaluated.slos || []).map((s) => ({
      sli: s.name,
      target_met: s.met,
      current: s.current,
      burn_rate: s.burn_rate,
      sla_status: s.met ? 'within_sla' : 'breach',
      description: slo.SLI_DEFINITIONS.find((d) => d.name === s.name)?.description
    }));
    res.json({ ok: true, slas, evaluated_at: evaluated.evaluated_at, timestamp: new Date().toISOString() });
  })
);

module.exports = router;
