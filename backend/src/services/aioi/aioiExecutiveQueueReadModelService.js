'use strict';

/**
 * AIOI-ORG-5 — Executive Queue Read Model Service (READ ONLY)
 *
 * Read model executivo da fila CEO — delega exclusivamente ao snapshot AIOI.
 * Nunca consulta F47 operationalPrioritizationService.
 */

const { isValidUUID } = require('../../utils/security');
const snapshotProjection = require('./aioiExecutiveQueueSnapshotProjectionService');
const dashboardContract = require('./aioiExecutiveQueueDashboardContract');

const LAYER = 'AIOI_EXECUTIVE_QUEUE_READ_MODEL';

function _resolveAioiFlags() {
  return {
    aioi_enabled:       String(process.env.IMPETUS_AIOI_ENABLED || 'false').toLowerCase() === 'true',
    aioi_queue_active: String(process.env.IMPETUS_AIOI_QUEUE_ACTIVE || 'false').toLowerCase() === 'true'
  };
}

/**
 * Obtém read model executivo da fila CEO.
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function getExecutiveQueueReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  const flags = _resolveAioiFlags();
  const snapshot = await snapshotProjection.fetchLatestSnapshot(companyId);
  const queueResponse = dashboardContract.buildQueueApiResponse({ snapshot, flags });
  const readModel = dashboardContract.buildExecutiveReadModelContract(queueResponse);

  return {
    ok: true,
    ...readModel,
    flags
  };
}

module.exports = {
  getExecutiveQueueReadModel,
  LAYER
};
