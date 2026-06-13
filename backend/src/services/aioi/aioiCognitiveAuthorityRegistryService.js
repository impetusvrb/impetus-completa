'use strict';

/**
 * AIOI-P9.1 — Cognitive Authority Registry Service
 *
 * Catálogo formal de domínios cognitivos — READ ONLY.
 * Spec: backend/docs/AIOI_COGNITIVE_AUTHORITY_SPECIFICATION.md
 */

const LAYER = 'AIOI_COGNITIVE_AUTHORITY_REGISTRY';

const OBSERVABLE_DOMAINS = [
  { id: 'operational_metrics',   scope: 'metrics',        boundary: 'OBSERVE_ONLY' },
  { id: 'audit_trail',           scope: 'audit',          boundary: 'OBSERVE_ONLY' },
  { id: 'knowledge_catalog',     scope: 'knowledge',      boundary: 'OBSERVE_ONLY' },
  { id: 'decision_history',      scope: 'decision',       boundary: 'OBSERVE_ONLY' },
  { id: 'compliance_analytics',  scope: 'compliance',     boundary: 'OBSERVE_ONLY' },
  { id: 'operational_evidence',  scope: 'evidence',       boundary: 'OBSERVE_ONLY' }
];

const PROTECTED_DOMAINS = [
  { id: 'ORG-1', name: 'Queue Sovereignty',       token: 'AIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_PASS', sovereign: 'aioi_executive_queue_snapshot' },
  { id: 'ORG-2', name: 'Truth Stage 7',           token: 'AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_PASS', sovereign: 'industrialTruthEnforcementService' },
  { id: 'ORG-3', name: 'F49 Certification Closure', token: 'AIOI_ORG_3_F49_CERTIFICATION_CLOSURE_PASS', sovereign: 'truth_program_closure' },
  { id: 'ORG-4', name: 'P0 Production Pilot',     token: 'AIOI_ORG_4_P0_PRODUCTION_PILOT_CERTIFICATION_PASS', sovereign: 'aioi_p0_pilot' },
  { id: 'ORG-5', name: 'Workflow SLA Readiness',  token: 'AIOI_ORG_5_WORKFLOW_SLA_READINESS_PASS', sovereign: 'workflowOrchestrator' }
];

const SOVEREIGN_DOMAINS = [
  { id: 'priority',  sovereign: 'operationalPrioritizationService',  protected: true },
  { id: 'truth',     sovereign: 'industrialTruthEnforcementService', protected: true },
  { id: 'workflow',  sovereign: 'workflowOrchestrator',              protected: true },
  { id: 'execution', sovereign: 'actionRuntimeOrchestrator',         protected: true },
  { id: 'learning',  sovereign: 'operationalLearningService',        protected: true },
  { id: 'queue',     sovereign: 'aioi_executive_queue_snapshot',     protected: true },
  { id: 'decision',  sovereign: 'aioi_decision_bridge',              protected: true }
];

const FORBIDDEN_DOMAINS = [
  { id: 'cognitive_runtime',       reason: 'Runtime cognitivo proibido P9' },
  { id: 'autonomous_execution',    reason: 'Execução autónoma proibida' },
  { id: 'sovereign_mutation',      reason: 'Alteração de soberanos proibida' },
  { id: 'workflow_mutation',       reason: 'Alteração de workflow proibida' },
  { id: 'compliance_mutation',     reason: 'Alteração de compliance proibida' },
  { id: 'governance_mutation',     reason: 'Alteração de governança proibida' },
  { id: 'auto_expansion',          reason: 'Auto-expansão proibida CS-01' },
  { id: 'auto_modification',       reason: 'Auto-modificação proibida CS-02' },
  { id: 'cognitive_inference',     reason: 'Inferência cognitiva proibida' },
  { id: 'cognitive_prediction',    reason: 'Previsão cognitiva proibida' }
];

/**
 * Retorna registo formal de autoridades cognitivas.
 * @returns {object}
 */
function getCognitiveAuthorityRegistry() {
  return {
    ok: true,
    layer: LAYER,
    observable_domains:  OBSERVABLE_DOMAINS,
    protected_domains:   PROTECTED_DOMAINS,
    sovereign_domains:   SOVEREIGN_DOMAINS,
    forbidden_domains:   FORBIDDEN_DOMAINS,
    org_sovereigns_protected: PROTECTED_DOMAINS.every(d => d.id.startsWith('ORG-')),
    runtime_cognitive: false,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getCognitiveAuthorityRegistry,
  OBSERVABLE_DOMAINS,
  PROTECTED_DOMAINS,
  SOVEREIGN_DOMAINS,
  FORBIDDEN_DOMAINS,
  LAYER
};
