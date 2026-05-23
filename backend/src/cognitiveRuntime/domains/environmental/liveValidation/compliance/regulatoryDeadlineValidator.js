'use strict';

function validateRegulatoryDeadlines(signalBundle = {}) {
  const op = signalBundle.operational || {};
  const due = op.licenses_expiring ?? 0;
  return {
    deadlines_ok: due === 0,
    due_within_90: due,
    missed_deadline: false,
    critical: due >= 3
  };
}

module.exports = { validateRegulatoryDeadlines };
