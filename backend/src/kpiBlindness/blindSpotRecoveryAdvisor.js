'use strict';

const { logPhaseZ7 } = require('../kpiConvergence/phaseZ7Logger');

function adviseBlindSpotRecovery(blindness = {}) {
  const recs = [];
  if (blindness.executive?.critical) recs.push({ action: 'restore_strategic_kpis_from_snapshot', priority: 'critical' });
  if (blindness.operational?.critical) recs.push({ action: 'restore_operational_kpis_from_snapshot', priority: 'critical' });
  if (blindness.managerial?.critical) recs.push({ action: 'review_managerial_minimum', priority: 'high' });
  if (blindness.gaps?.gaps_detected) recs.push({ action: 'review_visibility_deficit', priority: 'medium' });
  if (recs.length) logPhaseZ7('BLIND_SPOT_RECOVERY_ADVISED', { count: recs.length, shadow_only: true });
  return { recommendations: recs, auto_remediate: false, fabricated: false };
}

module.exports = { adviseBlindSpotRecovery };
