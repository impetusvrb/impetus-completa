'use strict';

/**
 * SEC-07 — Security SOC DTO (consolidação unificada).
 */

const SOC_STATUSES = Object.freeze(['SECURE', 'ELEVATED', 'DEGRADED', 'CRITICAL', 'UNKNOWN']);
const THREAT_LEVELS = Object.freeze(['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']);

/**
 * @param {object} input
 * @returns {object}
 */
function createSecuritySOCDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'security_soc_v1',
    generated_at: now,
    soc_enabled: Boolean(input.soc_enabled),
    socStatus: SOC_STATUSES.includes(input.socStatus) ? input.socStatus : 'UNKNOWN',
    overallSecurityScore: Math.min(1, Math.max(0, Number(input.overallSecurityScore) || 0)),
    currentThreatLevel: THREAT_LEVELS.includes(input.currentThreatLevel) ? input.currentThreatLevel : 'NONE',
    currentIntegrity: input.currentIntegrity || { status: 'UNKNOWN', score: 0 },
    activeIncidents: Array.isArray(input.activeIncidents) ? input.activeIncidents : [],
    resolvedIncidents: Array.isArray(input.resolvedIncidents) ? input.resolvedIncidents : [],
    pendingNotifications: Array.isArray(input.pendingNotifications) ? input.pendingNotifications : [],
    recommendedResponses: Array.isArray(input.recommendedResponses) ? input.recommendedResponses : [],
    runtimeHealth: input.runtimeHealth || {},
    baselineCompliance: input.baselineCompliance || {},
    timeline: Array.isArray(input.timeline) ? input.timeline : [],
    executiveSummary: input.executiveSummary || '',
    globalIndicators: input.globalIndicators || {},
    operationalDashboard: input.operationalDashboard || null,
    executiveDashboard: input.executiveDashboard || null,
    modules_snapshot: input.modules_snapshot || {},
    read_only: true,
    no_runtime_changes: true
  };
}

function freezeSOC(d) {
  return Object.freeze(JSON.parse(JSON.stringify(d)));
}

module.exports = {
  SOC_STATUSES,
  THREAT_LEVELS,
  createSecuritySOCDto,
  freezeSOC
};
