'use strict';

const { logPhaseZ8 } = require('../summaryConvergence/phaseZ8Logger');

function adviseSummaryDeliveryRecovery(ctx = {}) {
  const recs = [];
  if (ctx.oscillation?.oscillation_detected) recs.push({ action: 'freeze_narrative_delta', priority: 'high' });
  if (ctx.blindness?.critical_blind_spot) recs.push({ action: 'review_summary_snapshot', priority: 'critical' });
  if (recs.length) logPhaseZ8('SUMMARY_DELIVERY_RECOVERY_ADVISED', { count: recs.length, shadow_only: true });
  return { recommendations: recs, auto_remediate: false, narrative_rewritten: false };
}

module.exports = { adviseSummaryDeliveryRecovery };
