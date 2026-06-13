'use strict';

/**
 * AIOI-ORG-5 — Classification Engine (P0.8)
 *
 * Classificação determinística de IOEs — ZERO LLM.
 * Produz: category, criticity, priority_band, confidence, sla_class.
 *
 * Fluxo permitido: open → triaged APENAS.
 * Proibido: open → approved | open → executing
 */

const slaEngine = require('./aioiSlaEngineService');

const LAYER = 'AIOI_CLASSIFICATION_ENGINE';

const VALID_CATEGORIES = new Set([
  'equipment_failure', 'equipment_degradation', 'production_deviation',
  'quality_issue', 'safety_incident', 'maintenance_required', 'communication_risk',
  'task_overdue', 'environmental_alert', 'kpi_deviation', 'system_event'
]);

const CATEGORY_TO_CRITICITY = Object.freeze({
  equipment_failure:     'CRITICAL',
  safety_incident:       'CRITICAL',
  equipment_degradation: 'HIGH',
  production_deviation:  'HIGH',
  quality_issue:         'HIGH',
  maintenance_required:  'MEDIUM',
  communication_risk:    'MEDIUM',
  task_overdue:          'MEDIUM',
  environmental_alert:   'MEDIUM',
  kpi_deviation:         'LOW',
  system_event:          'LOW'
});

const SOURCE_TYPE_CONFIDENCE_BASE = Object.freeze({
  plc_telemetry:  85,
  plc_pattern:      80,
  plc_event:        82,
  mes_erp:          70,
  work_order:       65,
  task:             60,
  communication:    55,
  quality_nc:       75,
  safety_event:     88,
  environmental:    72,
  manual:           50,
  cognitive_ingestion: 40
});

/**
 * Resolve category — mantém existente se válida, senão infere de source_type.
 * @param {object} ioe
 * @returns {string}
 */
function resolveCategory(ioe) {
  if (ioe.category && VALID_CATEGORIES.has(ioe.category)) {
    return ioe.category;
  }
  const sourceMap = {
    plc_telemetry: 'equipment_degradation',
    plc_event:     'equipment_failure',
    plc_pattern:   'equipment_degradation',
    mes_erp:       'kpi_deviation',
    work_order:    'maintenance_required',
    task:          'task_overdue',
    communication: 'communication_risk',
    safety_event:  'safety_incident'
  };
  return sourceMap[ioe.source_type] || 'system_event';
}

/**
 * Resolve criticity determinística a partir da category.
 * @param {string} category
 * @returns {string}
 */
function resolveCriticity(category) {
  return CATEGORY_TO_CRITICITY[category] || 'LOW';
}

/**
 * Resolve priority_band — preserva existente se válida.
 * @param {object} ioe
 * @returns {string}
 */
function resolvePriorityBand(ioe) {
  const valid = ['critical', 'high', 'medium', 'low'];
  if (ioe.priority_band && valid.includes(ioe.priority_band)) {
    return ioe.priority_band;
  }
  const criticity = resolveCriticity(resolveCategory(ioe));
  const map = { CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };
  return map[criticity] || 'low';
}

/**
 * Calcula confidence determinística (0–99).
 * Base por source_type + bónus por evidence_refs.
 * @param {object} ioe
 * @returns {number}
 */
function resolveConfidence(ioe) {
  const base = SOURCE_TYPE_CONFIDENCE_BASE[ioe.source_type] || 50;
  const evidenceBonus = Math.min(15, (Array.isArray(ioe.evidence_refs) ? ioe.evidence_refs.length : 0) * 3);
  const scoreBonus = ioe.priority_score >= 70 ? 5 : 0;
  return Math.min(99, Math.max(0, base + evidenceBonus + scoreBonus));
}

/**
 * Classifica um IOE de forma determinística.
 * @param {object} ioe — registro IOE (status='open')
 * @returns {object} classification result
 */
function classifyIoe(ioe) {
  if (!ioe || typeof ioe !== 'object') {
    return { ok: false, error: 'IOE inválido' };
  }

  if (ioe.status && ioe.status !== 'open') {
    return { ok: false, error: `Transição inválida: status=${ioe.status} — apenas open→triaged permitido` };
  }

  const category = resolveCategory(ioe);
  const criticity = resolveCriticity(category);
  const priority_band = resolvePriorityBand({ ...ioe, category });
  const confidence = resolveConfidence(ioe);
  const sla_class = slaEngine.resolveSlaClass(priority_band);
  const slaSnapshot = slaEngine.computeSlaSnapshot({
    ...ioe,
    priority_band,
    sla_class,
    created_at: ioe.created_at || new Date().toISOString()
  });

  return {
    ok: true,
    classification: {
      category,
      criticity,
      priority_band,
      confidence,
      sla_class: slaSnapshot.sla_class,
      due_at: slaSnapshot.due_at,
      aging_hours: slaSnapshot.aging_hours,
      breach_state: slaSnapshot.breach_state,
      escalation_level: slaSnapshot.escalation_level,
      escalation_level_int: slaEngine.escalationLevelToInt(slaSnapshot.escalation_level),
      target_status: 'triaged',
      // P1.4 — evidência preservada (não mutada pela classificação)
      correlation_id:  ioe.correlation_id || null,
      external_ref_id: ioe.external_ref_id || null,
      truth_state:     ioe.truth_state || null,
      evidence_refs:   Array.isArray(ioe.evidence_refs) ? ioe.evidence_refs : [],
      scores_provisional: ioe.scores_provisional
    }
  };
}

module.exports = {
  classifyIoe,
  resolveCategory,
  resolveCriticity,
  resolvePriorityBand,
  resolveConfidence,
  VALID_CATEGORIES,
  CATEGORY_TO_CRITICITY,
  LAYER
};
