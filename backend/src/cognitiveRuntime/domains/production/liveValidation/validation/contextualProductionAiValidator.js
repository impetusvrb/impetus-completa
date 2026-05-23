'use strict';

const { validateOperationalAiUsefulness } = require('./operationalAiUsefulnessValidator');

function validateContextualProductionAi(consolidated = {}, payload = {}) {
  const base = validateOperationalAiUsefulness(consolidated, payload);
  return {
    ...base,
    ok: base.industrial && !base.denied_topics_leak,
    telemetry_correlated: (consolidated.telemetry_readiness === 'ready') === (base.question_count > 0)
  };
}

module.exports = { validateContextualProductionAi };
