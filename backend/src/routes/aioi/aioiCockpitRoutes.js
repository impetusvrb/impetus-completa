'use strict';

/**
 * AIOI-P5.0 — Enterprise Executive Cockpit API Routes (READ ONLY)
 *
 * GET /api/aioi/cockpit/summary
 * GET /api/aioi/cockpit/overview
 * GET /api/aioi/cockpit/interface-intelligence
 * GET /api/aioi/cockpit/decision-visualization
 * GET /api/aioi/cockpit/read-model
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');
const cockpitController = require('../../controllers/aioi/aioiCockpitController');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/summary', readOnlyMw, cockpitController.getSummary);
router.get('/overview', readOnlyMw, cockpitController.getOverview);
router.get('/interface-intelligence', readOnlyMw, cockpitController.getInterfaceIntelligence);
router.get('/decision-visualization', readOnlyMw, cockpitController.getDecisionVisualization);
router.get('/read-model', readOnlyMw, cockpitController.getReadModel);

module.exports = router;
