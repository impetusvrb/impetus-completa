'use strict';

/**
 * AIOI-P5.4 — Executive Cockpit View Model Routes (READ ONLY · P5.3 transport)
 *
 * GET /api/aioi/executive-cockpit/view-model-bundle
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');
const viewModelController = require('../../controllers/aioi/aioiExecutiveCockpitViewModelController');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/view-model-bundle', readOnlyMw, viewModelController.getViewModelBundle);

module.exports = router;
