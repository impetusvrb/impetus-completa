'use strict';

/**
 * SEC-16 — Threat Deception DTO.
 */

function createThreatDeceptionDashboardDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'threat_deception_v1',
    read_only: true,
    enabled: input.enabled === true,
    mode: input.mode || 'observe',
    deceptionStatus: input.deceptionStatus || 'INACTIVE',
    deceptionConfidence: input.deceptionConfidence ?? null,
    engagementLevel: input.engagementLevel || 'NONE',
    fakeResourceRecommended: input.fakeResourceRecommended || null,
    evidenceGain: input.evidenceGain ?? null,
    recommendedScenario: input.recommendedScenario || null,
    approvalRequired: input.approvalRequired !== false,
    executionAllowed: false,
    honeypotProfiles: input.honeypotProfiles || [],
    scenarios: input.scenarios || [],
    engagement: input.engagement || null,
    evidence: input.evidence || null,
    deceptionPlans: input.deceptionPlans || [],
    modules_snapshot: input.modules_snapshot || {},
    metrics: input.metrics || {},
    disclaimer: input.disclaimer || 'SEC-16 — decepção consultiva only, nenhum honeypot exposto',
    generatedAt: input.generatedAt || now
  };
}

function freezeDto(obj) {
  return Object.freeze(JSON.parse(JSON.stringify(obj)));
}

module.exports = { createThreatDeceptionDashboardDto, freezeDto };
