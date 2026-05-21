'use strict';

const express = require('express');
const router = express.Router();
const maturity = require('../../pilotMaturity/pilotMaturityFacade');
const stabilization = require('../../pilotOperationalStabilization/pilotOperationalStabilizationFacade');

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

router.get('/status', (req, res) =>
  res.json({ ok: true, ...maturity.getPilotMaturityStatus(), stabilization: stabilization.getOperationalStabilizationStatus() })
);
router.get('/readiness', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  const m = maturity.assessPilotMaturity(tenantId, req.user, { ...req.body, visible_modules: req.query.modules?.split(',') });
  res.json({ ok: true, readiness: m.kpi_channel_ready, maturity: m });
});
router.get('/maturity', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...maturity.assessPilotMaturity(tenantId, req.user, req.body) });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({
    ok: true,
    status: maturity.getPilotMaturityStatus(),
    maturity: maturity.assessPilotMaturity(tenantId, req.user, req.body)
  });
});

module.exports = router;
