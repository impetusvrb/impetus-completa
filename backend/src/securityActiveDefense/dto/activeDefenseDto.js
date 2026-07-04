'use strict';

/**
 * SEC-10 — Defense Recommendation DTO.
 */

const PRIORITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

function createDefenseRecommendationDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'defense_recommendation_v1',
    recommendationId: input.recommendationId || `def-rec-${Date.now()}`,
    incidentId: input.incidentId || null,
    priority: PRIORITIES.includes(input.priority) ? input.priority : 'LOW',
    attackPattern: input.attackPattern || 'UNKNOWN',
    threatLevel: input.threatLevel || 'LOW',
    securityMode: input.securityMode || 'NORMAL',
    title: input.title || 'Defense Recommendation',
    summary: input.summary || null,
    recommended_actions: Array.isArray(input.recommended_actions)
      ? [...input.recommended_actions]
      : [],
    evidence_refs: Array.isArray(input.evidence_refs) ? [...input.evidence_refs] : [],
    threatScore: Math.min(1, Math.max(0, Number(input.threatScore) || 0)),
    riskScore: Math.min(1, Math.max(0, Number(input.riskScore) || 0)),
    integrityStatus: input.integrityStatus || 'UNKNOWN',
    rollback: input.rollback || { action: 'SECURITY_ACTIVE_DEFENSE=false', note: 'Desactivar camada SEC-10' },
    read_only: true,
    auto_execute: false,
    createdAt: input.createdAt || now
  };
}

function createActiveDefenseDashboardDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'active_defense_dashboard_v1',
    read_only: true,
    active_defense_enabled: input.active_defense_enabled === true,
    defense_mode: input.defense_mode || 'observe',
    currentMode: input.currentMode || 'NORMAL',
    threatLevel: input.threatLevel || 'LOW',
    attackPatterns: Array.isArray(input.attackPatterns) ? [...input.attackPatterns] : [],
    integrity: input.integrity || { status: 'UNKNOWN', score: null },
    notifications: input.notifications || { pending: [], prepared: [] },
    recommendations: Array.isArray(input.recommendations) ? [...input.recommendations] : [],
    evidence: input.evidence || { incidents: [], campaigns: [] },
    timeline: Array.isArray(input.timeline) ? [...input.timeline] : [],
    operatorPackages: Array.isArray(input.operatorPackages) ? [...input.operatorPackages] : [],
    modules_snapshot: input.modules_snapshot || {},
    metrics: input.metrics || {},
    generatedAt: input.generatedAt || now
  };
}

function freezeDto(obj) {
  return Object.freeze(JSON.parse(JSON.stringify(obj)));
}

module.exports = {
  PRIORITIES,
  createDefenseRecommendationDto,
  createActiveDefenseDashboardDto,
  freezeDto
};
