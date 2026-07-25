'use strict';

/**
 * AIOI-P2.4 — Health API Controller
 * APPSEC-01: payload mínimo para acesso público.
 */

const healthService = require('../../services/aioi/aioiOperationalHealthService');
const { respondWithPolicy } = require('../../securityApplication/publicEndpointPolicy');

async function getHealth(req, res) {
  try {
    const snapshot = await healthService.getHealthSnapshot();
    res.set('Cache-Control', 'no-store');
    return respondWithPolicy(req, res, {
      minimal: {
        ok: snapshot.ok !== false,
        status: snapshot.status || (snapshot.aioi_enabled ? 'HEALTHY' : 'UNAVAILABLE')
      },
      full: snapshot
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return respondWithPolicy(req, res, {
      minimal: { ok: false, status: 'UNHEALTHY' },
      full: {
        ok: false,
        aioi_enabled: false,
        queue_active: false,
        worker_running: false,
        outbox_pending: 0,
        outbox_failed: 0,
        dlq_count: 0,
        status: 'UNHEALTHY',
        error: err.message
      }
    });
  }
}

module.exports = {
  getHealth
};
