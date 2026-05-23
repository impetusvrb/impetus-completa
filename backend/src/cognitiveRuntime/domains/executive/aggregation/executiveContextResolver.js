'use strict';

const flags = require('../../../config/phaseZ27FeatureFlags');

function resolveExecutiveContext(user = {}, payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || '').toLowerCase();
  const isExecutive =
    flags.isPilotProfile(pc) ||
    axis === 'executive' ||
    axis === 'diretoria' ||
    ctx.force_executive_context === true;
  return {
    is_executive_profile: isExecutive,
    profile_code: pc,
    functional_axis: isExecutive ? 'executive' : axis,
    boardroom_eligible: isExecutive
  };
}

module.exports = { resolveExecutiveContext };
