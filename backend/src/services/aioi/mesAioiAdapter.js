'use strict';

/**
 * AIOI-P0.2 — Adapter MES/ERP → IOE
 *
 * Transforma dados push de MES/ERP (production_shift_data) em IOE normalizado.
 *
 * SOBERANIA obrigatória (AIOI_SOVEREIGNTY_MAP.md):
 *   - KPI MES: mesErpIntegrationService é soberano.
 *   - ESTE adapter NÃO calcula OEE, MTBF, MTTR.
 *   - Apenas armazena snapshots do que mesErpIntegrationService já processou.
 *
 * AIOI_IOE_SPECIFICATION.md §13 Contrato TC-04:
 *   kpi_snapshot.oee = null quando truth_state = 'telemetry_only'.
 *   Somente preencher OEE quando source = 'mes' (dado real do conector).
 *
 * ANTI_DUPLICATION_POLICY.md:
 *   ✓ Nenhum cálculo local de OEE / KPI
 *   ✓ Snapshots vêm exclusivamente de mesErpIntegrationService / production_shift_data
 *   ✓ Sem motor paralelo de MES
 */

const ingestion = require('./aioiEventIngestionService');

const LAYER = 'AIOI_MES_ADAPTER';
const ADAPTER_VERSION = '0.2.0';
const SOURCE_TYPE = 'mes_erp';

// ---------------------------------------------------------------------------
// Mapeamento de desvios MES → category + priority_band
// Sem cálculo — apenas vocabulário de negócio.
// ---------------------------------------------------------------------------

/**
 * Determina category e priority_band com base no desvio de produção.
 * deviationPct: percentual de desvio vs meta (0 = no target; 100 = 100% abaixo).
 * Sem fórmula de score — apenas faixas descritivas.
 */
function _classifyDeviation(deviationPct) {
  const d = Math.abs(Number(deviationPct) || 0);
  if (d >= 30) return { category: 'production_deviation', priority_band: 'high',   priority_score: 65 };
  if (d >= 15) return { category: 'production_deviation', priority_band: 'medium', priority_score: 40 };
  if (d >= 5)  return { category: 'kpi_deviation',        priority_band: 'low',    priority_score: 20 };
  return           { category: 'kpi_deviation',            priority_band: 'low',    priority_score: 10 };
}

/**
 * Determina se um registro MES deve gerar IOE.
 * P0: apenas registros com desvio >= 5% ou flag 'below_target'.
 */
function _shouldIngest(mesRecord) {
  if (!mesRecord) return false;
  if (mesRecord.aioi_skip === true) return false;

  const produced = Number(mesRecord.produced_qty ?? mesRecord.produced ?? 0);
  const target   = Number(mesRecord.target_qty   ?? mesRecord.target   ?? 0);
  if (target <= 0) return false;

  const deviationPct = ((target - produced) / target) * 100;
  return deviationPct >= 5 || mesRecord.below_target === true;
}

/**
 * Constrói o kpi_snapshot seguro (sem inventar OEE sem MES).
 * Spec §13 TC-04: oee=null quando truth_state='telemetry_only'.
 */
function _buildKpiSnapshot(mesRecord, hasMesConnector) {
  if (!hasMesConnector) {
    return {
      oee:    null,
      mtbf:   null,
      mttr:   null,
      source: 'unavailable'
    };
  }
  return {
    oee:    mesRecord.oee    != null ? Number(mesRecord.oee)    : null,
    mtbf:   mesRecord.mtbf   != null ? Number(mesRecord.mtbf)   : null,
    mttr:   mesRecord.mttr   != null ? Number(mesRecord.mttr)   : null,
    source: 'mes'
  };
}

/**
 * Constrói payload IOE a partir de um registro MES/ERP.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.tenantKey
 * @param {object} params.mesRecord — registro de production_shift_data ou payload push
 * @param {boolean} [params.hasMesConnector=false] — se há conector MES real ativo
 * @param {string}  [params.connectorId]
 * @param {string}  [params.correlationId]
 * @param {Date}    [params.eventDate]
 * @returns {object} payload IOE normalizado
 */
function buildMesIoePayload({
  companyId,
  tenantKey,
  mesRecord,
  hasMesConnector = false,
  connectorId,
  correlationId,
  eventDate
}) {
  if (!companyId || !mesRecord) {
    throw new Error(`${LAYER}: companyId e mesRecord são obrigatórios`);
  }

  const recordId  = mesRecord.id || mesRecord.shift_id || mesRecord.line_identifier;
  const shiftDate = mesRecord.shift_date || mesRecord.shiftDate;
  const eventDate_ = eventDate instanceof Date
    ? eventDate
    : shiftDate
      ? new Date(shiftDate)
      : new Date();

  // Idempotência por linha + turno + data
  const lineKey = String(mesRecord.line_identifier || mesRecord.line_id || recordId || 'unknown')
    .replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, 40);
  const idempotencyKey = ingestion.buildIdempotencyKey(
    SOURCE_TYPE, 'line', lineKey, eventDate_
  );

  const corrId = correlationId
    ? String(correlationId).trim()
    : ingestion.generateCorrelationId();

  // Desvio vs meta (sem calcular OEE)
  const produced = Number(mesRecord.produced_qty ?? mesRecord.produced ?? 0);
  const target   = Number(mesRecord.target_qty   ?? mesRecord.target   ?? 0);
  const deviationPct = target > 0 ? ((target - produced) / target) * 100 : 0;
  const { category, priority_band, priority_score } = _classifyDeviation(deviationPct);

  // truth_state: grounded apenas quando há conector MES real
  const truthState = hasMesConnector ? 'grounded' : 'telemetry_only';

  // kpi_snapshot soberano (AIOI_INTEGRATION_CATALOG.md §2.10)
  const kpiSnapshot = _buildKpiSnapshot(mesRecord, hasMesConnector);

  const evidenceRefs = [
    {
      type:         'mes_shift_data',
      ref_id:       recordId ? String(recordId) : '',
      source_table: 'production_shift_data',
      confidence:   priority_score,
      summary:      `MES shift=${mesRecord.shift_code || '?'} produced=${produced} target=${target} deviation=${Math.round(deviationPct)}% connector=${connectorId || 'none'}`
    }
  ];

  return {
    company_id:      companyId,
    tenant_key:      tenantKey || companyId,
    idempotency_key: idempotencyKey,
    correlation_id:  corrId,
    external_ref_id: recordId ? String(recordId) : null,
    source_type:     SOURCE_TYPE,
    category,
    status:          'open',
    truth_state:     truthState,
    priority_band,
    priority_score,
    scores_provisional: truthState !== 'grounded',
    score_attention:      null,
    score_risk:           null,
    score_event_conf:     null,
    score_pattern_conf:   null,
    score_telemetry_hlth: null,
    classification_conf:  null,
    entity_type:      'line',
    entity_id:        recordId ? String(recordId) : null,
    equipment_id:     null,
    sector_id:        mesRecord.sector_id || null,
    department_id:    mesRecord.department_id || null,
    assigned_role_id: null,
    hierarchy_level:  null,
    audience_key:     'ceo',
    escalation_level: 0,
    visibility_scope: 'company',
    evidence_refs:    evidenceRefs,
    decision_type:    null,
    decision_payload: null,
    kpi_snapshot:     kpiSnapshot,
    raw_payload:      {
      line_identifier: mesRecord.line_identifier || mesRecord.line_id,
      shift_code:      mesRecord.shift_code,
      shift_date:      shiftDate,
      produced_qty:    produced,
      target_qty:      target,
      deviation_pct:   Math.round(deviationPct * 100) / 100,
      connector_id:    connectorId || null
    },
    adapter_version: ADAPTER_VERSION,
    aioi_version:    '0.2.0'
  };
}

/**
 * Processa um registro MES e persiste como IOE se elegível.
 *
 * @param {object} params
 * @returns {Promise<{ ok: boolean, skipped?: boolean, duplicate?: boolean, ioe_id?: string, error?: string }>}
 */
async function adaptAndIngestMesRecord(params) {
  const { companyId, mesRecord } = params;

  if (!companyId) {
    return { ok: false, error: 'companyId obrigatório' };
  }

  if (!_shouldIngest(mesRecord)) {
    return { ok: true, skipped: true };
  }

  try {
    const ioePayload = buildMesIoePayload(params);
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
  adaptAndIngestMesRecord,
  buildMesIoePayload,
  _shouldIngest,
  _classifyDeviation,
  _buildKpiSnapshot
};
