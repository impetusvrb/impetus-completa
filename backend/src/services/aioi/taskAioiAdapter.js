'use strict';

/**
 * AIOI-P0.2 — Adapter Tarefas / Work Orders → IOE
 *
 * Transforma tarefas vencidas, pendências críticas e work orders
 * em IOE normalizado.
 *
 * Fontes de dados:
 *   - `work_orders` (via workOrderRepository)
 *   - `tasks` (tarefas operacionais)
 *
 * ANTI_DUPLICATION_POLICY.md:
 *   ✓ Nenhum score PLC calculado
 *   ✓ Sem motor de decisão ou execução
 *   ✓ Apenas normalização e persistência
 *
 * Regra: apenas work orders/tarefas com prioridade 'critical' ou 'urgent'
 * geram IOE em P0 (filtro de elegibilidade).
 */

const ingestion = require('./aioiEventIngestionService');

const LAYER = 'AIOI_TASK_ADAPTER';
const ADAPTER_VERSION = '0.2.0';

// ---------------------------------------------------------------------------
// Mapeamento de prioridade de work order → IOE priority_band + score
// Sem cálculo — apenas vocabulário.
// ---------------------------------------------------------------------------

const WO_PRIORITY_TO_BAND = {
  critical: 'critical',
  urgent:   'high',
  high:     'high',
  normal:   'medium',
  low:      'low'
};

const WO_PRIORITY_TO_SCORE = {
  critical: 85,
  urgent:   65,
  high:     55,
  normal:   30,
  low:      10
};

const WO_PRIORITY_TO_CATEGORY = {
  critical: 'maintenance_required',
  urgent:   'maintenance_required',
  high:     'maintenance_required',
  normal:   'task_overdue',
  low:      'task_overdue'
};

/**
 * Determina se um work order / task deve gerar IOE.
 * P0: apenas critical e urgent.
 */
function _shouldIngest(record) {
  if (!record) return false;
  if (record.aioi_skip === true) return false;
  const priority = String(record.priority || '').toLowerCase();
  return priority === 'critical' || priority === 'urgent';
}

/**
 * Detecta o source_type correto baseado na origem do registro.
 */
function _detectSourceType(record) {
  if (record._source === 'work_order' || record.work_order_number) return 'work_order';
  if (record._source === 'task' || record.task_type) return 'task';
  return 'work_order';
}

/**
 * Constrói payload IOE a partir de um work order ou task.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.tenantKey
 * @param {object} params.record — work_order ou task
 * @param {string} [params.correlationId]
 * @param {Date}   [params.eventDate]
 * @returns {object} payload IOE normalizado
 */
function buildTaskIoePayload({
  companyId,
  tenantKey,
  record,
  correlationId,
  eventDate
}) {
  if (!companyId || !record) {
    throw new Error(`${LAYER}: companyId e record são obrigatórios`);
  }

  const recordId   = record.id || record.work_order_id;
  const sourceType = _detectSourceType(record);
  const priority   = String(record.priority || 'normal').toLowerCase();
  const eventDate_ = eventDate instanceof Date
    ? eventDate
    : record.created_at
      ? new Date(record.created_at)
      : new Date();

  const idempotencyKey = ingestion.buildIdempotencyKey(
    sourceType, 'task', recordId || 'unknown', eventDate_
  );

  const corrId = correlationId
    ? String(correlationId).trim()
    : ingestion.generateCorrelationId();

  const priorityBand  = WO_PRIORITY_TO_BAND[priority]     || 'low';
  const priorityScore = WO_PRIORITY_TO_SCORE[priority]     || 10;
  const category      = WO_PRIORITY_TO_CATEGORY[priority]  || 'task_overdue';

  // Indicar qual campo de equip/máquina está disponível
  const equipmentId = record.equipment_id || record.machine_id || record.asset_id || null;

  const evidenceRefs = [
    {
      type:         sourceType,
      ref_id:       String(recordId || ''),
      source_table: sourceType === 'work_order' ? 'work_orders' : 'tasks',
      confidence:   priorityScore,
      summary:      `${sourceType} priority=${priority} status=${record.status || 'unknown'} title=${(record.title || record.name || '').slice(0, 80)}`
    }
  ];

  return {
    company_id:      companyId,
    tenant_key:      tenantKey || companyId,
    idempotency_key: idempotencyKey,
    correlation_id:  corrId,
    external_ref_id: recordId ? String(recordId) : null,
    source_type:     sourceType,
    category,
    status:          'open',
    truth_state:     'provisional',
    priority_band:   priorityBand,
    priority_score:  priorityScore,
    scores_provisional: true,
    score_attention:      null,
    score_risk:           null,
    score_event_conf:     null,
    score_pattern_conf:   null,
    score_telemetry_hlth: null,
    classification_conf:  null,
    entity_type:      'task',
    entity_id:        recordId ? String(recordId) : null,
    equipment_id:     equipmentId,
    sector_id:        record.sector_id || null,
    department_id:    record.department_id || null,
    assigned_role_id: record.assigned_role_id || null,
    hierarchy_level:  null,
    audience_key:     'ceo',
    escalation_level: 0,
    visibility_scope: 'company',
    evidence_refs:    evidenceRefs,
    decision_type:    null,
    decision_payload: null,
    kpi_snapshot:     null,
    raw_payload:      {
      priority:   record.priority,
      status:     record.status,
      type:       record.type,
      title:      (record.title || record.name || '').slice(0, 200),
      machine_name: record.machine_name || null,
      line_name:    record.line_name || null
    },
    adapter_version: ADAPTER_VERSION,
    aioi_version:    '0.2.0'
  };
}

/**
 * Processa um work order / task e persiste como IOE se elegível.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.tenantKey
 * @param {object} params.record
 * @param {string} [params.correlationId]
 * @param {Date}   [params.eventDate]
 * @returns {Promise<{ ok: boolean, skipped?: boolean, duplicate?: boolean, ioe_id?: string, error?: string }>}
 */
async function adaptAndIngestTask(params) {
  const { companyId, record } = params;

  if (!companyId) {
    return { ok: false, error: 'companyId obrigatório' };
  }

  if (!_shouldIngest(record)) {
    return { ok: true, skipped: true };
  }

  try {
    const ioePayload = buildTaskIoePayload(params);
    return await ingestion.ingestIoe(ioePayload);
  } catch (err) {
    console.error(`[${LAYER}] AIOI_ADAPTER_ERROR`, {
      company_id: companyId,
      error: err.message
    });
    return { ok: false, error: err.message };
  }
}

module.exports = {
  adaptAndIngestTask,
  buildTaskIoePayload,
  _shouldIngest,
  _detectSourceType
};
