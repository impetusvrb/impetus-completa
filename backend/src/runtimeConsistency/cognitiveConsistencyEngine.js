'use strict';

const phaseQ = require('./config/phaseQFeatureFlags');
const { logPhaseQ } = require('./phaseQLogger');
const { coordinateInterchannelConsistency } = require('./interchannelConsistencyCoordinator');

function assessCognitiveConsistency(user, channels = {}, ctx = {}) {
  const coordination = coordinateInterchannelConsistency(user, channels, ctx);
  const score = Number(
    (
      (coordination.interchannel_alignment +
        coordination.resolved.contextual_synchronization +
        coordination.sync.runtime_truth_integrity) /
      3
    ).toFixed(4)
  );

  if (coordination.divergent && phaseQ.isRuntimeConsistencyObservabilityEnabled()) {
    logPhaseQ('COGNITIVE_INCONSISTENCY_DETECTED', {
      axes: coordination.resolved.axes,
      shadow_only: !phaseQ.isRuntimeConsistencyEnabled()
    });
  }
  if (coordination.sync.conflict) {
    logPhaseQ('TRUTH_CONFLICT_DETECTED', { sources: coordination.sync.sources_checked, shadow_only: true });
  }

  return {
    cognitive_consistency_score: score,
    coordination,
    enforcement_active: phaseQ.isRuntimeConsistencyEnabled(),
    shadow_only: !phaseQ.isRuntimeConsistencyEnabled(),
    auto_remediate: false
  };
}

module.exports = { assessCognitiveConsistency };
