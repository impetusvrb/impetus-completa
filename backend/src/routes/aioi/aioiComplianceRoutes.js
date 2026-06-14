'use strict';

/**
 * AIOI-P1N.7 — Compliance API (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');

const operationalIntegrity = require('../../services/aioi/runtime/aioiOperationalIntegrityService');
const certificationDrift = require('../../services/aioi/runtime/aioiCertificationDriftService');
const governanceCompliance = require('../../services/aioi/runtime/aioiGovernanceComplianceService');
const complianceGovernance = require('../../services/aioi/runtime/aioiComplianceGovernanceService');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/integrity', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await operationalIntegrity.generateIntegrityStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/drift', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(certificationDrift.generateDriftStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/governance', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await governanceCompliance.generateComplianceStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/status', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await complianceGovernance.generateComplianceStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
