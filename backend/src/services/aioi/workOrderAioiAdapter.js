'use strict';

/**
 * AIOI-P0.5 — Adapter Work Orders → IOE (facade)
 *
 * Facade dedicada sobre taskAioiAdapter.js (política anti-duplicação).
 * Work orders e tasks partilham normalização — este módulo expõe
 * a API canónica P0-5 sem duplicar lógica.
 *
 * @see taskAioiAdapter.js
 * @see AIOI_ANTI_DUPLICATION_POLICY.md
 */

const taskAdapter = require('./taskAioiAdapter');

const LAYER = 'AIOI_WORK_ORDER_ADAPTER';

/**
 * Constrói payload IOE a partir de um work order.
 */
function buildWorkOrderIoePayload(params) {
  const record = { ...(params.record || {}), _source: 'work_order' };
  return taskAdapter.buildTaskIoePayload({ ...params, record });
}

/**
 * Processa work order elegível → IOE.
 */
async function adaptAndIngestWorkOrder(params) {
  const record = { ...(params.record || {}), _source: 'work_order' };
  return taskAdapter.adaptAndIngestTask({ ...params, record });
}

module.exports = {
  LAYER,
  buildWorkOrderIoePayload,
  adaptAndIngestWorkOrder,
  /** Re-export para testes de elegibilidade */
  _shouldIngest: taskAdapter._shouldIngest,
};
