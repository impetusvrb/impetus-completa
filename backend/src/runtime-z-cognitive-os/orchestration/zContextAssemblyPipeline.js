'use strict';

const { inferContext } = require('../context/zContextInferenceRuntime');
const { buildIntentContinuity } = require('../continuity/zIntentContinuityRuntime');

function assembleContext({ tenantId, user, message, payloadFromZRuntime, reasoning }) {
  const continuity = buildIntentContinuity(tenantId, user, message);
  const context = inferContext(tenantId, user, message, payloadFromZRuntime, reasoning);
  return { continuity, context };
}

module.exports = { assembleContext };
