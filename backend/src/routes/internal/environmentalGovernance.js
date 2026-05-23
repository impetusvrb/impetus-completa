'use strict';

const express = require('express');
const router = express.Router();
const { runEnvironmentalGovernanceRuntime } = require('../../cognitiveRuntime/domains/environmental/governance/environmentalGovernanceRuntime');
const { loadEnvironmentalTenantSignals } = require('../../cognitiveRuntime/domains/environmental/bridge/environmentalSignalLoader');

function governanceRoleOk(user) {
  const role = String(user?.role || '').toLowerCase();
  return ['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role) || user?.is_internal_admin;
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => res.json({ ok: true, phase: 'P1-ENV-GOV' }));
router.get('/compliance', async (req, res) => {
  const s = await loadEnvironmentalTenantSignals(req.user, { mock_signals: req.body?.mock_signals });
  res.json({ ok: true, pack: runEnvironmentalGovernanceRuntime(s) });
});
router.get('/report', async (req, res) => {
  const s = await loadEnvironmentalTenantSignals(req.user, { mock_signals: req.body?.mock_signals });
  res.json({ ok: true, governance: runEnvironmentalGovernanceRuntime(s) });
});

module.exports = router;
