'use strict';

/**
 * AIOI-P0.2 — Adapter Comunicação → IOE
 *
 * Transforma registros de comunicação interna (mensagens, incidentes,
 * comunicados com flag de risco) em IOE normalizado.
 *
 * Fonte de dados: tabela `communications` (via queries RLS).
 *
 * ANTI_DUPLICATION_POLICY.md:
 *   ✓ Nenhum score PLC calculado (não é domínio PLC)
 *   ✓ Nenhuma reimplementação de Truth, Learning ou F44/F45/F47
 *   ✓ Sem lógica de execução ou decisão
 *   ✓ Apenas normalização e persistência
 *
 * AIOI_INTEGRATION_CATALOG.md §2.5:
 *   unifiedOperationalIngestionService é soberano de fatos cognitivos.
 *   Este adapter trata eventos de comunicação com flag de risco operacional,
 *   não duplicando o pipeline cognitivo.
 */

const ingestion = require('./aioiEventIngestionService');

const LAYER = 'AIOI_COMM_ADAPTER';
const ADAPTER_VERSION = '0.2.0';
const SOURCE_TYPE = 'communication';

// ---------------------------------------------------------------------------
// Mapeamento: risk_level de comunicação → category + priority_band do IOE
// Sem cálculo — apenas mapeamento de vocabulário.
// ---------------------------------------------------------------------------

const RISK_LEVEL_TO_CATEGORY = {
  critica:  'communication_risk',
  alta:     'communication_risk',
  normal:   'communication_risk',
  baixa:    'communication_risk'
};

const RISK_LEVEL_TO_PRIORITY_BAND = {
  critica: 'high',
  alta:    'medium',
  normal:  'low',
  baixa:   'low'
};

const RISK_LEVEL_TO_SCORE = {
  critica: 60,
  alta:    40,
  normal:  15,
  baixa:   5
};

/**
 * Determina se a comunicação deve gerar um IOE.
 * Filtra comunicações sem flag de risco operacional.
 */
function _shouldIngest(communication) {
  if (!communication) return false;
  if (communication.aioi_skip === true) return false;

  const rl = String(communication.risk_level || communication.riskLevel || 'baixa').toLowerCase();
  // Apenas comunicações com risco critico ou alto geram IOE em P0
  return rl === 'critica' || rl === 'alta';
}

/**
 * Constrói payload IOE a partir de um registro de comunicação.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.tenantKey
 * @param {object} params.communication — registro da tabela communications
 * @param {string} [params.correlationId]
 * @param {Date}   [params.eventDate]
 * @returns {object} payload IOE normalizado
 */
function buildCommIoePayload({
  companyId,
  tenantKey,
  communication,
  correlationId,
  eventDate
}) {
  if (!companyId || !communication) {
    throw new Error(`${LAYER}: companyId e communication são obrigatórios`);
  }

  const commId   = communication.id || communication.comm_id;
  const eventDate_ = eventDate instanceof Date
    ? eventDate
    : communication.created_at
      ? new Date(communication.created_at)
      : new Date();

  const riskLevel = String(
    communication.risk_level || communication.riskLevel || 'baixa'
  ).toLowerCase();

  const idempotencyKey = ingestion.buildIdempotencyKey(
    SOURCE_TYPE, 'communication', commId || 'unknown', eventDate_
  );

  const corrId = correlationId
    ? String(correlationId).trim()
    : ingestion.generateCorrelationId();

  // priority_band e score: mapeamento de vocabulário (sem cálculo)
  const priorityBand  = RISK_LEVEL_TO_PRIORITY_BAND[riskLevel] || 'low';
  const priorityScore = RISK_LEVEL_TO_SCORE[riskLevel] || 5;

  const evidenceRefs = [
    {
      type:         'communication_risk',
      ref_id:       String(commId || ''),
      source_table: 'communications',
      confidence:   priorityScore,
      summary:      `Communication risk_level=${riskLevel} type=${communication.type || 'unknown'}`
    }
  ];

  return {
    company_id:      companyId,
    tenant_key:      tenantKey || companyId,
    idempotency_key: idempotencyKey,
    correlation_id:  corrId,
    external_ref_id: commId ? String(commId) : null,
    source_type:     SOURCE_TYPE,
    category:        RISK_LEVEL_TO_CATEGORY[riskLevel] || 'communication_risk',
    status:          'open',
    truth_state:     'provisional',
    priority_band:   priorityBand,
    priority_score:  priorityScore,
    scores_provisional: true,
    // Sem componentes de scoring PLC (domínio distinto)
    score_attention:      null,
    score_risk:           null,
    score_event_conf:     null,
    score_pattern_conf:   null,
    score_telemetry_hlth: null,
    classification_conf:  null,
    entity_type:      'communication',
    entity_id:        commId ? String(commId) : null,
    equipment_id:     communication.equipment_id || communication.machine_id || null,
    sector_id:        communication.sector_id || null,
    department_id:    communication.department_id || null,
    assigned_role_id: communication.assigned_role_id || null,
    hierarchy_level:  null,
    audience_key:     'ceo',
    escalation_level: 0,
    visibility_scope: 'company',
    evidence_refs:    evidenceRefs,
    decision_type:    null,
    decision_payload: null,
    kpi_snapshot:     null,
    raw_payload:      {
      type:         communication.type,
      risk_level:   riskLevel,
      subject:      communication.subject || communication.title || null,
      sender_id:    communication.sender_id || communication.created_by || null
    },
    adapter_version: ADAPTER_VERSION,
    aioi_version:    '0.2.0'
  };
}

/**
 * Processa um registro de comunicação e persiste como IOE se elegível.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.tenantKey
 * @param {object} params.communication
 * @param {string} [params.correlationId]
 * @param {Date}   [params.eventDate]
 * @returns {Promise<{ ok: boolean, skipped?: boolean, duplicate?: boolean, ioe_id?: string, error?: string }>}
 */
async function adaptAndIngestCommunication(params) {
  const { companyId, communication } = params;

  if (!companyId) {
    return { ok: false, error: 'companyId obrigatório' };
  }

  if (!_shouldIngest(communication)) {
    return { ok: true, skipped: true };
  }

  try {
    const ioePayload = buildCommIoePayload(params);
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
  adaptAndIngestCommunication,
  buildCommIoePayload,
  _shouldIngest
};
