'use strict';

/**
 * AIOI-P1Q.7 — Recovery API (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');

const recoveryGovernance = require('../../services/aioi/runtime/aioiBaselineRecoveryGovernanceService');
const recoveryChain = require('../../services/aioi/runtime/aioiRecoveryChainService');
const certificationRebuild = require('../../services/aioi/runtime/aioiCertificationRebuildService');
const baselineContinuity = require('../../services/aioi/runtime/aioiBaselineContinuityService');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/status', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await recoveryGovernance.generateRecoveryGovernanceStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/chain', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(recoveryChain.generateRecoveryChainStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/rebuild', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(certificationRebuild.generateRebuildStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/continuity', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await baselineContinuity.generateContinuityStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
