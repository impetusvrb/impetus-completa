'use strict';

function validateMaintenanceSemanticPayload(payload = {}, centers = []) {
  const text = [
    payload.summary,
    payload.specialized_summary,
    ...(centers || []).map((c) => c.summary)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const blocked = ['ebitda', 'turnover rh', 'esg boardroom', 'folha de pagamento', 'compliance ambiental granular'];
  const required = ['manuten', 'confiabil', 'mtbf', 'mttr', 'downtime', 'disponib', 'degrada', 'ativo', 'falha', 'reliab'];
  const hasBlocked = blocked.some((b) => text.includes(b));
  const hasRequired = required.some((r) => text.includes(r)) || centers.length > 0;

  return {
    ok: !hasBlocked && hasRequired,
    maintenance_native: hasRequired,
    leakage_blocked: !hasBlocked
  };
}

module.exports = { validateMaintenanceSemanticPayload };
