'use strict';

const express = require('express');
const router = express.Router();
const { runEnterpriseGovernanceLearning } = require('../../cognitiveRuntime/learning/learning/enterpriseGovernanceLearning');
const facade = require('../../cognitiveRuntime/learning/governanceLearningFacade');

function governanceRoleOk(user) {
  const role = String(user?.role || '').toLowerCase();
  return ['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role) || user?.is_internal_admin;
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getGovernanceLearningStatus() }));
router.get('/report', (req, res) => {
  const { report } = runEnterpriseGovernanceLearning(req.user, req.body?.payload || {}, {});
  res.json({ ok: true, convergence: report.convergence });
});

module.exports = router;
