'use strict';

const { resolveDomainFromProfile } = require('../../../domainFoundation/registry/domainSemanticProfiles');
const flagsZ25 = require('../../../config/phaseZ25FeatureFlags');

function resolveSafetyRuntimeContext(user = {}, payload = {}, ctx = {}) {
  const profileCode = payload.profile_code || ctx.profile_code || user?.dashboard_profile || '';
  const domain = resolveDomainFromProfile(profileCode, payload.functional_area || 'safety');
  const isSafety =
    domain === 'safety' ||
    flagsZ25.isPilotProfile(profileCode) ||
    String(payload.functional_axis || '').toLowerCase() === 'safety';

  return {
    domain_axis: 'safety',
    profile_code: profileCode,
    is_safety_profile: isSafety,
    cockpit_mode: isSafety ? 'safety_native' : 'off',
    weights: flagsZ25.getProfileWeights(profileCode)
  };
}

module.exports = { resolveSafetyRuntimeContext };
