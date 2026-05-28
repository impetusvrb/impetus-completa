'use strict';

/**
 * PROMPT 27 — Legacy deprecation governance API
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireHierarchy } = require('../middleware/auth');
const flags = require('../legacyDeprecation/config/deprecationGovernanceFlags');
const registry = require('../legacyDeprecation/governance/legacyDeprecationRegistry');
const routerCompat = require('../legacyDeprecation/governance/legacyCompatibilityRouter');
const audit = require('../legacyDeprecation/observability/deprecationAuditService');

router.get('/health', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    health: routerCompat.getHealth(),
    tenant: {
      company_id: req.user?.company_id,
      pilot: flags.isPilotTenant(req.user?.company_id)
    }
  });
});

router.get('/catalog', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    mode: flags.deprecationMode(),
    entries: registry.listEntries(),
    removal_policy: 'Nenhuma entrada permite removal_allowed=true — sem remoção abrupta.'
  });
});

router.get('/usage', requireAuth, requireHierarchy(3), (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, usage: routerCompat.getUsageSnapshot(), mode: flags.deprecationMode() });
});

router.get('/audit', requireAuth, requireHierarchy(3), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const items = await audit.listRecent(req.user?.company_id, req.query.limit);
    res.json({ ok: true, items, count: items.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/report', requireAuth, requireHierarchy(3), (req, res) => {
  res.set('Cache-Control', 'no-store');
  const legacyId = req.body?.legacy_id;
  if (!legacyId) return res.status(400).json({ ok: false, error: 'legacy_id required' });
  const report = routerCompat.recordLegacyInvocation(legacyId, {
    companyId: req.user?.company_id,
    userId: req.user?.id,
    caller_hint: req.body?.caller_hint || 'api_report'
  });
  res.json({ ok: true, report });
});

module.exports = router;
