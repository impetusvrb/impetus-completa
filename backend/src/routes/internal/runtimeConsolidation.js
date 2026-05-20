'use strict';

const express = require('express');
const router = express.Router();

const facade = require('../../runtimeConsolidation/runtimeConsolidationFacade');

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
    force_graph: req.query.force_graph === '1'
  };
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  }
  next();
});

router.get('/status', (req, res) => {
  res.json({ ok: true, ...facade.getRuntimeConsolidationStatus(ctxFromReq(req)) });
});

router.get('/redundancy', (req, res) => {
  res.json({ ok: true, ...facade.analyzeRuntimeConsolidation(ctxFromReq(req)) });
});

router.get('/legacy', (req, res) => {
  res.json({ ok: true, ...facade.analyzeLegacyResolvers(ctxFromReq(req)) });
});

router.get('/dependencies', (req, res) => {
  res.json({ ok: true, ...facade.buildPipelineDependencyGraph(ctxFromReq(req)) });
});

router.get('/recommendations', (req, res) => {
  const ctx = ctxFromReq(req);
  const analysis = facade.analyzeRuntimeConsolidation(ctx);
  const legacy = facade.analyzeLegacyResolvers(ctx);
  const graph = facade.buildPipelineDependencyGraph({ ...ctx, force_graph: true });
  res.json({
    ok: true,
    ...facade.adviseRuntimeSimplification(analysis, graph, legacy, ctx)
  });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getRuntimeConsolidationReport(ctxFromReq(req)));
});

module.exports = router;
