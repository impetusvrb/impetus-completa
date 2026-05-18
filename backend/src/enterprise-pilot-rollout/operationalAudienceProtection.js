'use strict';

/** Protecção: operadores não recebem governança executiva em pilot. */
const EXECUTIVE_ONLY_VIEWS = Object.freeze([
  'executive',
  'rollout',
  'maturity',
  'governance_executive'
]);

function checkOperationalAudienceProtection(ctx = {}) {
  const band = String(ctx.audience_band || 'operator');
  const view = String(ctx.view || '');
  const domain = String(ctx.domain || '');

  if (['operator', 'production'].includes(band) && EXECUTIVE_ONLY_VIEWS.some((v) => view.includes(v))) {
    return { allowed: false, reason: 'executive_view_blocked_for_operator' };
  }
  if (band === 'operator' && view === 'governance' && domain === 'safety') {
    return { allowed: false, reason: 'safety_governance_blocked_for_operator' };
  }
  if (ctx.cross_domain_executive_leak) {
    return { allowed: false, reason: 'cross_domain_executive_leak' };
  }
  return { allowed: true, reason: null };
}

module.exports = { checkOperationalAudienceProtection, EXECUTIVE_ONLY_VIEWS };
