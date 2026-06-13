'use strict';

/**
 * AIOI-P15.7 — Executive Runtime Validation Report Service
 *
 * Relatório executivo de validação de runtime — READ ONLY.
 */

const cognitiveRuntimeValidation = require('./aioiCognitiveRuntimeValidationService');
const runtimeValidationCatalog = require('./aioiRuntimeValidationCatalogService');
const runtimeValidationEvidence = require('./aioiRuntimeValidationEvidenceService');
const runtimeBoundary = require('./aioiRuntimeBoundaryService');
const runtimeSafety = require('./aioiRuntimeSafetyService');
const runtimeReadiness = require('./aioiRuntimeReadinessService');
const authorityRegistry = require('./aioiCognitiveAuthorityRegistryService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_EXECUTIVE_RUNTIME_VALIDATION_REPORT';

/**
 * Gera relatório executivo consolidado de validação de runtime.
 * @returns {Promise<object>}
 */
async function generateExecutiveRuntimeValidationReport() {
  const [validations, catalog, evidence, boundaries, safety, readiness, registry, authState] = await Promise.all([
    cognitiveRuntimeValidation.generateRuntimeValidation(),
    runtimeValidationCatalog.getRuntimeValidationCatalog(),
    runtimeValidationEvidence.getRuntimeValidationEvidenceChains(),
    runtimeBoundary.validateRuntimeBoundaries(),
    runtimeSafety.validateRuntimeSafety(),
    runtimeReadiness.validateRuntimeReadiness(),
    Promise.resolve(authorityRegistry.getCognitiveAuthorityRegistry()),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState())
  ]);

  const allConstraints = validations.validations.map(v => v.runtime_constraints);
  const allDependencies = validations.validations.flatMap(v => v.runtime_dependencies);

  return {
    ok: true,
    layer: LAYER,
    runtime_validation_summary: {
      total_validations:    validations.validation_count,
      categories:           validations.validations.map(v => v.category),
      all_runtime_denied:   validations.all_runtime_denied,
      validation_only:      validations.validation_only,
      runtime_possible:     false
    },
    constraint_summary: {
      runtime_enabled:             false,
      runtime_active:              false,
      runtime_authorized:          false,
      cognitive_execution_allowed: false,
      validations_with_constraints: allConstraints.length
    },
    dependency_summary: {
      total_dependencies:  allDependencies.length,
      layers_referenced: [...new Set(allDependencies.map(d => d.layer))]
    },
    evidence_summary: {
      traceable_count:   evidence.traceable_count,
      total_validations: evidence.total_validations,
      all_have_evidence: evidence.all_have_evidence
    },
    governance_summary: {
      org_protected:      registry.org_sovereigns_protected,
      protected_count:    registry.protected_domains.length,
      catalog_total:      catalog.total_validations,
      boundaries_valid:   boundaries.boundaries_valid,
      authorized:         authState.authorized
    },
    safety_summary: {
      safety_valid: safety.safety_valid,
      pass_count:   safety.pass_count,
      total_checks: safety.total_checks
    },
    runtime_readiness_summary: {
      runtime_readiness: readiness.runtime_readiness,
      pass_count:        readiness.pass_count,
      total_checks:      readiness.total_checks
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateExecutiveRuntimeValidationReport,
  LAYER
};
