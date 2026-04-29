'use strict';

const express = require('express');
const router = express.Router();
const chatMetricsService = require('../services/chatMetricsService');

/** GET / — montado em /api/chat/metrics. Apenas agregados numéricos. */
router.get('/', (req, res) => {
  res.json(chatMetricsService.getMetrics());
});

module.exports = router;
