'use strict';

/**
 * M1.1 — MES Foundation Routes
 * READ ONLY / NO AUTO ACTION — todas as operações são HITL (humano inicia).
 */

const express = require('express');
const router = express.Router();
const db = require('../../../db');
const mes = require('../services/mesFoundationService');

router.get('/health', async (req, res) => {
  const companyId = req.user?.company_id || req.query.company_id;
  if (!companyId) return res.status(400).json({ ok: false, error: 'company_id required' });
  const result = await mes.getHealth(db, companyId);
  res.json(result);
});

router.post('/production-orders', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user?.company_id || req.body.company_id };
    const result = await mes.createProductionOrder(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/executions', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user?.company_id || req.body.company_id };
    const result = await mes.recordProductionExecution(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/downtime', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user?.company_id || req.body.company_id };
    const result = await mes.recordDowntime(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/scrap', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user?.company_id || req.body.company_id };
    const result = await mes.recordScrap(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/oee', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user?.company_id || req.body.company_id };
    const result = await mes.recordOeeSnapshot(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/traceability', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user?.company_id || req.body.company_id };
    const result = await mes.registerTraceability(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
