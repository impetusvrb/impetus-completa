'use strict';

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/m1OperationalRoadmapConsolidationService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1OperationalRoadmap]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.22' });
    });
  };
}

router.get('/status', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.runM122OperationalRoadmapConsolidation()) });
}));

router.get('/gaps', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessOperationalGaps()) });
}));

router.get('/p0', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...svc.assessP0LegacyReinterpretation() });
}));

router.get('/roadmap', asyncWrap(async (_req, res) => {
  const gaps = await svc.assessOperationalGaps();
  res.json({ ok: true, ...svc.assessRoadmapGates(gaps) });
}));

router.get('/p17-p20', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...svc.assessP17P20Status() });
}));

module.exports = router;
