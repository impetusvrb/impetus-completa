'use strict';

/**
 * AIOI-P7.3 — Operational Pattern Analytics Service
 *
 * Agregação estatística de padrões operacionais — sem inferência, sem previsão.
 * Spec: backend/docs/AIOI_OPERATIONAL_PATTERN_SPECIFICATION.md
 */

const operationalKnowledge = require('./aioiOperationalKnowledgeService');
const tenantCapacity = require('./aioiTenantCapacityService');
const operationalRiskRegister = require('./aioiOperationalRiskRegisterService');

const LAYER = 'AIOI_OPERATIONAL_PATTERN';

function _toRecurrencePattern(items, keyFn, minCount = 1) {
  return items
    .filter(i => (i.occurrence_count || i.count || 0) >= minCount)
    .map(i => ({
      key:              keyFn(i),
      occurrence_count: i.occurrence_count || i.count || 0,
      recurrence_rate:  null
    }));
}

/**
 * Identifica padrões operacionais por agregação estatística.
 * @returns {Promise<object>}
 */
async function getOperationalPatterns() {
  const [knowledge, capacity, risk] = await Promise.all([
    operationalKnowledge.consolidateOperationalKnowledge(),
    tenantCapacity.getTenantCapacitySnapshot(),
    operationalRiskRegister.getOperationalRiskRegister()
  ]);

  const eventRecurrence = _toRecurrencePattern(
    knowledge.recurring_events,
    e => `${e.category}:${e.source_type}`
  );

  const outcomeRecurrence = _toRecurrencePattern(
    knowledge.outcome_catalog,
    o => o.outcome_type
  );

  const slaRecurrence = _toRecurrencePattern(
    knowledge.sla_patterns,
    s => `${s.priority_band}:${s.breach_state}`
  );

  const riskRecurrence = knowledge.recurring_risks.map(r => ({
    category:         r.category,
    level:            r.level,
    score:            r.score,
    occurrence_count: r.score > 0 ? 1 : 0
  }));

  const capacityRecurrence = capacity.tenants.map(t => ({
    company_id:       t.company_id,
    saturation_level: t.tenant_operational_saturation?.level,
    saturation_score: t.tenant_operational_saturation?.score,
    queue_pending:    t.tenant_queue_volume?.pending || 0
  }));

  const totalEvents = knowledge.recurring_events.reduce(
    (sum, e) => sum + e.occurrence_count, 0
  );

  return {
    ok: true,
    layer: LAYER,
    event_recurrence:     eventRecurrence,
    outcome_recurrence:   outcomeRecurrence,
    risk_recurrence:      riskRecurrence,
    sla_recurrence:       slaRecurrence,
    capacity_recurrence:  capacityRecurrence,
    aggregation_method:   'STATISTICAL_COUNT',
    inference_enabled:    false,
    prediction_enabled:   false,
    pattern_summary: {
      event_patterns:    eventRecurrence.length,
      outcome_patterns:  outcomeRecurrence.length,
      sla_patterns:      slaRecurrence.length,
      risk_patterns:     riskRecurrence.length,
      capacity_patterns: capacityRecurrence.length,
      total_event_count: totalEvents,
      risk_score:        risk.risk_score
    },
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getOperationalPatterns,
  LAYER
};
