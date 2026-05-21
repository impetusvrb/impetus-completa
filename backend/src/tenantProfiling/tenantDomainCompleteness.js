'use strict';

function assessTenantDomainCompleteness(identity = {}) {
  const missing = [];
  const axis = identity.domain_axis || identity.functional_axis;

  if (!axis || axis === 'unknown' || axis === 'generic') missing.push('functional_domain');
  if (!identity.department && !identity.job_title) missing.push('department_or_role');
  if (!identity.profile_code) missing.push('profile_code');

  const completeness_score = Number(Math.max(0.3, 1 - missing.length * 0.2).toFixed(4));

  return {
    domain_complete: missing.length === 0,
    completeness_score,
    missing_fields: missing,
    domain_axis: axis
  };
}

module.exports = { assessTenantDomainCompleteness };
