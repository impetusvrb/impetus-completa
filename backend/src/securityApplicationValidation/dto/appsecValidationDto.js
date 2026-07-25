'use strict';

/**
 * APPSEC-02 — DTOs de validação Red Team (schema v1).
 */

const COMPARISON_STATUS = Object.freeze({
  FIXED: 'FIXED',
  PARTIALLY_FIXED: 'PARTIALLY_FIXED',
  NOT_FIXED: 'NOT_FIXED',
  REGRESSION: 'REGRESSION',
  NOT_APPLICABLE: 'NOT_APPLICABLE'
});

const CERTIFICATION_DECISION = Object.freeze({
  APPSEC_CERTIFIED: 'APPSEC_CERTIFIED',
  APPSEC_CERTIFIED_WITH_REMARKS: 'APPSEC_CERTIFIED_WITH_REMARKS',
  APPSEC_FAILED: 'APPSEC_FAILED'
});

const SCENARIO_RESULT = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  SKIP: 'SKIP',
  WARN: 'WARN'
});

/**
 * @param {object} partial
 */
function createScenarioResult(partial) {
  return Object.freeze({
    schema_version: 'appsec_scenario_v1',
    id: partial.id,
    category: partial.category,
    title: partial.title,
    hypothesis: partial.hypothesis,
    result: partial.result,
    exploitable: partial.exploitable ?? false,
    evidence: partial.evidence || {},
    executed_at: partial.executed_at || new Date().toISOString(),
    duration_ms: partial.duration_ms ?? 0,
    notes: partial.notes || null
  });
}

/**
 * @param {object} partial
 */
function createComparisonEntry(partial) {
  return Object.freeze({
    finding_id: partial.finding_id,
    baseline_priority: partial.baseline_priority,
    baseline_risk: partial.baseline_risk,
    status: partial.status,
    before_summary: partial.before_summary,
    after_summary: partial.after_summary,
    scenario_ids: partial.scenario_ids || [],
    impact_operational: partial.impact_operational || null
  });
}

/**
 * @param {object} partial
 */
function createCertificationPayload(partial) {
  return Object.freeze({
    schema_version: 'appsec_validation_v1',
    program: 'APPSEC-02',
    baseline_report: 'Red Team 2026-07-04',
    appsec_layer: 'APPSEC-01',
    generated_at: partial.generated_at || new Date().toISOString(),
    decision: partial.decision,
    scores: partial.scores,
    comparison: partial.comparison,
    scenarios: partial.scenarios,
    regressions: partial.regressions || [],
    residual_risk: partial.residual_risk,
    owasp: partial.owasp,
    enterprise_compliance: partial.enterprise_compliance,
    certification: partial.certification || null,
    execution: partial.execution || null,
    evidence_paths: partial.evidence_paths || [],
    read_only: true
  });
}

module.exports = {
  COMPARISON_STATUS,
  CERTIFICATION_DECISION,
  SCENARIO_RESULT,
  createScenarioResult,
  createComparisonEntry,
  createCertificationPayload
};
