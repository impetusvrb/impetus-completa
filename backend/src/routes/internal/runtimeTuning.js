'use strict';

const express = require('express');
const router = express.Router();

const facade = require('../../runtimeTuning/runtimeTuningFacade');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

function ctxFromReq(req) {
  return {
    ...req.body,
    tenant_id: req.query.tenant_id || req.body?.tenant_id || req.user?.company_id,
    functional_axis: req.query.axis || req.body?.functional_axis || req.user?.functional_axis
  };
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  }
  next();
});

router.get('/status', (req, res) => {
  res.json({ ok: true, ...facade.getRuntimeTuningStatus(ctxFromReq(req)) });
});

router.get('/efficiency', (req, res) => {
  res.json({ ok: true, ...facade.superviseRuntimeEfficiency(ctxFromReq(req)) });
});

router.get('/pressure', (req, res) => {
  res.json({ ok: true, ...facade.analyzeRuntimePressure(ctxFromReq(req)) });
});

router.get('/optimization', (req, res) => {
  const ctx = ctxFromReq(req);
  res.json({
    ok: true,
    delivery: facade.adviseDeliveryOptimization(ctx),
    tuning: facade.generateOperationalTuning(ctx).tuning_recommendations,
    auto_apply: false
  });
});

router.get('/enrichment', (req, res) => {
  res.json({ ok: true, ...facade.adviseEnrichmentOptimization(ctxFromReq(req)) });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getRuntimeTuningReport({ ...ctxFromReq(req), force: req.query.force === '1' }));
});

module.exports = router;
