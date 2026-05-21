'use strict';

function assessRuntimeDecisionUsefulness(usefulnessPack = {}) {
  const u = usefulnessPack.usefulness_score ?? 0.5;
  return {
    decision_usefulness: u,
    supports_operational_decisions: u >= 0.45,
    auto_decisions: false
  };
}

module.exports = { assessRuntimeDecisionUsefulness };
