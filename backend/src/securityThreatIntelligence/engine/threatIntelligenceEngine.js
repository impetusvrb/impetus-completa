'use strict';

/**
 * SEC-03 — Threat Intelligence Engine (orquestrador).
 * Read-only sobre incidentes SEC-02 — nunca altera Incident DTO.
 */

const flags = require('../config/securityThreatIntelligenceFlags');
const store = require('../store/threatProfileStore');
const metrics = require('../metrics/threatIntelligenceMetrics');
const { createThreatProfileDto, freezeProfile } = require('../dto/threatProfileDto');
const { resolveProvidersForIncident } = require('./providerRegistry');
const { extractThreatIndicators } = require('./indicatorExtractor');
const { assessCampaign } = require('./campaignAssessor');
const { analyzeHistoricalSimilarity } = require('./historicalIntelligence');
const {
  determinePrimaryAssessment,
  buildOriginAssessment,
  buildIntentAssessment,
  buildPersistenceAssessment,
  buildTargetAssessment,
  buildRecommendations,
  computeProfileConfidence,
  mapRiskLevel
} = require('./threatAssessor');

/**
 * Analisa um incidente SEC-02 e produz Threat Profile.
 * @param {object} incident — read-only (frozen copy recomendado)
 * @returns {object|null}
 */
function analyzeIncident(incident) {
  if (!flags.isSecurityThreatIntelligenceEnabled()) return null;
  if (!incident || !incident.incidentId) return null;

  metrics.increment('threat_profiles');

  try {
    const snapshot = JSON.parse(JSON.stringify(incident));
    const priorProfiles = store.getHistoricalProfiles(incident.incidentId);

    const providers = resolveProvidersForIncident(snapshot);
    for (const p of providers) {
      metrics.recordProvider(p.id);
    }
    for (const asn of snapshot.participants?.asns || []) {
      metrics.recordAsn(asn);
    }

    const primaryAssessment = determinePrimaryAssessment(snapshot);
    if (primaryAssessment === 'UNKNOWN') metrics.increment('unknown_profiles');

    const indicators = extractThreatIndicators(snapshot);
    const originAssessment = buildOriginAssessment(snapshot, providers);
    const intentAssessment = buildIntentAssessment(snapshot, primaryAssessment);
    const persistenceAssessment = buildPersistenceAssessment(snapshot);
    const targetAssessment = buildTargetAssessment(snapshot);
    const campaignAssessment = assessCampaign(snapshot, priorProfiles);
    metrics.increment('campaign_assessments');

    const historicalSimilarity = analyzeHistoricalSimilarity(snapshot, priorProfiles);
    if (historicalSimilarity.occurred_before) {
      metrics.increment('historical_matches');
    }

    const assessments = { origin: originAssessment, intent: intentAssessment, persistence: persistenceAssessment, target: targetAssessment };
    const confidence = computeProfileConfidence(assessments);
    const recommendations = buildRecommendations(snapshot, primaryAssessment, indicators);

    const profile = createThreatProfileDto({
      incidentId: snapshot.incidentId,
      confidence,
      originAssessment,
      campaignAssessment,
      persistenceAssessment,
      intentAssessment,
      targetAssessment,
      historicalSimilarity,
      affectedAssets: [...(snapshot.affectedComponents || [])],
      threatIndicators: indicators,
      recommendations,
      riskLevel: mapRiskLevel(primaryAssessment, snapshot),
      primaryAssessment,
      providerHints: providers.map((p) => ({ id: p.id, name: p.name, confidence: p.confidence })),
      asnHints: (snapshot.participants?.asns || []).map((a) => ({ asn: a }))
    });

    profile._incidentSnapshot = {
      incidentId: snapshot.incidentId,
      classification: snapshot.classification,
      firstSeen: snapshot.firstSeen,
      lastSeen: snapshot.lastSeen,
      durationMs: snapshot.durationMs,
      severity: snapshot.severity,
      participants: snapshot.participants,
      affectedComponents: snapshot.affectedComponents,
      metrics: snapshot.metrics
    };

    store.upsertProfile(profile);
    return freezeProfile(stripInternal(profile));
  } catch (e) {
    metrics.increment('assessment_errors');
    throw e;
  }
}

function stripInternal(profile) {
  const out = { ...profile };
  delete out._incidentSnapshot;
  return out;
}

/**
 * Analisa todos os incidentes do SEC-02 store.
 * @returns {object[]}
 */
function analyzeAllIncidents() {
  if (!flags.isSecurityThreatIntelligenceEnabled()) return [];

  let incidents = [];
  try {
    const sec02 = require('../../securityCorrelation');
    incidents = sec02.store.getAllIncidents();
  } catch (_e) {
    return [];
  }

  const results = [];
  for (const inc of incidents) {
    const profile = analyzeIncident(inc);
    if (profile) results.push(profile);
  }
  return results;
}

/**
 * Re-analisa incidente por ID.
 * @param {string} incidentId
 * @returns {object|null}
 */
function analyzeIncidentById(incidentId) {
  try {
    const sec02 = require('../../securityCorrelation');
    const inc = sec02.store.getIncident(incidentId);
    if (!inc) return null;
    return analyzeIncident(inc);
  } catch (_e) {
    return null;
  }
}

module.exports = {
  analyzeIncident,
  analyzeAllIncidents,
  analyzeIncidentById
};
