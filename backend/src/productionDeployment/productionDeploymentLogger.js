'use strict';

const flags = require('./config/productionDeploymentFeatureFlags');

function logProductionDeployment(event, payload = {}) {
  if (!flags.isDeploymentObservabilityEnabled()) return;
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
}

module.exports = { logProductionDeployment };
