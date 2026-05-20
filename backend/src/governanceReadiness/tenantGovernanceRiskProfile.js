'use strict';

const SENSITIVE_INDUSTRIES = new Set(['chemical', 'mining', 'pharma', 'defense', 'nuclear']);
const HIGH_RISK_ROLES = new Set(['operational', 'safety', 'environmental']);

function buildTenantRiskProfile(tenant = {}) {
  const industry = String(tenant.industry || tenant.sector || '').toLowerCase();
  const userCount = Number(tenant.user_count || tenant.active_users || 0);
  const multiDomain = tenant.multi_domain === true || tenant.domain_count > 3;

  let sensitivity = 'standard';
  if (SENSITIVE_INDUSTRIES.has(industry) || tenant.critical_infrastructure) sensitivity = 'critical';
  else if (multiDomain || userCount > 500) sensitivity = 'elevated';

  return {
    tenant_id: tenant.id || tenant.company_id,
    sensitivity,
    industry: industry || 'unknown',
    multi_domain: multiDomain,
    recommended_activation_pace: sensitivity === 'critical' ? 'slow' : sensitivity === 'elevated' ? 'staged' : 'normal',
    requires_extended_shadow: sensitivity !== 'standard',
    min_shadow_days: sensitivity === 'critical' ? 21 : sensitivity === 'elevated' ? 14 : 7
  };
}

module.exports = { buildTenantRiskProfile, SENSITIVE_INDUSTRIES };
