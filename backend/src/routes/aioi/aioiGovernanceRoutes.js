'use strict';

/**
 * AIOI-P1D.6 — Governance API Routes
 *
 * GET /api/aioi/governance/status    — status consolidado de lifecycle/governance
 * GET /api/aioi/governance/capacity  — capacity guardrails (READ ONLY)
 * GET /api/aioi/governance/retention — estimativas de retenção (dry-run)
 *
 * ADDITIVE ONLY · READ ONLY · sem side-effects
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');

const aggregation = require('../../services/aioi/runtime/aioiRuntimeAggregationService');
const capacityGuard = require('../../services/aioi/runtime/aioiCapacityGuardService');
const outboxRetention = require('../../services/aioi/lifecycle/aioiOutboxRetentionService');
const snapshotRetention = require('../../services/aioi/lifecycle/aioiSnapshotRetentionService');
const continuousWorker = require('../../services/aioi/runtime/aioiContinuousWorkerService');
const pilotFlags = require('../../services/aioi/aioiPilotFlags');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/status', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const companyId = req.user?.company_id || req.user?.companyId;
    const [capacity, aggregates, cacheStatus] = await Promise.all([
      capacityGuard.generateCapacityStatus(),
      aggregation.getRuntimeAggregateMetrics(),
      Promise.resolve(aggregation.getCacheStatus())
    ]);

    return res.json({
      ok: true,
      layer: 'AIOI_GOVERNANCE',
      runtime_mode: 'operational_only',
      governance_mode: 'read_only',
      auto_action: false,
      invariants_preserved: true,
      runtime_invariants: continuousWorker.RUNTIME_INVARIANTS,
      aioi_flags: pilotFlags.getAioiFlags(),
      capacity_status: capacity.overall_status,
      capacity,
      aggregates,
      cache: cacheStatus,
      company_id: companyId || null,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/capacity', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const status = await capacityGuard.generateCapacityStatus();
    return res.json(status);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/retention', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const companyId = req.user?.company_id || req.user?.companyId || null;
    const scope = companyId ? { companyId: String(companyId) } : {};

    const [outboxDry, snapshotDry, outboxImpact, snapGrowth] = await Promise.all([
      outboxRetention.retentionDryRun(scope),
      snapshotRetention.retentionDryRun(scope),
      outboxRetention.estimateRetentionImpact(scope),
      snapshotRetention.estimateSnapshotGrowth(scope)
    ]);

    return res.json({
      ok: true,
      layer: 'AIOI_GOVERNANCE_RETENTION',
      mode: 'dry_run_only',
      execute_outbox: String(process.env.IMPETUS_AIOI_OUTBOX_RETENTION_EXECUTE || 'false').toLowerCase() === 'true',
      execute_snapshot: String(process.env.IMPETUS_AIOI_SNAPSHOT_RETENTION_EXECUTE || 'false').toLowerCase() === 'true',
      outbox: {
        retention_days: outboxImpact.retention_days,
        eligible_for_purge: outboxImpact.eligible_for_purge,
        estimated_reclaim: outboxImpact.estimated_bytes_human,
        dry_run: outboxDry
      },
      snapshots: {
        retention_count: snapGrowth.retention_count,
        total_excess: snapGrowth.total_excess,
        projected_reclaim_bytes: snapGrowth.projected_reclaim_bytes,
        dry_run: snapshotDry
      },
      company_id: companyId,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
