'use strict';

const express = require('express');
const router = express.Router();
const { runEnterpriseGovernanceLearning } = require('../../cognitiveRuntime/learning/learning/enterpriseGovernanceLearning');

function governanceRoleOk(user) {
  const role = String(user?.role || '').toLowerCase();
  return ['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role) || user?.is_internal_admin;
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => res.json({ ok: true, phase: 'Z.29-patterns' }));
router.get('/report', (req, res) => {
  const { report } = runEnterpriseGovernanceLearning(req.user, req.body?.payload || {}, {});
  res.json({ ok: true, patterns: report.patterns, cockpit_patterns: report.cockpit_patterns });
});

module.exports = router;
