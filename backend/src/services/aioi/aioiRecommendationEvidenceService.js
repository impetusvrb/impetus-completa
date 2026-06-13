'use strict';

/**
 * AIOI-P11.3 — Recommendation Evidence Service
 *
 * Rastreabilidade de recomendações — READ ONLY.
 * Spec: backend/docs/AIOI_RECOMMENDATION_EVIDENCE_SPECIFICATION.md
 */

const cognitiveRecommendation = require('./aioiCognitiveRecommendationService');
const observationEvidence = require('./aioiObservationEvidenceService');
const observationCatalog = require('./aioiObservationCatalogService');

const LAYER = 'AIOI_RECOMMENDATION_EVIDENCE';

const PHASE_REPORTS = [
  'AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md',
  'AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_REPORT.md',
  'AIOI_P8_EXECUTIVE_DECISION_INTELLIGENCE_REPORT.md',
  'AIOI_P9_COGNITIVE_GOVERNANCE_FOUNDATION_REPORT.md',
  'AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_REPORT.md'
];

/**
 * Cadeias de evidência para todas as recomendações.
 * @returns {Promise<object>}
 */
function _isObservationTraceable(obsId, obsEvidence, catalogObservations) {
  const inEvidence = obsEvidence.chains.some(
    c => c.observation_id === obsId && c.traceability_status === 'TRACEABLE'
  );
  if (inEvidence) return true;

  const inCatalog = catalogObservations.find(o => o.observation_id === obsId);
  return Boolean(inCatalog?.evidence_sources?.length > 0);
}

async function getRecommendationEvidenceChains() {
  const [recResult, obsEvidence, obsCatalog] = await Promise.all([
    cognitiveRecommendation.generateStructuredRecommendations(),
    observationEvidence.getObservationEvidenceChains(),
    observationCatalog.getObservationCatalog()
  ]);

  const catalogObservations = Object.values(obsCatalog.catalog).flat();

  const chains = recResult.recommendations.map(rec => {
    const evidenceChain = [
      ...rec.evidence_chain,
      ...PHASE_REPORTS.map(doc => ({
        link_type: 'phase_certification',
        source:    doc,
        field:     'certification_pass'
      }))
    ];

    const supportingObservations = rec.supporting_observations || [];
    const obsTraceable = supportingObservations.every(obsId =>
      _isObservationTraceable(obsId, obsEvidence, catalogObservations)
    );

    const traceabilityStatus = rec.evidence_chain.length > 0 && obsTraceable
      ? 'TRACEABLE'
      : 'MISSING_EVIDENCE';

    return {
      recommendation_id:       rec.recommendation_id,
      evidence_chain:          evidenceChain,
      supporting_observations: supportingObservations,
      traceability_status:     traceabilityStatus,
      evidence_count:          evidenceChain.length
    };
  });

  const allTraceable = chains.every(c => c.traceability_status === 'TRACEABLE');

  return {
    ok: allTraceable,
    layer: LAYER,
    chains,
    total_recommendations: chains.length,
    traceable_count:       chains.filter(c => c.traceability_status === 'TRACEABLE').length,
    all_have_evidence:     allTraceable,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getRecommendationEvidenceChains,
  LAYER
};
