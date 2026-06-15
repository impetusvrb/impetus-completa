'use strict';

/**
 * F49-E — CEO Live Session Certification API Routes (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const audit = require('../../services/audit/ceoLiveSessionAuditService');

router.get('/session', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const report = await audit.generateCeoLiveSessionAudit({
      sinceDays: req.query.since_days ? parseInt(req.query.since_days, 10) : undefined,
      forceTriAiProbe: req.query.probe_tri_ai !== '0'
    });
    return res.json(report);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, layer: audit.LAYER, error: err.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const snapshot = await audit.getCeoSessionStatusSnapshot({
      sinceDays: req.query.since_days ? parseInt(req.query.since_days, 10) : undefined
    });
    return res.json(snapshot);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
