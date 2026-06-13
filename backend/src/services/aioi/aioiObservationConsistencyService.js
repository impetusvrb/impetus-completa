'use strict';

/**
 * AIOI-P10.4 — Observation Consistency Service
 *
 * Validação de consistência P6/P7/P8/P9 — sem correção automática.
 * Spec: backend/docs/AIOI_OBSERVATION_CONSISTENCY_SPECIFICATION.md
 */

const governanceAssurance = require('./aioiGovernanceAssuranceService');
const knowledgeMaturity = require('./aioiKnowledgeMaturityService');
const decisionMaturity = require('./aioiDecisionMaturityService');
const cognitiveReadiness = require('./aioiCognitiveReadinessService');
const cognitiveObservation = require('./aioiCognitiveObservationService');
const authorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_OBSERVATION_CONSISTENCY';

/**
 * Valida consistência entre camadas certificadas e observações.
 * @returns {Promise<object>}
 */
async function validateObservationConsistency() {
  const [assurance, knowledge, decision, cognitive, observations, authState] = await Promise.all([
    governanceAssurance.validateContinuousGovernance(),
    knowledgeMaturity.getKnowledgeMaturity(),
    decisionMaturity.getDecisionMaturity(),
    cognitiveReadiness.validateCognitiveReadiness(),
    cognitiveObservation.generateStructuredObservations(),
    Promise.resolve(authorization.getAuthorizationState())
  ]);

  const checks = [
    {
      phase: 'P6',
      name: 'assurance',
      pass: assurance.governance_assurance_score >= 0
        && observations.observations.some(o => o.category === 'compliance'),
      detail: { assurance_score: assurance.governance_assurance_score }
    },
    {
      phase: 'P7',
      name: 'knowledge',
      pass: knowledge.knowledge_maturity_score >= 0
        && observations.observation_count >= 4,
      detail: { knowledge_maturity: knowledge.knowledge_maturity_score }
    },
    {
      phase: 'P8',
      name: 'intelligence',
      pass: decision.decision_maturity_score >= 0
        && observations.observations.some(o => o.category === 'decision'),
      detail: { decision_maturity: decision.decision_maturity_score }
    },
    {
      phase: 'P9',
      name: 'governance',
      pass: cognitive.pass_count >= 6
        && !authState.authorized
        && authState.level === 'NONE',
      detail: { cognitive_pass: cognitive.pass_count }
    }
  ];

  const passCount = checks.filter(c => c.pass).length;
  const consistent = passCount === checks.length;

  return {
    ok: consistent,
    layer: LAYER,
    consistent,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    auto_correction: false,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateObservationConsistency,
  LAYER
};
