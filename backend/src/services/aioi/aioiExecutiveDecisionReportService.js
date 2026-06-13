'use strict';

/**
 * AIOI-P8.4 — Executive Decision Report Service
 *
 * Relatório executivo de inteligência de decisão — READ ONLY.
 */

const decisionIntelligence = require('./aioiDecisionIntelligenceService');
const decisionHistory = require('./aioiDecisionHistoryCatalogService');
const decisionEffectiveness = require('./aioiDecisionEffectivenessService');
const decisionMaturity = require('./aioiDecisionMaturityService');
const governanceAssurance = require('./aioiGovernanceAssuranceService');

const LAYER = 'AIOI_EXECUTIVE_DECISION_REPORT';

/**
 * Gera relatório executivo de inteligência de decisão.
 * @returns {Promise<object>}
 */
async function generateExecutiveDecisionReport() {
  const [intelligence, history, effectiveness, maturity, assurance] = await Promise.all([
    decisionIntelligence.aggregateDecisionIntelligence(),
    decisionHistory.getDecisionHistoryCatalog(),
    decisionEffectiveness.getDecisionEffectiveness(),
    decisionMaturity.getDecisionMaturity(),
    governanceAssurance.validateContinuousGovernance()
  ]);

  let recommendation = 'MAINTAIN_DECISION_MONITORING';
  if (maturity.decision_maturity_score >= 70 && effectiveness.success_rate >= 0) {
    recommendation = 'EXECUTIVE_INTELLIGENCE_READY';
  } else if (maturity.decision_maturity_score >= 50) {
    recommendation = 'ACCUMULATE_DECISION_HISTORY';
  } else {
    recommendation = 'ESTABLISH_DECISION_BASELINE';
  }

  return {
    ok: true,
    layer: LAYER,
    decision_intelligence_summary: {
      operational_history: intelligence.operational_history,
      outcome_total:       intelligence.outcome_aggregation.total,
      compliance_score:    intelligence.compliance_aggregation.overall_score,
      risk_score:          intelligence.risk_aggregation.risk_score
    },
    decision_effectiveness_summary: {
      success_rate:         effectiveness.success_rate,
      partial_success_rate: effectiveness.partial_success_rate,
      failure_rate:         effectiveness.failure_rate,
      total_outcomes:       effectiveness.effectiveness_summary.total_outcomes
    },
    outcome_intelligence_summary: {
      distribution:      effectiveness.outcome_distribution,
      catalog:           history.decision_outcomes,
      learning:          effectiveness.learning_distribution
    },
    risk_intelligence_summary: {
      risk_level:      intelligence.risk_aggregation.risk_level,
      recurring_risks: intelligence.risk_aggregation.recurring_risks
    },
    sla_intelligence_summary: {
      compliance_rate: intelligence.sla_aggregation.compliance_rate,
      breached:        intelligence.sla_aggregation.breached,
      at_risk:         intelligence.sla_aggregation.at_risk,
      patterns:        intelligence.sla_aggregation.patterns
    },
    executive_intelligence_recommendation: {
      recommendation,
      maturity_score:    maturity.decision_maturity_score,
      maturity_level:    maturity.maturity_level,
      assurance_score:   assurance.governance_assurance_score,
      prerequisites: {
        governance_preserved: assurance.sovereign_protection_verification.all_sovereigns_protected,
        runtime_cognitive:    false,
        inference_enabled:    false
      }
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateExecutiveDecisionReport,
  LAYER
};
