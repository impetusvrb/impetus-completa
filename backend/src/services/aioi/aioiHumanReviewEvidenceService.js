'use strict';

/**
 * AIOI-P12.3 — Human Review Evidence Service
 *
 * Rastreabilidade de pacotes de revisão humana — READ ONLY.
 * Spec: backend/docs/AIOI_HUMAN_REVIEW_EVIDENCE_SPECIFICATION.md
 */

const humanDecisionAssistance = require('./aioiHumanDecisionAssistanceService');
const recommendationEvidence = require('./aioiRecommendationEvidenceService');
const observationEvidence = require('./aioiObservationEvidenceService');
const observationCatalog = require('./aioiObservationCatalogService');

const LAYER = 'AIOI_HUMAN_REVIEW_EVIDENCE';

const PHASE_REPORTS = [
  'AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_REPORT.md',
  'AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_REPORT.md'
];

function _isObservationTraceable(obsId, obsEvidence, catalogObservations) {
  const inEvidence = obsEvidence.chains.some(
    c => c.observation_id === obsId && c.traceability_status === 'TRACEABLE'
  );
  if (inEvidence) return true;

  const inCatalog = catalogObservations.find(o => o.observation_id === obsId);
  return Boolean(inCatalog?.evidence_sources?.length > 0);
}

function _isRecommendationTraceable(recId, recEvidence) {
  return recEvidence.chains.some(
    c => c.recommendation_id === recId && c.traceability_status === 'TRACEABLE'
  );
}

/**
 * Cadeias de evidência para todos os pacotes de revisão humana.
 * @returns {Promise<object>}
 */
async function getHumanReviewEvidenceChains() {
  const [assistance, recEvidence, obsEvidence, obsCatalog] = await Promise.all([
    humanDecisionAssistance.generateHumanDecisionAssistance(),
    recommendationEvidence.getRecommendationEvidenceChains(),
    observationEvidence.getObservationEvidenceChains(),
    observationCatalog.getObservationCatalog()
  ]);

  const catalogObservations = Object.values(obsCatalog.catalog).flat();

  const chains = assistance.packages.map(pkg => {
    const observationIds = pkg.observations.map(o => o.observation_id);
    const recommendationIds = pkg.recommendations.map(r => r.recommendation_id);

    const evidenceChain = [
      ...pkg.evidence_chain,
      ...PHASE_REPORTS.map(doc => ({
        link_type: 'phase_certification',
        source:    doc,
        field:     'certification_pass'
      }))
    ];

    const obsTraceable = observationIds.every(obsId =>
      _isObservationTraceable(obsId, obsEvidence, catalogObservations)
    );
    const recTraceable = recommendationIds.every(recId =>
      _isRecommendationTraceable(recId, recEvidence)
    );

    const traceabilityStatus = pkg.evidence_chain.length > 0 && obsTraceable && recTraceable
      ? 'TRACEABLE'
      : 'MISSING_EVIDENCE';

    return {
      assistance_id:       pkg.assistance_id,
      evidence_chain:      evidenceChain,
      recommendation_ids: recommendationIds,
      observation_ids:     observationIds,
      traceability_status: traceabilityStatus,
      evidence_count:      evidenceChain.length
    };
  });

  const allTraceable = chains.every(c => c.traceability_status === 'TRACEABLE');

  return {
    ok: allTraceable,
    layer: LAYER,
    chains,
    total_packages: chains.length,
    traceable_count: chains.filter(c => c.traceability_status === 'TRACEABLE').length,
    all_have_evidence: allTraceable,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getHumanReviewEvidenceChains,
  LAYER
};
