'use strict';

/**
 * AIOI-P10.7 — Executive Observation Report Service
 *
 * Relatório executivo de observação cognitiva — READ ONLY.
 */

const cognitiveObservation = require('./aioiCognitiveObservationService');
const observationCatalog = require('./aioiObservationCatalogService');
const observationEvidence = require('./aioiObservationEvidenceService');
const observationConsistency = require('./aioiObservationConsistencyService');
const observationSafety = require('./aioiObservationSafetyService');
const observationReadiness = require('./aioiObservationReadinessService');
const authorityRegistry = require('./aioiCognitiveAuthorityRegistryService');

const LAYER = 'AIOI_EXECUTIVE_OBSERVATION_REPORT';

/**
 * Gera relatório executivo consolidado de observação.
 * @returns {Promise<object>}
 */
async function generateExecutiveObservationReport() {
  const [observations, catalog, evidence, consistency, safety, readiness, registry] = await Promise.all([
    cognitiveObservation.generateStructuredObservations(),
    observationCatalog.getObservationCatalog(),
    observationEvidence.getObservationEvidenceChains(),
    observationConsistency.validateObservationConsistency(),
    observationSafety.validateObservationSafety(),
    observationReadiness.validateObservationReadiness(),
    Promise.resolve(authorityRegistry.getCognitiveAuthorityRegistry())
  ]);

  return {
    ok: true,
    layer: LAYER,
    observation_summary: {
      total_observations: observations.observation_count,
      categories:         observations.categories,
      interpretation_free: observations.interpretation_free,
      catalog_total:      catalog.total_observations
    },
    evidence_summary: {
      traceable_count:   evidence.traceable_count,
      total_observations: evidence.total_observations,
      all_have_evidence: evidence.all_have_evidence
    },
    consistency_summary: {
      consistent:   consistency.consistent,
      pass_count:   consistency.pass_count,
      total_checks: consistency.total_checks
    },
    governance_summary: {
      org_protected:     registry.org_sovereigns_protected,
      protected_count:   registry.protected_domains.length,
      forbidden_count:   registry.forbidden_domains.length
    },
    safety_summary: {
      safety_valid: safety.safety_valid,
      pass_count:   safety.pass_count,
      total_checks: safety.total_checks
    },
    observation_readiness_summary: {
      observation_readiness: readiness.observation_readiness,
      pass_count:            readiness.pass_count,
      total_checks:          readiness.total_checks
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateExecutiveObservationReport,
  LAYER
};
