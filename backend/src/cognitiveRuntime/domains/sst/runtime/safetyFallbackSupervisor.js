'use strict';

const shared = require('../../../cockpitConsolidation/runtime/cockpitFallbackSupervisor');

function superviseSafetyFallback(consolidated = {}, payload = {}) {
  return shared.superviseCockpitFallback(consolidated, payload);
}

module.exports = { superviseSafetyFallback };
