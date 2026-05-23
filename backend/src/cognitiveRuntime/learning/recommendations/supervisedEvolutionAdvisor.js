'use strict';

function adviseSupervisedEvolution(learning = {}) {
  return {
    evolution_advice: learning.recommendations_generated || [],
    apply_automatically: false,
    requires_human_approval: true
  };
}

module.exports = { adviseSupervisedEvolution };
