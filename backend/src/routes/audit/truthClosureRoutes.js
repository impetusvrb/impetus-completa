'use strict';

/**
 * F49-F.6 — Truth Program Closure API Routes (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const consolidation = require('../../services/audit/truthProgramConsolidationService');
const registry = require('../../services/audit/truthProgramRegistryService');
const closureReport = require('../../services/audit/truthClosureReportService');
const finalStatus = require('../../services/audit/truthFinalStatusService');

router.get('/status', (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(consolidation.getConsolidationStatusSnapshot());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/registry', (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(registry.getTruthProgramRegistry());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/report', (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(closureReport.generateExecutiveClosureReport());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/final-status', (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(finalStatus.generateFinalStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
