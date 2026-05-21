'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../terminalGovernance/terminalGovernanceFacade');
const { isDeniedPublicationLocked } = require('../../terminalGovernance/deniedPublicationTerminalLock');
const { isTerminalGovernanceLocked } = require('../../terminalGovernance/terminalGovernanceLock');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getTerminalGovernanceStatus(req.query) }));
router.get('/sidebar', (req, res) => {
  const r = facade.applyTerminalGovernanceToDashboard(req.user, req.body?.payload || {}, req.body?.ctx || {});
  res.json({ ok: true, ...r });
});
router.get('/kpis', (req, res) => {
  const r = facade.applyTerminalKpiLock(req.user, req.body?.kpis || [], { ...req.body?.ctx, force_terminal_lock: true });
  res.json({ ok: true, ...r });
});
router.get('/summaries', (req, res) => {
  const r = facade.applyTerminalSummaryLock(req.user, req.body?.summary || {}, { ...req.body?.ctx, force_terminal_lock: true });
  res.json({ ok: true, ...r });
});
router.get('/cockpit', (req, res) => {
  const { assessCockpitGovernanceConsistency } = require('../../terminalGovernance/cockpitGovernanceConsistency');
  res.json({ ok: true, ...assessCockpitGovernanceConsistency(req.body?.payload || {}, req.body?.ctx || {}) });
});
router.get('/denied', (req, res) => {
  const mod = req.query.module || '';
  res.json({
    ok: true,
    ...isDeniedPublicationLocked(mod, {
      denied_publications: (req.query.denied || '').split(',').filter(Boolean)
    })
  });
});
router.get('/mutations', (req, res) => {
  const { detectPostLockMutation } = require('../../terminalGovernance/terminalGovernanceLock');
  res.json({
    ok: true,
    ...detectPostLockMutation(
      req.body?.before || [],
      req.body?.after || [],
      req.body?.locked === true
    )
  });
});
router.get('/reinjection', (req, res) => {
  const { assertModuleNotReinjected } = require('../../terminalGovernance/terminalGovernanceResolver');
  res.json({ ok: true, ...assertModuleNotReinjected(req.query.module, req.body?.payload || {}) });
});
router.get('/freeze-state', (req, res) => {
  res.json({
    ok: true,
    locked: isTerminalGovernanceLocked(req.body?.ctx || {}),
    governance_freeze_state: req.body?.governance_freeze_state || {
      governance_locked: false,
      reinjection_blocked: false,
      legacy_pipeline_disabled: false,
      terminal_resolution_applied: false,
      mutation_after_lock_detected: false
    }
  });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getTerminalGovernanceReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});

module.exports = router;
