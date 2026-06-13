'use strict';

/**
 * AIOI-P11.1 — Cognitive Recommendation Service
 *
 * Recomendações estruturadas a partir de observações P10 — artefacto analítico only.
 * Spec: backend/docs/AIOI_COGNITIVE_RECOMMENDATION_SPECIFICATION.md
 */

const crypto = require('crypto');
const cognitiveObservation = require('./aioiCognitiveObservationService');
const observationCatalog = require('./aioiObservationCatalogService');
const governanceAssurance = require('./aioiGovernanceAssuranceService');

const LAYER = 'AIOI_COGNITIVE_RECOMMENDATION';

const CATEGORY_MAP = {
  throughput: 'workflow',
  sla:        'sla',
  risk:       'risk',
  capacity:   'capacity',
  compliance: 'compliance',
  governance: 'governance',
  decision:   'decision',
  workflow:   'workflow'
};

function _recommendationId(category, index) {
  const hash = crypto.createHash('sha256')
    .update(`REC:${category}:${index}:${new Date().toISOString().slice(0, 10)}`)
    .digest('hex')
    .slice(0, 16);
  return `REC-${category.toUpperCase()}-${hash}`;
}

function _confidenceFromEvidence(evidenceCount) {
  if (evidenceCount >= 3) return 'HIGH';
  if (evidenceCount >= 2) return 'MEDIUM';
  return 'LOW';
}

function _buildRecommendationText(obs) {
  const cat = CATEGORY_MAP[obs.category] || obs.catalog_category || obs.category;
  return `Artefacto analítico (não decisório): documentar revisão analítica de ${cat} com base na observação ${obs.observation_id}. Sem execução, sem autorização, sem alteração de estado.`;
}

function _observationToRecommendation(obs, index) {
  const category = CATEGORY_MAP[obs.category] || obs.catalog_category || obs.category;
  const evidenceChain = [
    ...obs.evidence_sources.map(e => ({
      link_type: 'observation_evidence',
      source:    e.source,
      field:     e.field
    })),
    {
      link_type: 'observation_ref',
      source:    'aioiCognitiveObservationService',
      field:     obs.observation_id
    }
  ];

  return {
    recommendation_id:        _recommendationId(category, index),
    category,
    recommendation_text:      _buildRecommendationText(obs),
    supporting_observations:  [obs.observation_id],
    evidence_chain:           evidenceChain,
    confidence_level:         _confidenceFromEvidence(obs.evidence_sources.length),
    is_decision:              false,
    is_execution:             false,
    is_authorized:              false,
    generated_at:             new Date().toISOString()
  };
}

/**
 * Gera recomendações estruturadas a partir de observações P10.
 * @returns {Promise<object>}
 */
async function generateStructuredRecommendations() {
  const [observations, catalog, assurance] = await Promise.all([
    cognitiveObservation.generateStructuredObservations(),
    observationCatalog.getObservationCatalog(),
    governanceAssurance.validateContinuousGovernance()
  ]);

  const allObservations = Object.values(catalog.catalog).flat();
  const recommendations = allObservations.map(_observationToRecommendation);

  if (!recommendations.some(r => r.category === 'governance')) {
    recommendations.push({
      recommendation_id:       _recommendationId('governance', 99),
      category:              'governance',
      recommendation_text:     `Artefacto analítico (não decisório): documentar postura de governança com assurance_score=${assurance.governance_assurance_score}. Sem execução, sem autorização.`,
      supporting_observations: observations.observations.map(o => o.observation_id).slice(0, 3),
      evidence_chain: [{
        link_type: 'assurance',
        source:    'aioiGovernanceAssuranceService',
        field:     'governance_assurance_score'
      }],
      confidence_level: _confidenceFromEvidence(1),
      is_decision:      false,
      is_execution:     false,
      is_authorized:    false,
      generated_at:     new Date().toISOString()
    });
  }

  return {
    ok: true,
    layer: LAYER,
    recommendations,
    recommendation_count: recommendations.length,
    categories: [...new Set(recommendations.map(r => r.category))],
    analytical_artifact_only: true,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  generateStructuredRecommendations,
  LAYER
};
