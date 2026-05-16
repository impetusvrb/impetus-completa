'use strict';

/**
 * Rotas internas — WAVE 3 Storage & Temporal Foundation.
 */

const express = require('express');
const router = express.Router();
const runtime = require('../../storage/industrialStorageRuntime');

function _safe(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('[INDUSTRIAL_STORAGE_ROUTE]', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
    }
  };
}

router.get(
  '/health',
  _safe(async (_req, res) => {
    res.json({ ok: true, ...(await runtime.getHealth()), timestamp: new Date().toISOString() });
  })
);

router.get(
  '/governance',
  _safe(async (_req, res) => {
    res.json({ ok: true, ...(await runtime.governance.getGovernanceSnapshot()) });
  })
);

router.get(
  '/retention',
  _safe(async (_req, res) => {
    const policies = await runtime.retention.listPolicies();
    res.json({
      ok: true,
      active: await runtime.retention.getActivePolicy(),
      plan: runtime.retention.evaluateRetentionPlan(),
      ...policies
    });
  })
);

router.get(
  '/partitioning',
  _safe(async (_req, res) => {
    res.json({
      ok: true,
      strategy: runtime.partition.getPartitioningStrategyDoc(),
      plans: await runtime.partition.listPartitionPlans()
    });
  })
);

router.post(
  '/partitioning/ensure-month',
  _safe(async (req, res) => {
    const result = await runtime.partition.ensureTelemetrySamplePartition(req.body && req.body.date);
    res.json({ ok: result.ok !== false, ...result });
  })
);

router.get(
  '/timescale/readiness',
  _safe(async (_req, res) => {
    res.json({ ok: true, ...(await runtime.timescale.getReadiness()) });
  })
);

router.post(
  '/timescale/probe',
  _safe(async (_req, res) => {
    res.json({ ok: true, ...(await runtime.timescale.probeTimescaleExtension()) });
  })
);

router.get(
  '/cold-storage',
  _safe(async (_req, res) => {
    res.json({
      ok: true,
      architecture: runtime.cold.getColdStorageArchitecture(),
      manifests: await runtime.cold.listManifests(50)
    });
  })
);

router.post(
  '/cold-storage/manifest',
  _safe(async (req, res) => {
    const result = await runtime.cold.registerManifest(req.body || {});
    res.status(result.ok ? 200 : 400).json(result);
  })
);

router.get(
  '/compression',
  _safe(async (_req, res) => {
    res.json({ ok: true, ...(await runtime.compression.listPlans()) });
  })
);

router.get(
  '/telemetry/isolation',
  _safe(async (_req, res) => {
    res.json({ ok: true, ...runtime.telemetry.getIsolationStrategy() });
  })
);

router.post(
  '/telemetry/ingest',
  _safe(async (req, res) => {
    const target = req.body && req.body.target === 'partitioned' ? 'partitioned' : 'v1';
    const result =
      target === 'partitioned'
        ? await runtime.telemetry.ingestIndustrialSample(req.body || {})
        : await runtime.telemetry.ingestTimeseriesV1(req.body || {});
    res.status(result.ok ? 200 : 400).json(result);
  })
);

router.get(
  '/impact-analysis',
  _safe(async (_req, res) => {
    res.json({ ok: true, ...(await runtime.runImpactAnalysis()) });
  })
);

module.exports = router;
