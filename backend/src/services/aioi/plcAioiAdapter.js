'use strict';

/**
 * AIOI-P0.2 — Adapter PLC → IOE
 *
 * Transforma eventos/telemetria PLC existentes (F40–F47) em IOE normalizado
 * e os persiste via aioiEventIngestionService.
 *
 * SOBERANIA OBRIGATÓRIA (AIOI_SOVEREIGNTY_MAP.md):
 *   - Priority: operationalPrioritizationService.computePriorityScore() — REUSE
 *   - Truth:    industrialTruthEnforcementService — soberano externo; não reimplementado aqui
 *
 * ANTI_DUPLICATION_POLICY.md contratos P-01/P-02/P-03/P-04:
 *   ✓ Nenhum cálculo local de score PLC
 *   ✓ computePriorityScore() é a ÚNICA fonte de priority_score / priority_band
 *   ✓ buildPriorityEvidence() popula evidence_refs (contrato P-03)
 *   ✓ Nenhuma reimplementação de F44/F45/F47/Truth/Learning
 *
 * Fontes de entrada:
 *   - plc_collected_data (telemetria direta)
 *   - machine_detected_events (F44 events)
 *   - operational_pattern_packs (F45 patterns)
 *   - Bundles já carregados pelo operationalPrioritizationService
 */

const { v4: uuidv4 } = require('uuid');
const { isValidUUID } = require('../../utils/security');

// Serviço soberano de prioridade — REUSE (AIOI_INTEGRATION_CATALOG.md §2.1)
const {
  computePriorityScore,
  priorityLevelFromScore,
  buildPriorityEvidence
} = require('../operationalPrioritizationService');

const ingestion = require('./aioiEventIngestionService');

const LAYER = 'AIOI_PLC_ADAPTER';
const ADAPTER_VERSION = '0.2.0';

// ---------------------------------------------------------------------------
// Normalização de componentes de scoring
// Extrai campos do bundle PLC e os formata para computePriorityScore().
// NÃO contém nenhuma fórmula local de score.
// ---------------------------------------------------------------------------

/**
 * Extrai componentes de score de um evento/bundle PLC.
 * Todos os valores vêm dos serviços F40–F47; sem cálculo local.
 *
 * @param {object} plcEvent — evento ou bundle PLC
 * @returns {{ attention_score, risk_score, event_confidence, pattern_confidence, telemetry_health }}
 */
function _extractPlcComponents(plcEvent) {
  return {
    attention_score:   Number(plcEvent.attention_score   ?? plcEvent.attentionScore   ?? 0),
    risk_score:        Number(plcEvent.risk_score         ?? plcEvent.riskScore         ?? 0),
    event_confidence:  Number(plcEvent.event_confidence   ?? plcEvent.eventConfidence   ?? 0),
    pattern_confidence:Number(plcEvent.pattern_confidence ?? plcEvent.patternConfidence ?? 0),
    telemetry_health:  Number(plcEvent.telemetry_health   ?? plcEvent.telemetryHealth   ?? 100)
  };
}

/**
 * Mapeia event_type de F44 para category do IOE.
 * Sem lógica de scoring — apenas mapeamento de vocabulário.
 */
function _mapEventTypeToCategory(eventType) {
  const map = {
    EQUIPMENT_ATTENTION_CRITICAL: 'equipment_failure',
    EQUIPMENT_ATTENTION_REQUIRED: 'equipment_degradation',
    ALARM_ESCALATION:             'equipment_failure',
    SIGNAL_INSTABILITY:           'equipment_degradation',
    TELEMETRY_DEGRADATION:        'system_event',
    CORRELATED_DEVIATION:         'equipment_degradation',
    OBSERVED_OPERATIONAL_CHANGE:  'system_event',
    NORMAL_OPERATION:             'system_event',
    TELEMETRY_RECOVERY:           'system_event'
  };
  return map[String(eventType).toUpperCase()] || 'system_event';
}

// ---------------------------------------------------------------------------
// Adaptação de evento PLC → IOE payload
// ---------------------------------------------------------------------------

/**
 * Constrói o payload IOE a partir de um evento PLC.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.tenantKey
 * @param {object} params.plcEvent — evento PLC (F44/F45/F47 output)
 * @param {string} [params.sourceType='plc_event'] — 'plc_telemetry'|'plc_pattern'|'plc_event'
 * @param {string} [params.correlationId] — herdar do W2 ou gerar novo
 * @param {Date}   [params.eventDate]
 * @returns {object} payload IOE normalizado
 */
function buildPlcIoePayload({
  companyId,
  tenantKey,
  plcEvent,
  sourceType = 'plc_event',
  correlationId,
  eventDate
}) {
  if (!companyId || !plcEvent) {
    throw new Error(`${LAYER}: companyId e plcEvent são obrigatórios`);
  }

  const equipmentId = plcEvent.equipment_id || plcEvent.equipmentId || null;
  const entityId    = equipmentId ? String(equipmentId) : null;
  const eventDate_  = eventDate instanceof Date ? eventDate : new Date();

  // -------------------------------------------------------------------------
  // Idempotência: formato canônico spec §5
  // -------------------------------------------------------------------------
  const idempotencyKey = ingestion.buildIdempotencyKey(
    sourceType,
    'equipment',
    equipmentId || 'unknown',
    eventDate_
  );

  // -------------------------------------------------------------------------
  // correlation_id: herdar do W2 envelope ou gerar canônico
  // AIOI_IOE_SPECIFICATION.md §4
  // -------------------------------------------------------------------------
  const corrId = correlationId
    ? String(correlationId).trim()
    : ingestion.generateCorrelationId();

  // -------------------------------------------------------------------------
  // SOBERANIA PRIORITY (Contrato P-01/P-02/P-04):
  // Chamada OBRIGATÓRIA ao serviço soberano.
  // Nenhuma fórmula local aqui.
  // -------------------------------------------------------------------------
  const components = _extractPlcComponents(plcEvent);
  const priorityResult = computePriorityScore(components);

  // Contrato P-02: priority_band via priorityLevelFromScore() — não manual.
  // (computePriorityScore() já retorna priority_level; usar priorityLevelFromScore
  //  para garantir consistência caso components sejam recalculados)
  const priorityBand = priorityLevelFromScore(priorityResult.priority_score);

  // Contrato P-03: evidence_refs inclui buildPriorityEvidence()
  const priorityEvidence = buildPriorityEvidence({
    entity_type:    'equipment',
    entity_id:      entityId || 'unknown',
    equipment_id:   equipmentId,
    priority_score: priorityResult.priority_score,
    priority_level: priorityBand,
    contributors:   priorityResult.contributors,
    traceability:   priorityResult.traceability
  });

  // evidence_refs: ref ao pack F47
  const evidenceRefs = [
    {
      type:         'priority_pack_f47',
      ref_id:       plcEvent.pack_id || plcEvent.packId || uuidv4(),
      source_table: 'plc_collected_data',
      confidence:   priorityResult.priority_score,
      summary:      `F47 priority_score=${priorityResult.priority_score} band=${priorityBand} contributors=[${priorityResult.contributors.join(',')}]`,
      traceability: priorityEvidence
    }
  ];

  // Adicionar evidência de evento F44, se disponível
  if (plcEvent.event_id || plcEvent.eventId) {
    evidenceRefs.push({
      type:         'plc_event_f44',
      ref_id:       plcEvent.event_id || plcEvent.eventId,
      source_table: 'machine_detected_events',
      confidence:   Math.round(Number(plcEvent.event_confidence || 0)),
      summary:      plcEvent.event_type || 'PLC_EVENT'
    });
  }

  // Adicionar evidência de padrão F45, se disponível
  if (plcEvent.pattern_id || plcEvent.patternId) {
    evidenceRefs.push({
      type:         'plc_pattern_f45',
      ref_id:       plcEvent.pattern_id || plcEvent.patternId,
      source_table: 'operational_pattern_packs',
      confidence:   Math.round(Number(plcEvent.pattern_confidence || 0)),
      summary:      plcEvent.pattern_type || 'PLC_PATTERN'
    });
  }

  // -------------------------------------------------------------------------
  // truth_state: determinístico (sem LLM P0)
  // Spec §3.5 Contrato TC-01: telemetry_only quando sem MES conectado.
  // -------------------------------------------------------------------------
  const truthState = plcEvent.truth_state || 'telemetry_only';

  // -------------------------------------------------------------------------
  // category: mapeado do event_type F44 ou fornecido diretamente
  // -------------------------------------------------------------------------
  const category = plcEvent.category
    || _mapEventTypeToCategory(plcEvent.event_type || plcEvent.eventType || '');

  // -------------------------------------------------------------------------
  // raw_payload: truncado a 64KB (Spec §4 risco T4)
  // -------------------------------------------------------------------------
  let rawPayload = null;
  try {
    const raw = JSON.stringify(plcEvent);
    rawPayload = raw.length > 65536
      ? JSON.parse(raw.slice(0, 65500) + '..."}')
      : plcEvent;
  } catch (_) {
    rawPayload = null;
  }

  return {
    company_id:           companyId,
    tenant_key:           tenantKey || companyId,
    idempotency_key:      idempotencyKey,
    correlation_id:       corrId,
    external_ref_id:      plcEvent.id || plcEvent.event_id || null,
    source_type:          sourceType,
    category,
    status:               'open',
    truth_state:          truthState,
    priority_band:        priorityBand,
    priority_score:       priorityResult.priority_score,
    scores_provisional:   truthState !== 'grounded',
    // Componentes individuais de scoring (Spec §7)
    score_attention:      Math.round(components.attention_score),
    score_risk:           Math.round(components.risk_score),
    score_event_conf:     Math.round(components.event_confidence),
    score_pattern_conf:   Math.round(components.pattern_confidence),
    score_telemetry_hlth: Math.round(components.telemetry_health),
    classification_conf:  null,
    entity_type:          'equipment',
    entity_id:            equipmentId ? String(equipmentId) : null,
    equipment_id:         equipmentId || null,
    sector_id:            plcEvent.sector_id || null,
    department_id:        plcEvent.department_id || null,
    assigned_role_id:     plcEvent.assigned_role_id || null,
    hierarchy_level:      plcEvent.hierarchy_level != null ? Number(plcEvent.hierarchy_level) : null,
    audience_key:         'ceo',
    escalation_level:     0,
    visibility_scope:     'company',
    evidence_refs:        evidenceRefs,
    decision_type:        null,
    decision_payload:     null,
    kpi_snapshot:         null,
    raw_payload:          rawPayload,
    adapter_version:      ADAPTER_VERSION,
    aioi_version:         '0.2.0'
  };
}

// ---------------------------------------------------------------------------
// Entrada principal: adaptar e ingerir evento PLC
// ---------------------------------------------------------------------------

/**
 * Processa um evento PLC e persiste como IOE.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.tenantKey
 * @param {object} params.plcEvent
 * @param {string} [params.sourceType]
 * @param {string} [params.correlationId]
 * @param {Date}   [params.eventDate]
 * @returns {Promise<{ ok: boolean, duplicate?: boolean, ioe_id?: string, outbox_id?: string, error?: string }>}
 */
async function adaptAndIngestPlcEvent(params) {
  const { companyId, plcEvent } = params;

  if (!companyId) {
    console.error(`[${LAYER}] AIOI_ADAPTER_ERROR companyId ausente`);
    return { ok: false, error: 'companyId obrigatório' };
  }
  if (!plcEvent || typeof plcEvent !== 'object') {
    console.error(`[${LAYER}] AIOI_ADAPTER_ERROR plcEvent inválido`);
    return { ok: false, error: 'plcEvent inválido' };
  }

  try {
    const ioePayload = buildPlcIoePayload(params);
    const result = await ingestion.ingestIoe(ioePayload);

    if (result.ok && !result.duplicate) {
      console.info(`[${LAYER}] AIOI_IOE_CREATED plc event adaptado`, {
        ioe_id: result.ioe_id,
        company_id: companyId,
        equipment_id: plcEvent.equipment_id || plcEvent.equipmentId,
        priority_band: ioePayload.priority_band,
        priority_score: ioePayload.priority_score
      });
    }

    return result;
  } catch (err) {
    console.error(`[${LAYER}] AIOI_ADAPTER_ERROR`, {
      company_id: companyId,
      error: err.message
    });
    return { ok: false, error: err.message };
  }
}

module.exports = {
  adaptAndIngestPlcEvent,
  buildPlcIoePayload,
  _extractPlcComponents,
  _mapEventTypeToCategory
};
