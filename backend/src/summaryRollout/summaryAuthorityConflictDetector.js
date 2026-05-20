'use strict';

const phaseV = require('./config/phaseVFeatureFlags');
const { logPhaseV } = require('./phaseVLogger');

function detectSummaryAuthorityConflicts(user, summaryPayload, ctx = {}) {
  const conflicts = [];
  if (summaryPayload?.requires_authority && user?.scope_level < summaryPayload.requires_authority) {
    conflicts.push({ type: 'authority_insufficient', severity: 'high' });
  }
  if (summaryPayload?.cross_authority_narrative) {
    conflicts.push({ type: 'authority_overlap', severity: 'medium' });
  }
  if (summaryPayload?.contextual_narrative_conflict) {
    conflicts.push({ type: 'contextual_narrative_conflict', severity: 'high' });
  }

  if (conflicts.length && phaseV.isSummaryGovernanceObservabilityEnabled()) {
    logPhaseV('SUMMARY_AUTHORITY_CONFLICT', { count: conflicts.length, shadow_only: true });
  }

  return { conflict_detected: conflicts.length > 0, conflicts, auto_correct: false };
}

module.exports = { detectSummaryAuthorityConflicts };
