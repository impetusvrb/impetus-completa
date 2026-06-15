'use strict';

/**
 * AIOI-P1R.7 — Release Governance API (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');

const releaseGovernance = require('../../services/aioi/runtime/aioiReleaseGovernanceService');
const enterpriseReleaseRegistry = require('../../services/aioi/runtime/aioiEnterpriseReleaseRegistryService');
const changeGovernance = require('../../services/aioi/runtime/aioiChangeGovernanceService');
const releaseReadiness = require('../../services/aioi/runtime/aioiReleaseReadinessService');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/status', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await releaseGovernance.generateReleaseGovernanceStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/registry', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(enterpriseReleaseRegistry.getReleaseRegistry());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/governance', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await changeGovernance.validateChangeGovernance());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/readiness', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await releaseReadiness.generateReleaseReadinessStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
