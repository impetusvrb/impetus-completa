'use strict';

/**
 * AIOI-P1L.8 — Operational Certification API (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');

const operationalDataset = require('../../services/aioi/runtime/aioiOperationalDatasetService');
const operationalWorkload = require('../../services/aioi/runtime/aioiOperationalWorkloadService');
const operationalConsistency = require('../../services/aioi/runtime/aioiOperationalConsistencyService');
const operationalCertification = require('../../services/aioi/runtime/aioiOperationalCertificationService');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/dataset', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await operationalDataset.certifyOperationalDataset());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/workload', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(operationalWorkload.getLastWorkloadResult());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/consistency', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await operationalConsistency.certifyOperationalConsistency());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/certification', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const cached = operationalCertification.getLastCertResults();
    if (cached) return res.json(cached);
    return res.json(await operationalCertification.generateOperationalCertification());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
