'use strict';

const flags = require('../config/phaseZ29FeatureFlags');
const { runEnterpriseGovernanceLearning } = require('./learning/enterpriseGovernanceLearning');

function applyGovernanceLearning(user = {}, payload = {}, ctx = {}) {
  if (!flags.isGovernanceLearningEnabled() && !ctx.force_governance_learning) {
    return { payload, skipped: true, reason: 'governance_learning_off' };
  }

  const { governance_learning, report, store } = runEnterpriseGovernanceLearning(user, payload, ctx);
  const enriched = { ...payload };
  enriched.governance_learning = governance_learning;
  if (flags.isGovernanceLearningShadow()) {
    enriched.governance_learning_shadow = { report, snapshot_count: store.snapshots?.length };
  } else {
    enriched.governance_learning_report = report;
  }
  return { payload: enriched, ok: true, governance_learning, report };
}

function getGovernanceLearningStatus() {
  return {
    phase: 'Z.29',
    mode: flags.governanceLearningMode(),
    pattern_learning: flags.isPatternLearningEnabled(),
    usefulness_learning: flags.isUsefulnessLearningEnabled(),
    convergence_learning: flags.isConvergenceLearningEnabled(),
    observability: flags.isLearningObservabilityEnabled(),
    auto_mutation_allowed: flags.autoMutationAllowed
  };
}

module.exports = { applyGovernanceLearning, getGovernanceLearningStatus };
