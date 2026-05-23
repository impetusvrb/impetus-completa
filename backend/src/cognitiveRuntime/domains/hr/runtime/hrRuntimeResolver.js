'use strict';

const { resolveDomainFromProfile } = require('../../../domainFoundation/registry/domainSemanticProfiles');
const flagsZ26 = require('../../../config/phaseZ26FeatureFlags');

function resolveHrRuntimeContext(user = {}, payload = {}, ctx = {}) {
  const profileCode = payload.profile_code || ctx.profile_code || user?.dashboard_profile || '';
  const domain = resolveDomainFromProfile(profileCode, payload.functional_area || 'hr');
  const isHr =
    domain === 'hr' || flagsZ26.isPilotProfile(profileCode) || String(payload.functional_axis || '').toLowerCase() === 'hr';

  return {
    domain_axis: 'hr',
    profile_code: profileCode,
    is_hr_profile: isHr,
    cockpit_mode: isHr ? 'hr_native' : 'off',
    weights: flagsZ26.getProfileWeights(profileCode)
  };
}

module.exports = { resolveHrRuntimeContext };
