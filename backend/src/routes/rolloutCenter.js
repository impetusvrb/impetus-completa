'use strict';

/**
 * PROMPT 29 — Rollout Center API
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireHierarchy } = require('../middleware/auth');
const flags = require('../rolloutCenter/config/rolloutCenterFlags');
const facade = require('../rolloutCenter/facade/rolloutCenterFacade');
const catalog = require('../rolloutCenter/catalog/capabilityCatalog');
const audit = require('../rolloutCenter/observability/rolloutCenterAuditService');

router.get('/health', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    health: facade.getHealth(),
    tenant: { company_id: req.user?.company_id }
  });
});

router.get('/dashboard', requireAuth, requireHierarchy(3), (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!flags.isRolloutCenterActive()) {
    return res.json({ ok: false, error: 'rollout_center_inactive', mode: flags.rolloutCenterMode() });
  }
  res.json(facade.buildDashboard(req.user?.company_id));
});

router.get('/capabilities', requireAuth, requireHierarchy(3), (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, capabilities: catalog.listCapabilities(), mode: flags.rolloutCenterMode() });
});

router.get('/flags/effective', requireAuth, requireHierarchy(3), (req, res) => {
  res.set('Cache-Control', 'no-store');
  const effectiveFlags = require('../rolloutCenter/resolvers/effectiveFlagsResolver');
  res.json({
    ok: true,
    capability_flags: effectiveFlags.resolveCapabilityFlags(),
    global: effectiveFlags.resolveGlobalEffectiveFlags(150)
  });
});

router.get('/gates', requireAuth, requireHierarchy(3), (req, res) => {
  res.set('Cache-Control', 'no-store');
  const gates = require('../rolloutCenter/governance/promotionGateRegistry');
  const capId = req.query.capability_id;
  if (capId) {
    return res.json({ ok: true, gate: gates.evaluateGate(capId, req.query.target_mode || null) });
  }
  res.json({ ok: true, gates: gates.evaluateAllGates() });
});

router.post('/gates/evaluate', requireAuth, requireHierarchy(2), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const capabilityId = req.body?.capability_id;
  if (!capabilityId) return res.status(400).json({ ok: false, error: 'capability_id required' });
  try {
    const gate = await facade.evaluatePromotion(capabilityId, req.body?.target_mode, {
      companyId: req.user?.company_id,
      actorUserId: req.user?.id
    });
    res.json({ ok: true, gate, center_mode: flags.rolloutCenterMode() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/audit', requireAuth, requireHierarchy(2), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const items = await audit.listRecent(req.user?.company_id, req.query.limit);
    res.json({ ok: true, items, count: items.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

module.exports = router;
