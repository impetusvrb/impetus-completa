'use strict';

/**
 * AIOI-ORG-5 — Queue API Routes (READ ONLY)
 *
 * GET /api/aioi/queue          — fila executiva CEO (snapshot AIOI)
 * GET /api/aioi/queue/bundle   — queue + read model + view model
 *
 * ORG-1: Single Source of Truth — aioi_executive_queue_snapshot
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');
const queueController = require('../../controllers/aioi/aioiQueueController');
const healthController = require('../../controllers/aioi/aioiHealthController');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/health', healthController.getHealth);
router.get('/queue', readOnlyMw, queueController.getQueue);
router.get('/queue/bundle', readOnlyMw, queueController.getQueueBundle);

module.exports = router;
