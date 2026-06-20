'use strict';

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/adoptionProgressTrackerService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[adoptionTracker]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error' });
    });
  };
}

// Consolidado — todos os gates
router.get('/status', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.runAdoptionProgressTracker()) });
}));

// Gates individuais
router.get('/esg', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.measureEsgGate()) });
}));

router.get('/workflow', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.measureWorkflowGate()) });
}));

router.get('/mes', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.measureMesGate()) });
}));

router.get('/analytics', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.measureAnalyticsGate()) });
}));

router.get('/logistics', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.measureLogisticsGate()) });
}));

module.exports = router;
