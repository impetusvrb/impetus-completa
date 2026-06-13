'use strict';

/**
 * AIOI-P12.1 — Human Decision Assistance Service
 *
 * Pacotes de revisão humana a partir de observações P10 e recomendações P11.
 * Spec: backend/docs/AIOI_HUMAN_DECISION_ASSISTANCE_SPECIFICATION.md
 */

const crypto = require('crypto');
const observationCatalog = require('./aioiObservationCatalogService');
const recommendationCatalog = require('./aioiRecommendationCatalogService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const slaCompliance = require('./aioiSlaComplianceService');
const operationalRiskRegister = require('./aioiOperationalRiskRegisterService');

const LAYER = 'AIOI_HUMAN_DECISION_ASSISTANCE';

const REVIEW_CATEGORIES = [
  'workflow', 'decision', 'sla', 'risk', 'capacity', 'governance', 'compliance'
];

function _assistanceId(category, index) {
  const hash = crypto.createHash('sha256')
    .update(`HDA:${category}:${index}:${new Date().toISOString().slice(0, 10)}`)
    .digest('hex')
    .slice(0, 16);
  return `HDA-${category.toUpperCase()}-${hash}`;
}

function _buildEvidenceChain(observations, recommendations) {
  const chain = [];

  for (const obs of observations) {
    for (const e of obs.evidence_sources || []) {
      chain.push({
        link_type: 'observation_evidence',
        source:    e.source,
        field:     e.field
      });
    }
    chain.push({
      link_type: 'observation_ref',
      source:    'aioiCognitiveObservationService',
      field:     obs.observation_id
    });
  }

  for (const rec of recommendations) {
    chain.push({
      link_type: 'recommendation_ref',
      source:    'aioiCognitiveRecommendationService',
      field:     rec.recommendation_id
    });
    for (const link of rec.evidence_chain || []) {
      chain.push({ ...link, link_type: link.link_type || 'recommendation_evidence' });
    }
  }

  return chain;
}

function _contextEvidence(compliance, sla, risk) {
  return [
    {
      link_type: 'compliance_snapshot',
      source:    'aioiComplianceAnalyticsService',
      field:     'overall_compliance_score',
      value:     compliance.overall_compliance_score
    },
    {
      link_type: 'sla_snapshot',
      source:    'aioiSlaComplianceService',
      field:     'sla_compliance_rate',
      value:     sla.sla_compliance_rate
    },
    {
      link_type: 'risk_snapshot',
      source:    'aioiOperationalRiskRegisterService',
      field:     'risk_score',
      value:     risk.risk_score
    }
  ];
}

/**
 * Consolida observações, recomendações, evidências, compliance, SLA e riscos
 * em pacotes de revisão humana — READ ONLY.
 * @returns {Promise<object>}
 */
async function generateHumanDecisionAssistance() {
  const [obsCatalog, recCatalog, compliance, sla, risk] = await Promise.all([
    observationCatalog.getObservationCatalog(),
    recommendationCatalog.getRecommendationCatalog(),
    complianceAnalytics.getComplianceAnalytics(),
    slaCompliance.getSlaComplianceSnapshot(),
    operationalRiskRegister.getOperationalRiskRegister()
  ]);

  const contextEvidence = _contextEvidence(compliance, sla, risk);
  const packages = [];

  REVIEW_CATEGORIES.forEach((category, index) => {
    const observations = obsCatalog.catalog[category] || [];
    const recommendations = recCatalog.catalog[category] || [];

    if (observations.length === 0 && recommendations.length === 0) return;

    const evidenceChain = [
      ..._buildEvidenceChain(observations, recommendations),
      ...contextEvidence
    ];

    packages.push({
      assistance_id:    _assistanceId(category, index),
      category,
      observations:     observations.map(o => ({
        observation_id:   o.observation_id,
        observation_text: o.observation_text
      })),
      recommendations:  recommendations.map(r => ({
        recommendation_id:   r.recommendation_id,
        recommendation_text: r.recommendation_text,
        confidence_level:    r.confidence_level
      })),
      evidence_chain:   evidenceChain,
      review_required:  true,
      human_sovereign:  true,
      is_decision:      false,
      is_execution:     false,
      is_authorized:    false,
      generated_at:     new Date().toISOString()
    });
  });

  return {
    ok: true,
    layer: LAYER,
    packages,
    package_count: packages.length,
    all_review_required: packages.every(p => p.review_required === true),
    human_in_the_loop: true,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  generateHumanDecisionAssistance,
  REVIEW_CATEGORIES,
  LAYER
};
