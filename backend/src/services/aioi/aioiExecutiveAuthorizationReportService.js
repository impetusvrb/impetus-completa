'use strict';

/**
 * AIOI-P13.7 — Executive Authorization Report Service
 *
 * Relatório executivo de modelagem de autorização — READ ONLY.
 */

const cognitiveAuthorizationModeling = require('./aioiCognitiveAuthorizationModelingService');
const authorizationCatalog = require('./aioiAuthorizationCatalogService');
const authorizationEvidence = require('./aioiAuthorizationEvidenceService');
const authorizationBoundary = require('./aioiAuthorizationBoundaryService');
const authorizationSafety = require('./aioiAuthorizationSafetyService');
const authorizationReadiness = require('./aioiAuthorizationReadinessService');
const authorityRegistry = require('./aioiCognitiveAuthorityRegistryService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_EXECUTIVE_AUTHORIZATION_REPORT';

/**
 * Gera relatório executivo consolidado de modelagem de autorização.
 * @returns {Promise<object>}
 */
async function generateExecutiveAuthorizationReport() {
  const [models, catalog, evidence, boundaries, safety, readiness, registry, authState] = await Promise.all([
    cognitiveAuthorizationModeling.generateAuthorizationModels(),
    authorizationCatalog.getAuthorizationCatalog(),
    authorizationEvidence.getAuthorizationEvidenceChains(),
    authorizationBoundary.validateAuthorizationBoundaries(),
    authorizationSafety.validateAuthorizationSafety(),
    authorizationReadiness.validateAuthorizationReadiness(),
    Promise.resolve(authorityRegistry.getCognitiveAuthorityRegistry()),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState())
  ]);

  const levelBreakdown = {};
  for (const m of models.models) {
    levelBreakdown[m.requested_level] = (levelBreakdown[m.requested_level] || 0) + 1;
  }

  const allControls = models.models.flatMap(m => m.required_controls);
  const uniqueControls = [...new Set(allControls)];

  return {
    ok: true,
    layer: LAYER,
    authorization_modeling_summary: {
      total_models:              models.model_count,
      categories:                models.models.map(m => m.category),
      level_breakdown:           levelBreakdown,
      all_authorization_denied:  models.all_authorization_denied,
      modeling_only:             models.modeling_only,
      current_auth_level:        authState.level
    },
    authorization_control_summary: {
      unique_controls:     uniqueControls,
      control_count:       uniqueControls.length,
      all_require_human:   models.models.every(m => m.required_approvals.includes('operational_lead'))
    },
    evidence_summary: {
      traceable_count:   evidence.traceable_count,
      total_models:      evidence.total_models,
      all_have_evidence: evidence.all_have_evidence
    },
    governance_summary: {
      org_protected:      registry.org_sovereigns_protected,
      protected_count:    registry.protected_domains.length,
      catalog_total:      catalog.total_models,
      boundaries_valid:   boundaries.boundaries_valid,
      authorized:         authState.authorized
    },
    safety_summary: {
      safety_valid: safety.safety_valid,
      pass_count:   safety.pass_count,
      total_checks: safety.total_checks
    },
    authorization_readiness_summary: {
      authorization_readiness: readiness.authorization_readiness,
      pass_count:              readiness.pass_count,
      total_checks:            readiness.total_checks
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateExecutiveAuthorizationReport,
  LAYER
};
