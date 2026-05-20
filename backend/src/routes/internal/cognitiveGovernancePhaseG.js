'use strict';

/**
 * Fase G — API interna de explainability / trace / drift / metrics.
 * GET /api/internal/governance/explain/:traceId
 * GET /api/internal/governance/timeline/:userId
 * GET /api/internal/governance/drift
 * GET /api/internal/governance/metrics
 */

const express = require('express');
const router = express.Router();

const phaseG = require('../../explainability/config/phaseGFeatureFlags');
const traceService = require('../../governanceTrace/governanceTraceService');
const { detectDrift } = require('../../oversight/governanceDriftDetector');
const enterpriseMetrics = require('../../policyEngine/observability/governanceEnterpriseMetrics');
const { exportAuditBundle } = require('../../audit/governanceAuditExporter');
const reviewQueue = require('../../oversight/governanceReviewQueue');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('VIEW_AUDIT_LOGS') || perms.includes('GOVERNANCE_OVERSIGHT');
}

function requireGovernanceRole(req, res, next) {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({
      ok: false,
      error: 'Acesso restrito a perfis de governança / auditoria interna.'
    });
  }
  next();
}

router.use(requireGovernanceRole);

router.get('/explain/:traceId', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!phaseG.isGovernanceExplainabilityEnabled() && !phaseG.isGovernanceTraceEnabled()) {
    return res.json({
      ok: true,
      enabled: false,
      message: 'IMPETUS_GOVERNANCE_EXPLAINABILITY e IMPETUS_GOVERNANCE_TRACE estão off.'
    });
  }
  const data = traceService.explainTrace(req.params.traceId);
  if (!data) return res.status(404).json({ ok: false, error: 'trace_not_found' });
  res.json({ ok: true, enabled: true, ...data });
});

router.get('/timeline/:userId', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const timeline = traceService.getUserTimeline(req.params.userId, limit);
  res.json({
    ok: true,
    trace_enabled: phaseG.isGovernanceTraceEnabled(),
    ...timeline
  });
});

router.get('/drift', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const drift = detectDrift({ force: req.query.force === '1' });
  res.json({ ok: true, ...drift });
});

router.get('/metrics', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const metrics = enterpriseMetrics.getEnterpriseMetrics();
  const pending_reviews = reviewQueue.listPending(20);
  res.json({
    ok: true,
    flags: {
      explainability: phaseG.isGovernanceExplainabilityEnabled(),
      trace: phaseG.isGovernanceTraceEnabled(),
      oversight: phaseG.isGovernanceOversightEnabled(),
      drift: phaseG.isGovernanceDriftDetectionEnabled(),
      audit_feed: phaseG.isGovernanceAuditFeedEnabled()
    },
    metrics,
    pending_reviews_count: pending_reviews.length,
    timestamp: new Date().toISOString()
  });
});

router.get('/audit/export', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const bundle = exportAuditBundle({ limit: Number(req.query.limit) || 100 });
  res.json({ ok: true, ...bundle });
});

module.exports = router;
