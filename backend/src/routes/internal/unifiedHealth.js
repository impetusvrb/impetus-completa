'use strict';

/**
 * GET /api/internal/unified-health
 * Painel de saúde do motor unificado + auditorias recentes.
 * internal_admin | admin (tenant): resposta completa | ceo, diretor, gerente, coordenador: executiva (sem auditoria completa).
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireHealthAccess } = require('../../middleware/requireHealthAccess');
const aggregator = require('../../services/unifiedMetricsAggregatorService');
const unifiedDecisionAuditService = require('../../services/unifiedDecisionAuditService');
const unifiedSystemHealthService = require('../../services/unifiedSystemHealthService');
const unifiedLearningFeedbackService = require('../../services/unifiedLearningFeedbackService');
const unifiedPerformanceService = require('../../services/unifiedPerformanceService');
const unifiedSystemInfluenceSummaryService = require('../../services/unifiedSystemInfluenceSummaryService');

router.use(requireAuth, requireHealthAccess);

router.get('/', (req, res) => {
  try {
    const userRoleRaw = req.user && req.user.role != null ? String(req.user.role) : '';
    const userRole = userRoleRaw.trim().toLowerCase();
    const profileRaw =
      req.user && req.user.dashboard_profile != null ? String(req.user.dashboard_profile) : '';
    const profile = profileRaw.trim().toLowerCase();
    const hierarchy = Number(req.user?.hierarchy_level);

    const ADMIN_ROLES = new Set([
      'internal_admin', 'admin', 'tenant_admin', 'company_admin',
      'administrator', 'system_admin', 'super_admin',
      'administrador', 'administradora'
    ]);

    const isFull =
      ADMIN_ROLES.has(userRole) ||
      profile === 'admin_system' ||
      req.user?.is_company_root === true ||
      (Number.isFinite(hierarchy) && hierarchy <= 1);

    try {
      console.info('[UNIFIED_HEALTH_ACCESS]', {
        role: userRoleRaw || '(undefined)',
        dashboard_profile: profileRaw || '(undefined)',
        is_company_root: req.user?.is_company_root === true,
        hierarchy_level: req.user?.hierarchy_level,
        level: isFull ? 'full' : 'restricted'
      });
    } catch (_log) {}

    const companyId =
      req.query.company_id != null && String(req.query.company_id).trim() !== ''
        ? req.query.company_id
        : req.user?.company_id;

    const snapshot = aggregator.getMetricsSnapshot(companyId);
    const perf = unifiedPerformanceService.getPerformanceStats(companyId);
    const metrics = {
      ...snapshot,
      avg_latency_gpt: perf.avg_latency_gpt,
      avg_latency_cognitive: perf.avg_latency_cognitive,
      cognitive_usage_rate: perf.cognitive_usage_rate,
      avg_cost_per_decision: perf.avg_cost_per_decision,
      performance_sample_decisions: perf.sample_decisions
    };
    const recent_audits = unifiedDecisionAuditService.getRecentAudits(companyId, 200);

    const healthCore = unifiedSystemHealthService.computeSystemHealth({
      metrics,
      audits: recent_audits,
      companyId
    });

    const ls = unifiedLearningFeedbackService.getLearningStats(companyId);
    let learning_status = 'unknown';
    if (ls.n >= 24 && ls.bad_rate < 0.12) learning_status = 'stable';
    else if (ls.n >= 10 && ls.bad_rate < 0.22) learning_status = 'acceptable';
    else if (ls.n > 0) learning_status = 'attention';

    const health = {
      ...healthCore,
      learning_status
    };

    const system_influence_summary =
      unifiedSystemInfluenceSummaryService.getInfluenceSummary(companyId);

    if (isFull) {
      return res.json({
        ok: true,
        health,
        metrics,
        recent_audits: recent_audits.slice(-50),
        system_influence_summary
      });
    }

    const m = metrics && typeof metrics === 'object' ? metrics : {};
    return res.json({
      ok: true,
      health: {
        status: health.system_health,
        stability_score: health.stability_score,
        learning_status: health.learning_status
      },
      metrics: {
        fallback_rate: m.fallback_rate,
        avg_latency: m.avg_latency,
        avg_latency_gpt: m.avg_latency_gpt,
        avg_latency_cognitive: m.avg_latency_cognitive,
        cognitive_usage_rate: m.cognitive_usage_rate
      },
      system_influence_summary
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err && err.message ? String(err.message) : 'unified_health_error'
    });
  }
});

module.exports = router;
