'use strict';

function superviseComplianceDeadlines(signalBundle = {}) {
  const expiring = signalBundle.operational?.licenses_expiring ?? 0;
  return {
    critical_deadlines: expiring,
    supervisor_action: expiring > 0 ? 'highlight_timeline' : 'none',
    within_90_days: expiring
  };
}

module.exports = { superviseComplianceDeadlines };
