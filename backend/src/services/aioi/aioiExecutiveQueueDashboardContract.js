'use strict';

/**
 * AIOI-ORG-5 — Executive Queue Dashboard Contract
 *
 * Contratos de consumo da Queue API — sem UI visual.
 * Spec: backend/docs/AIOI_QUEUE_API_SPECIFICATION.md
 */

const CONTRACT_VERSION = '1.0.0';

const EMPTY_QUEUE_RESPONSE = Object.freeze({
  authority:        'aioi',
  source:           'aioi_executive_queue_snapshot',
  contract_version: CONTRACT_VERSION,
  empty:            true,
  item_count:       0,
  items:            [],
  message:          'SNAPSHOT_NOT_MATERIALIZED'
});

const QUEUE_ITEM_REQUIRED_FIELDS = Object.freeze([
  'ioe_id', 'rank', 'category', 'priority_band', 'priority_score',
  'truth_state', 'status', 'sla_class', 'breach_state'
]);

/**
 * Valida estrutura de um item de fila.
 * @param {object} item
 * @returns {{ ok: boolean, missing?: string[] }}
 */
function validateQueueItem(item) {
  if (!item || typeof item !== 'object') {
    return { ok: false, missing: ['item'] };
  }
  const missing = QUEUE_ITEM_REQUIRED_FIELDS.filter(f => item[f] === undefined || item[f] === null);
  return missing.length ? { ok: false, missing } : { ok: true };
}

/**
 * Constrói payload de resposta da Queue API.
 * @param {object} params
 * @returns {object}
 */
function buildQueueApiResponse({ snapshot, flags }) {
  if (!snapshot || !snapshot.items || snapshot.item_count === 0) {
    return {
      ...EMPTY_QUEUE_RESPONSE,
      flags: flags || {},
      generated_at: null
    };
  }

  const items = Array.isArray(snapshot.items)
    ? snapshot.items
    : (typeof snapshot.items === 'string' ? JSON.parse(snapshot.items) : []);

  return {
    ok:               true,
    authority:        snapshot.authority || 'aioi',
    source:           'aioi_executive_queue_snapshot',
    contract_version: CONTRACT_VERSION,
    empty:            items.length === 0,
    snapshot_id:      snapshot.id,
    generated_at:     snapshot.generated_at,
    item_count:       snapshot.item_count || items.length,
    items,
    flags:            flags || {}
  };
}

/**
 * Contrato de read model executivo para consumo futuro.
 * @param {object} queueResponse
 * @returns {object}
 */
function buildExecutiveReadModelContract(queueResponse) {
  return {
    contract_version: CONTRACT_VERSION,
    read_model:       'aioi_executive_queue_read_model',
    authority:        queueResponse.authority,
    source:           queueResponse.source,
    snapshot_id:      queueResponse.snapshot_id || null,
    generated_at:     queueResponse.generated_at || null,
    item_count:       queueResponse.item_count || 0,
    top_items:        (queueResponse.items || []).slice(0, 3),
    breach_summary:   _summarizeBreaches(queueResponse.items || [])
  };
}

function _summarizeBreaches(items) {
  const summary = { ON_TRACK: 0, AT_RISK: 0, BREACHED: 0 };
  for (const item of items) {
    const state = item.breach_state || 'ON_TRACK';
    if (summary[state] !== undefined) summary[state]++;
  }
  return summary;
}

module.exports = {
  CONTRACT_VERSION,
  EMPTY_QUEUE_RESPONSE,
  QUEUE_ITEM_REQUIRED_FIELDS,
  validateQueueItem,
  buildQueueApiResponse,
  buildExecutiveReadModelContract
};
