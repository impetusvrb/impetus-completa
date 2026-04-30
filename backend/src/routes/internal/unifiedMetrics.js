/**
 * Métricas agregadas do motor unificado — leitura apenas.
 * GET /api/internal/unified-metrics?company_id= opcional (default: empresa do utilizador)
 * Apenas internal_admin.
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const aggregator = require('../../services/unifiedMetricsAggregatorService');

router.use(requireAuth, requireRole('internal_admin'));

router.get('/', (req, res) => {
  try {
    const companyId =
      req.query.company_id != null && String(req.query.company_id).trim() !== ''
        ? req.query.company_id
        : req.user?.company_id;
    res.json({
      ok: true,
      company_id: companyId != null ? companyId : null,
      snapshot: aggregator.getMetricsSnapshot(companyId),
      pipeline: aggregator.getPipelineStats(companyId),
      decision: aggregator.getDecisionStats(companyId)
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err && err.message ? String(err.message) : 'unified_metrics_error'
    });
  }
});

module.exports = router;
