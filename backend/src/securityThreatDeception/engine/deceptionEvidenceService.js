'use strict';

/**
 * SEC-16 — Evidence Enrichment.
 * Produz indicadores para SEC-02 — nunca duplica eventos.
 */

const store = require('../store/threatDeceptionStore');
const metrics = require('../metrics/threatDeceptionMetrics');

function enrichEvidence(incidents, scenarios, engagement, sec14Dashboard) {
  const indicators = [];
  const fingerprints = [];
  const timeline = [];

  for (const scn of scenarios || []) {
    indicators.push({
      type: 'DECEPTION_SCENARIO_CANDIDATE',
      scenarioId: scn.scenarioId,
      scenarioType: scn.scenarioType,
      honeypotProfile: scn.honeypotProfile?.profileId,
      incidentId: scn.incidentId,
      ref: `sec16:scenario:${scn.scenarioId}`,
      duplicate: false
    });

    timeline.push({
      ts: scn.createdAt,
      type: 'DECEPTION_SCENARIO',
      label: scn.title,
      scenarioId: scn.scenarioId,
      incidentId: scn.incidentId
    });
  }

  for (const inc of incidents.slice(0, 10)) {
    timeline.push({
      ts: inc.lastSeen || inc.firstSeen,
      type: 'INCIDENT_REF',
      label: `${inc.severity} ${inc.classification}`,
      incidentId: inc.incidentId,
      sec02Ref: `sec02:incident:${inc.incidentId}`
    });
  }

  if (sec14Dashboard?.fingerprints) {
    for (const fp of sec14Dashboard.fingerprints.slice(0, 5)) {
      fingerprints.push({
        source: 'SEC-14',
        fingerprintId: fp.fingerprintId,
        confidence: fp.fingerprintConfidence,
        enriched: true,
        ref: `sec14:fingerprint:${fp.fingerprintId}`
      });
    }
  }

  if (engagement) {
    indicators.push({
      type: 'ENGAGEMENT_SIGNAL',
      deceptionConfidence: engagement.deceptionConfidence,
      attackerPersistence: engagement.attackerPersistence,
      scannerSophistication: engagement.scannerSophistication,
      ref: `sec16:engagement:${engagement.profileId}`
    });
  }

  const enrichment = {
    schema_version: 'deception_evidence_v1',
    enrichmentId: `evr-${Date.now()}`,
    indicators,
    additionalFingerprints: fingerprints,
    timeline: timeline.sort((a, b) => String(b.ts).localeCompare(String(a.ts))).slice(0, 30),
    sec02References: incidents.map((i) => ({
      incidentId: i.incidentId,
      ref: `sec02:incident:${i.incidentId}`,
      action: 'ENRICH_ONLY',
      duplicateEvent: false
    })),
    evidenceGain: Math.min(1, indicators.length * 0.08 + fingerprints.length * 0.05),
    disclaimer: 'Enriquecimento consultivo — nenhum evento duplicado em SEC-02'
  };

  store.addEvidenceRef(enrichment);
  metrics.increment('evidence_enrichment');
  return enrichment;
}

module.exports = { enrichEvidence };
