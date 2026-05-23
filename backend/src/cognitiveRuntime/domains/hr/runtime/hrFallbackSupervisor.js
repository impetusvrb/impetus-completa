'use strict';

const shared = require('../../../cockpitConsolidation/runtime/cockpitFallbackSupervisor');

function superviseHrFallback(consolidated = {}, payload = {}) {
  return shared.superviseCockpitFallback(consolidated, payload);
}

module.exports = { superviseHrFallback };
