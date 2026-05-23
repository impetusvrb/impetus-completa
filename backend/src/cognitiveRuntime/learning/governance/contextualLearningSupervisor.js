'use strict';

function superviseLearning(ctx = {}) {
  return {
    supervised: true,
    auto_decision_blocked: true,
    auto_remediation_blocked: true,
    human_oversight_required: ctx.recommendations_generated?.length > 0
  };
}

module.exports = { superviseLearning };
