'use strict';

/**
 * AIOI-P1P.7 — Baseline Assurance API (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');

const assuranceGovernance = require('../../services/aioi/runtime/aioiBaselineAssuranceGovernanceService');
const baselinePreservation = require('../../services/aioi/runtime/aioiBaselinePreservationService');
const baselineConsistency = require('../../services/aioi/runtime/aioiBaselineConsistencyService');
const baselineTraceability = require('../../services/aioi/runtime/aioiBaselineTraceabilityService');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/status', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await assuranceGovernance.generateAssuranceGovernanceStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/preservation', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(baselinePreservation.generatePreservationStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/consistency', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(baselineConsistency.generateConsistencyStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/traceability', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(baselineTraceability.generateTraceabilityStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
