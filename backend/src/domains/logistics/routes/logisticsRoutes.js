'use strict';

/**
 * M1.2 — Logistics Foundation Routes
 * READ ONLY / NO AUTO ACTION
 */

const express = require('express');
const router = express.Router();
const db = require('../../../db');
const logistics = require('../services/logisticsFoundationService');

router.get('/health', async (req, res) => {
  const companyId = req.user?.company_id || req.query.company_id;
  if (!companyId) return res.status(400).json({ ok: false, error: 'company_id required' });
  const result = await logistics.getHealth(db, companyId);
  res.json(result);
});

router.post('/inventory', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user?.company_id || req.body.company_id };
    const result = await logistics.updateInventory(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/receipts', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user?.company_id || req.body.company_id };
    const result = await logistics.createReceipt(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/shipments', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user?.company_id || req.body.company_id };
    const result = await logistics.createShipment(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/lots', async (req, res) => {
  try {
    const data = { ...req.body, company_id: req.user?.company_id || req.body.company_id };
    const result = await logistics.registerLot(db, data, { eventBus: req.app.get('eventBus') });
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
