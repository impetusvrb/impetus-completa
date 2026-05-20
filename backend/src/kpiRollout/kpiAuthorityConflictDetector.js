'use strict';

const phaseT = require('./config/phaseTFeatureFlags');
const { logPhaseT } = require('./phaseTLogger');
const { extractKpiList } = require('./kpiTargetingValidator');

function detectKpiAuthorityConflicts(user, kpiPayload, ctx = {}) {
  const kpis = extractKpiList(kpiPayload);
  const userScope = ctx.scope_level ?? user?.scope_level ?? user?.hierarchy_level;
  const conflicts = [];

  for (const k of kpis) {
    if (k.requires_authority && userScope && k.requires_authority > userScope) {
      conflicts.push({
        type: 'authority_insufficient',
        kpi_id: k.id || k.key,
        required: k.requires_authority,
        user_scope: userScope,
        severity: 'high'
      });
    }
    if (k.cross_authority && k.owner_authority && k.owner_authority !== user?.authority_domain) {
      conflicts.push({
        type: 'authority_overlap',
        kpi_id: k.id || k.key,
        severity: 'medium'
      });
    }
  }

  if (conflicts.length && phaseT.isKpiGovernanceObservabilityEnabled()) {
    logPhaseT('KPI_AUTHORITY_CONFLICT', { count: conflicts.length, shadow_only: true });
  }

  return { conflict_detected: conflicts.length > 0, conflicts };
}

module.exports = { detectKpiAuthorityConflicts };
