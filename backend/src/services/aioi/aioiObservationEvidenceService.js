'use strict';

/**
 * AIOI-P10.3 — Observation Evidence Service
 *
 * Rastreabilidade de evidências por observação — READ ONLY.
 * Spec: backend/docs/AIOI_OBSERVATION_EVIDENCE_SPECIFICATION.md
 */

const cognitiveObservation = require('./aioiCognitiveObservationService');

const LAYER = 'AIOI_OBSERVATION_EVIDENCE';

const REPORT_SOURCES = [
  'AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md',
  'AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_REPORT.md',
  'AIOI_P8_EXECUTIVE_DECISION_INTELLIGENCE_REPORT.md',
  'AIOI_P9_COGNITIVE_GOVERNANCE_FOUNDATION_REPORT.md'
];

/**
 * Constrói cadeia de evidências para todas as observações.
 * @returns {Promise<object>}
 */
async function getObservationEvidenceChains() {
  const { observations } = await cognitiveObservation.generateStructuredObservations();

  const chains = observations.map(obs => {
    const evidenceChain = [
      ...obs.evidence_sources.map(e => ({
        link_type: 'metric_snapshot',
        source:    e.source,
        field:     e.field,
        type:      e.type
      })),
      ...REPORT_SOURCES.map(doc => ({
        link_type: 'certification_report',
        source:    doc,
        field:     'certification_pass'
      }))
    ];

    const traceabilityStatus = obs.evidence_sources.length > 0 ? 'TRACEABLE' : 'MISSING_EVIDENCE';

    return {
      observation_id:      obs.observation_id,
      evidence_chain:      evidenceChain,
      traceability_status: traceabilityStatus,
      evidence_count:      evidenceChain.length
    };
  });

  const allTraceable = chains.every(c => c.traceability_status === 'TRACEABLE');

  return {
    ok: allTraceable,
    layer: LAYER,
    chains,
    total_observations: chains.length,
    traceable_count:    chains.filter(c => c.traceability_status === 'TRACEABLE').length,
    all_have_evidence:  allTraceable,
    captured_at: new Date().toISOString()
  };
}

/**
 * Cadeia de evidências para uma observação específica.
 * @param {string} observationId
 * @returns {Promise<object|null>}
 */
async function getEvidenceChainForObservation(observationId) {
  const result = await getObservationEvidenceChains();
  const chain = result.chains.find(c => c.observation_id === observationId);
  return chain || null;
}

module.exports = {
  getObservationEvidenceChains,
  getEvidenceChainForObservation,
  LAYER
};
