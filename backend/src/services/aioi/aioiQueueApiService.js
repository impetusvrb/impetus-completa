'use strict';

/**
 * AIOI-ORG-5 — Queue API Service (READ ONLY)
 *
 * GET /api/aioi/queue — Single Source of Truth ORG-1.
 *
 * Autoridade: aioi_executive_queue_snapshot APENAS.
 * Proibido: F47 rebuild, dual source, merge F47+AIOI, ranking paralelo.
 *
 * Spec: backend/docs/AIOI_QUEUE_API_SPECIFICATION.md
 * Contract: backend/docs/AIOI_QUEUE_PRECEDENCE_CONTRACT.md (Q-01..Q-05)
 */

const { isValidUUID } = require('../../utils/security');
const snapshotProjection = require('./aioiExecutiveQueueSnapshotProjectionService');
const readModelService = require('./aioiExecutiveQueueReadModelService');
const viewModelService = require('./aioiExecutiveQueueViewModelService');
const dashboardContract = require('./aioiExecutiveQueueDashboardContract');

const LAYER = 'AIOI_QUEUE_API';

function _resolveFlags() {
  return {
    IMPETUS_AIOI_ENABLED:       String(process.env.IMPETUS_AIOI_ENABLED || 'false').toLowerCase() === 'true',
    IMPETUS_AIOI_QUEUE_ACTIVE:  String(process.env.IMPETUS_AIOI_QUEUE_ACTIVE || 'false').toLowerCase() === 'true'
  };
}

/**
 * Obtém fila executiva CEO — snapshot AIOI exclusivamente.
 * @param {string} companyId
 * @param {object} [options]
 * @param {number} [options.limit=20]
 * @returns {Promise<object>}
 */
async function getExecutiveQueue(companyId, options = {}) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  const flags = _resolveFlags();

  const snapshot = await snapshotProjection.fetchLatestSnapshot(companyId);

  if (!snapshot) {
    return {
      ok: true,
      ...dashboardContract.EMPTY_QUEUE_RESPONSE,
      flags,
      queue_active: flags.IMPETUS_AIOI_QUEUE_ACTIVE
    };
  }

  const response = dashboardContract.buildQueueApiResponse({ snapshot, flags });
  const limit = Math.min(Math.max(parseInt(String(options.limit || 20), 10) || 20, 1), 100);

  if (response.items && response.items.length > limit) {
    response.items = response.items.slice(0, limit);
    response.item_count = response.items.length;
  }

  return {
    ok: true,
    ...response,
    queue_active: flags.IMPETUS_AIOI_QUEUE_ACTIVE,
    aioi_enabled: flags.IMPETUS_AIOI_ENABLED
  };
}

/**
 * Bundle completo: queue + read model + view model.
 * @param {string} companyId
 * @param {object} [options]
 * @returns {Promise<object>}
 */
async function getExecutiveQueueBundle(companyId, options = {}) {
  const [queue, readModel, viewModel] = await Promise.all([
    getExecutiveQueue(companyId, options),
    readModelService.getExecutiveQueueReadModel(companyId),
    viewModelService.getExecutiveQueueViewModel(companyId)
  ]);

  if (!queue.ok) return queue;

  return {
    ok: true,
    queue,
    read_model:  readModel.ok ? readModel : null,
    view_model:  viewModel.ok ? viewModel.view_model : null
  };
}

module.exports = {
  getExecutiveQueue,
  getExecutiveQueueBundle,
  LAYER
};
