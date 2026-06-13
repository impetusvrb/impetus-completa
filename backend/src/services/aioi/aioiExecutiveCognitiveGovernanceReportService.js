'use strict';

/**
 * AIOI-P9.7 — Executive Cognitive Governance Report Service
 *
 * Relatório executivo de governança cognitiva — READ ONLY.
 */

const authorityRegistry = require('./aioiCognitiveAuthorityRegistryService');
const boundary = require('./aioiCognitiveBoundaryService');
const authorization = require('./aioiCognitiveAuthorizationService');
const auditFramework = require('./aioiCognitiveAuditService');
const safety = require('./aioiCognitiveSafetyService');
const cognitiveReadiness = require('./aioiCognitiveReadinessService');

const LAYER = 'AIOI_EXECUTIVE_COGNITIVE_GOVERNANCE_REPORT';

/**
 * Gera relatório executivo consolidado de governança cognitiva.
 * @returns {Promise<object>}
 */
async function generateExecutiveCognitiveGovernanceReport() {
  const [registry, boundaries, authState, audit, safetyResult, readiness] = await Promise.all([
    Promise.resolve(authorityRegistry.getCognitiveAuthorityRegistry()),
    Promise.resolve(boundary.getBoundaryCatalog()),
    Promise.resolve(authorization.getAuthorizationState()),
    Promise.resolve(auditFramework.getCognitiveAuditFramework()),
    Promise.resolve(safety.validateSafetyInvariants()),
    cognitiveReadiness.validateCognitiveReadiness()
  ]);

  let recommendation = 'MAINTAIN_COGNITIVE_GOVERNANCE_FOUNDATION';
  if (readiness.cognitive_readiness && safetyResult.safety_valid) {
    recommendation = 'FOUNDATION_READY_FUTURE_COGNITIVE_PHASES';
  } else if (readiness.pass_count >= 6) {
    recommendation = 'REMEDIATE_GOVERNANCE_GAPS_BEFORE_COGNITIVE';
  } else {
    recommendation = 'DO_NOT_ENABLE_COGNITIVE_RUNTIME';
  }

  return {
    ok: true,
    layer: LAYER,
    cognitive_authority_summary: {
      observable_count:  registry.observable_domains.length,
      protected_count:   registry.protected_domains.length,
      sovereign_count:   registry.sovereign_domains.length,
      forbidden_count:   registry.forbidden_domains.length,
      org_protected:     registry.org_sovereigns_protected
    },
    boundary_summary: {
      total_boundaries:  boundaries.total_boundaries,
      categories:        boundaries.categories,
      execution_allowed: boundaries.execution_allowed
    },
    authorization_summary: {
      authorized:   authState.authorized,
      level:        authState.level,
      invariants:   authState.invariants
    },
    audit_readiness_summary: {
      total_requirements: audit.total_requirements,
      recording_enabled:  audit.recording_enabled,
      specification_only: audit.specification_only
    },
    safety_summary: {
      safety_valid: safetyResult.safety_valid,
      pass_count:   safetyResult.pass_count,
      total_checks: safetyResult.total_checks
    },
    governance_recommendation: {
      recommendation,
      cognitive_readiness: readiness.cognitive_readiness,
      pass_count:          readiness.pass_count,
      total_checks:        readiness.total_checks,
      prerequisites: {
        runtime_cognitive:     false,
        sovereigns_protected:  registry.org_sovereigns_protected,
        safety_valid:          safetyResult.safety_valid,
        authorization_none:    authState.level === 'NONE'
      }
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateExecutiveCognitiveGovernanceReport,
  LAYER
};
