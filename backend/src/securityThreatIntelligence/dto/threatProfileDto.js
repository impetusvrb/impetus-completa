'use strict';

/**
 * SEC-03 — Threat Profile DTO.
 * Enriquece incidentes SEC-02 — nunca altera o Incident DTO original.
 */

const ASSESSMENT_LEVELS = Object.freeze(['Confirmed', 'Likely', 'Possible', 'Unknown']);
const THREAT_TYPES = Object.freeze([
  'BACKGROUND_INTERNET_NOISE',
  'GENERIC_SCANNER',
  'CLOUD_SCANNER',
  'CREDENTIAL_SCANNER',
  'RECON_CAMPAIGN',
  'PERSISTENT_ENUMERATION',
  'OPERATIONAL_ACCESS',
  'CRAWLER',
  'UNKNOWN',
  'SUSPICIOUS'
]);

let profileSeq = 0;

function nextThreatProfileId() {
  profileSeq += 1;
  return `tp-${Date.now()}-${profileSeq.toString(36)}`;
}

/**
 * @param {object} input
 * @returns {object}
 */
function createThreatProfileDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'threat_profile_v1',
    threatProfileId: input.threatProfileId || nextThreatProfileId(),
    incidentId: input.incidentId || null,
    confidence: Math.min(1, Math.max(0, Number(input.confidence) || 0)),
    originAssessment: input.originAssessment || emptyAssessment('origin'),
    campaignAssessment: input.campaignAssessment || emptyAssessment('campaign'),
    persistenceAssessment: input.persistenceAssessment || emptyAssessment('persistence'),
    intentAssessment: input.intentAssessment || emptyAssessment('intent'),
    targetAssessment: input.targetAssessment || emptyAssessment('target'),
    historicalSimilarity: input.historicalSimilarity || emptyHistorical(),
    affectedAssets: Array.isArray(input.affectedAssets) ? [...input.affectedAssets] : [],
    threatIndicators: Array.isArray(input.threatIndicators) ? [...input.threatIndicators] : [],
    recommendations: Array.isArray(input.recommendations) ? [...input.recommendations] : [],
    riskLevel: input.riskLevel || 'Unknown',
    primaryAssessment: THREAT_TYPES.includes(input.primaryAssessment)
      ? input.primaryAssessment
      : 'UNKNOWN',
    providerHints: input.providerHints || [],
    asnHints: input.asnHints || [],
    disclaimer: 'Avaliação baseada em evidências internas. Não infere identidade nem número de actores.',
    analyzedAt: input.analyzedAt || now,
    updatedAt: input.updatedAt || now
  };
}

function emptyAssessment(kind) {
  return {
    kind,
    level: 'Unknown',
    label: 'Evidência insuficiente',
    hypothesis: null,
    confidence: 0,
    evidence: []
  };
}

function emptyHistorical() {
  return {
    occurred_before: false,
    prior_incident_ids: [],
    behavior_changed: null,
    asn_changed: null,
    schedule_changed: null,
    target_changed: null,
    volume_changed: null,
    pattern_changed: null,
    similarity_score: 0,
    notes: []
  };
}

function freezeProfile(profile) {
  return Object.freeze(JSON.parse(JSON.stringify(profile)));
}

module.exports = {
  ASSESSMENT_LEVELS,
  THREAT_TYPES,
  createThreatProfileDto,
  freezeProfile,
  nextThreatProfileId,
  emptyAssessment,
  emptyHistorical
};
