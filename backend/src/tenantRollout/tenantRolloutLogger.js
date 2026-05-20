'use strict';

const flags = require('./config/tenantRolloutFeatureFlags');

function logTenantRollout(event, payload = {}) {
  if (!flags.isTenantRolloutObservabilityEnabled()) return;
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
}

module.exports = { logTenantRollout };
