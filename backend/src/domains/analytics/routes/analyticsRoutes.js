'use strict';

/**
 * M1.3 — Analytics Foundation Routes
 * READ ONLY / NO AUTO ACTION
 */

const express = require('express');
const router = express.Router();
const db = require('../../../db');
const analytics = require('../services/analyticsFoundationService');

router.get('/health', async (req, res) => {
  const companyId = req.user?.company_id;
  if (!companyId) return res.status(403).json({ ok: false, error: 'Tenant obrigatório' });
  const result = await analytics.getHealth(db, companyId);
  res.json(result);
});

router.post('/kpis', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user.company_id };
    const result = await analytics.recordKpi(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/aggregations', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user.company_id };
    const result = await analytics.recordAggregation(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/trends', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user.company_id };
    const result = await analytics.recordTrend(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/forecasts', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user.company_id };
    const result = await analytics.recordForecast(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
