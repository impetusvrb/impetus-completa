'use strict';

function resolveLegalObligations(signalBundle = {}) {
  const lic = signalBundle.raw?.licenses || [];
  const due = lic.filter((l) => l.days_to_expire != null && l.days_to_expire <= 90);
  return {
    obligations_total: lic.length,
    due_soon: due.length,
    overdue_proxy: lic.filter((l) => l.days_to_expire != null && l.days_to_expire < 0).length
  };
}

module.exports = { resolveLegalObligations };
