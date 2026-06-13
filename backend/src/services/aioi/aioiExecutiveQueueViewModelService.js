'use strict';

/**
 * AIOI-ORG-5 — Executive Queue View Model Service (READ ONLY)
 *
 * View model executivo para consumo futuro da Queue API.
 * Sem dashboard visual — apenas projeção de dados.
 */

const { isValidUUID } = require('../../utils/security');
const readModelService = require('./aioiExecutiveQueueReadModelService');
const dashboardContract = require('./aioiExecutiveQueueDashboardContract');

const LAYER = 'AIOI_EXECUTIVE_QUEUE_VIEW_MODEL';

/**
 * Constrói view model executivo a partir do read model.
 * @param {object} readModel
 * @returns {object}
 */
function buildExecutiveQueueViewModel(readModel) {
  const topItems = (readModel.top_items || []).map((item, idx) => ({
    position:           idx + 1,
    ioe_id:             item.ioe_id,
    label:              `${item.category || 'event'} — ${item.priority_band || 'low'}`,
    priority_score:     item.priority_score,
    priority_band:      item.priority_band,
    truth_state:        item.truth_state,
    scores_provisional: item.scores_provisional,
    breach_state:       item.breach_state || 'ON_TRACK',
    sla_class:          item.sla_class,
    due_at:             item.due_at,
    status:             item.status
  }));

  return {
    view_model:         'aioi_executive_queue_view_model',
    contract_version:   dashboardContract.CONTRACT_VERSION,
    authority:          readModel.authority || 'aioi',
    source:             readModel.source || 'aioi_executive_queue_snapshot',
    snapshot_id:        readModel.snapshot_id,
    generated_at:       readModel.generated_at,
    item_count:         readModel.item_count || 0,
    top_priorities:     topItems,
    breach_summary:     readModel.breach_summary || { ON_TRACK: 0, AT_RISK: 0, BREACHED: 0 },
    flags:              readModel.flags || {},
    queue_active:       readModel.flags?.aioi_queue_active === true,
    empty:              (readModel.item_count || 0) === 0
  };
}

/**
 * Obtém view model executivo completo.
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function getExecutiveQueueViewModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  const readModel = await readModelService.getExecutiveQueueReadModel(companyId);
  if (!readModel.ok) {
    return readModel;
  }

  return {
    ok: true,
    view_model: buildExecutiveQueueViewModel(readModel)
  };
}

module.exports = {
  getExecutiveQueueViewModel,
  buildExecutiveQueueViewModel,
  LAYER
};
