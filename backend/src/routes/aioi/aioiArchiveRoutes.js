'use strict';

/**
 * AIOI-P1S.7 — Archive / Line-P1 Closure API (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');

const closureGovernance = require('../../services/aioi/runtime/aioiLineP1ClosureGovernanceService');
const historicalArchive = require('../../services/aioi/runtime/aioiHistoricalArchiveRegistryService');
const enterpriseMilestone = require('../../services/aioi/runtime/aioiEnterpriseMilestoneService');
const closureReport = require('../../services/aioi/runtime/aioiClosureReportService');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/status', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await closureGovernance.generateLineP1ClosureStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/registry', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(historicalArchive.getHistoricalArchiveRegistry());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/milestone', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await enterpriseMilestone.generateMilestoneStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/report', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await closureReport.generateClosureReport());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
