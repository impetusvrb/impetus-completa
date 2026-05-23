'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../cognitiveRuntime/learning/governanceLearningFacade');
const { runEnterpriseGovernanceLearning } = require('../../cognitiveRuntime/learning/learning/enterpriseGovernanceLearning');
const { getOrchestrationLearningMemory } = require('../../cognitiveRuntime/learning/memory/orchestrationLearningMemory');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getGovernanceLearningStatus() }));
router.get('/patterns', (req, res) => {
  const tenant = req.query.tenant_id || req.user?.company_id;
  const { report } = runEnterpriseGovernanceLearning(req.user, req.body?.payload || {}, { tenant_id: tenant });
  res.json({ ok: true, patterns: report.patterns });
});
router.get('/fatigue', (req, res) => {
  const { report } = runEnterpriseGovernanceLearning(req.user, req.body?.payload || {}, {});
  res.json({ ok: true, fatigue: report.fatigue });
});
router.get('/usefulness', (req, res) => {
  const { report } = runEnterpriseGovernanceLearning(req.user, req.body?.payload || {}, {});
  res.json({ ok: true, usefulness: report.usefulness });
});
router.get('/convergence', (req, res) => {
  const { report } = runEnterpriseGovernanceLearning(req.user, req.body?.payload || {}, {});
  res.json({ ok: true, convergence: report.convergence });
});
router.get('/recommendations', (req, res) => {
  const { governance_learning } = runEnterpriseGovernanceLearning(req.user, req.body?.payload || {}, {});
  res.json({ ok: true, governance_learning });
});
router.get('/memory', (req, res) => {
  const store = getOrchestrationLearningMemory(req.query.tenant_id || req.user?.company_id);
  res.json({ ok: true, memory: { snapshot_count: store.snapshots?.length, updated_at: store.updated_at } });
});
router.get('/performance', (req, res) => {
  const { report } = runEnterpriseGovernanceLearning(req.user, req.body?.payload || {}, {});
  res.json({ ok: true, performance: report.performance, safety: report.safety });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const out = facade.applyGovernanceLearning(req.user, req.body?.payload || {}, { force_governance_learning: true });
  res.json({ ok: true, ...out.report, governance_learning: out.governance_learning });
});

module.exports = router;
