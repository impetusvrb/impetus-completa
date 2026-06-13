'use strict';

/**
 * AIOI-P2.4 — Health API Controller
 */

const healthService = require('../../services/aioi/aioiOperationalHealthService');

async function getHealth(req, res) {
  try {
    const snapshot = await healthService.getHealthSnapshot();
    res.set('Cache-Control', 'no-store');
    return res.json(snapshot);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({
      ok: false,
      aioi_enabled: false,
      queue_active: false,
      worker_running: false,
      outbox_pending: 0,
      outbox_failed: 0,
      dlq_count: 0,
      status: 'UNHEALTHY',
      error: err.message
    });
  }
}

module.exports = {
  getHealth
};
