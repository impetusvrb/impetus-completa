'use strict';

/**
 * AIOI-ORG-5 — SLA Engine Service
 *
 * Camada formal de SLA — apenas cálculo determinístico.
 * Sem automação. Sem execução. Sem workflow runtime.
 *
 * Spec: backend/docs/AIOI_SLA_ENGINE_SPECIFICATION.md
 */

const LAYER = 'AIOI_SLA_ENGINE';

const SLA_CLASS_HOURS = Object.freeze({
  CRITICAL_4H:  4,
  HIGH_8H:      8,
  MEDIUM_24H:  24,
  LOW_72H:     72
});

const PRIORITY_BAND_TO_SLA = Object.freeze({
  critical: 'CRITICAL_4H',
  high:     'HIGH_8H',
  medium:   'MEDIUM_24H',
  low:      'LOW_72H'
});

const BREACH_STATES = Object.freeze(['ON_TRACK', 'AT_RISK', 'BREACHED']);

const ESCALATION_LEVELS = Object.freeze(['LEVEL_0', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3']);

/**
 * Resolve sla_class a partir de priority_band (determinístico).
 * @param {string} priorityBand
 * @returns {string}
 */
function resolveSlaClass(priorityBand) {
  const band = String(priorityBand || 'low').toLowerCase();
  return PRIORITY_BAND_TO_SLA[band] || 'LOW_72H';
}

/**
 * Calcula due_at com base em sla_class e created_at.
 * @param {string} slaClass
 * @param {Date|string} createdAt
 * @returns {string} ISO timestamp
 */
function calculateDueDate(slaClass, createdAt) {
  const hours = SLA_CLASS_HOURS[slaClass] || SLA_CLASS_HOURS.LOW_72H;
  const base = createdAt instanceof Date ? createdAt : new Date(createdAt || Date.now());
  const due = new Date(base.getTime() + hours * 60 * 60 * 1000);
  return due.toISOString();
}

/**
 * Calcula aging em horas desde created_at até now (ou referenceDate).
 * @param {Date|string} createdAt
 * @param {Date} [referenceDate]
 * @returns {number}
 */
function calculateAging(createdAt, referenceDate) {
  const base = createdAt instanceof Date ? createdAt : new Date(createdAt || Date.now());
  const ref = referenceDate instanceof Date ? referenceDate : new Date();
  const diffMs = ref.getTime() - base.getTime();
  return Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
}

/**
 * Detecta breach_state com base em aging vs sla window.
 * ON_TRACK: < 75% do prazo
 * AT_RISK:  75%–100% do prazo
 * BREACHED: > 100% do prazo
 *
 * @param {number} agingHours
 * @param {string} slaClass
 * @returns {string}
 */
function detectBreach(agingHours, slaClass) {
  const totalHours = SLA_CLASS_HOURS[slaClass] || SLA_CLASS_HOURS.LOW_72H;
  const ratio = agingHours / totalHours;
  if (ratio >= 1.0) return 'BREACHED';
  if (ratio >= 0.75) return 'AT_RISK';
  return 'ON_TRACK';
}

/**
 * Detecta nível de escalação determinístico (sem ação automática).
 * @param {string} breachState
 * @param {string} priorityBand
 * @returns {string} LEVEL_0..LEVEL_3
 */
function detectEscalation(breachState, priorityBand) {
  const band = String(priorityBand || 'low').toLowerCase();
  if (breachState === 'BREACHED') {
    if (band === 'critical') return 'LEVEL_3';
    if (band === 'high') return 'LEVEL_2';
    return 'LEVEL_1';
  }
  if (breachState === 'AT_RISK') {
    if (band === 'critical' || band === 'high') return 'LEVEL_1';
    return 'LEVEL_0';
  }
  return 'LEVEL_0';
}

/**
 * Calcula snapshot SLA completo para um IOE.
 * @param {object} ioe
 * @param {Date} [referenceDate]
 * @returns {object}
 */
function computeSlaSnapshot(ioe, referenceDate) {
  const slaClass = ioe.sla_class || resolveSlaClass(ioe.priority_band);
  const createdAt = ioe.created_at || new Date().toISOString();
  const dueAt = ioe.due_at || calculateDueDate(slaClass, createdAt);
  const agingHours = calculateAging(createdAt, referenceDate);
  const breachState = detectBreach(agingHours, slaClass);
  const escalationLevel = detectEscalation(breachState, ioe.priority_band);

  return {
    sla_class: slaClass,
    due_at: dueAt,
    aging_hours: agingHours,
    breach_state: breachState,
    escalation_level: escalationLevel
  };
}

/**
 * Mapeia escalation_level string para SMALLINT IOE (0–3).
 * @param {string} levelStr
 * @returns {number}
 */
function escalationLevelToInt(levelStr) {
  const map = { LEVEL_0: 0, LEVEL_1: 1, LEVEL_2: 2, LEVEL_3: 3 };
  return map[String(levelStr)] ?? 0;
}

module.exports = {
  SLA_CLASS_HOURS,
  PRIORITY_BAND_TO_SLA,
  BREACH_STATES,
  ESCALATION_LEVELS,
  resolveSlaClass,
  calculateDueDate,
  calculateAging,
  detectBreach,
  detectEscalation,
  computeSlaSnapshot,
  escalationLevelToInt,
  LAYER
};
