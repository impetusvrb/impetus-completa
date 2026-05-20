'use strict';

const { resolveContextualConsistency } = require('./contextualConsistencyResolver');
const { synchronizeRuntimeTruth } = require('./runtimeTruthSynchronizer');

function coordinateInterchannelConsistency(user, channels = {}, ctx = {}) {
  const sync = synchronizeRuntimeTruth(user, channels, ctx);
  const resolved = resolveContextualConsistency({
    dashboard: { axis: sync.canonical_axis, ...channels.dashboard },
    kpi: channels.kpi,
    summary: channels.summary,
    chat: channels.chat,
    insight: channels.insight
  });

  const interchannel_alignment = Number(
    ((resolved.contextual_synchronization + sync.runtime_truth_integrity) / 2).toFixed(4)
  );

  return {
    sync,
    resolved,
    interchannel_alignment,
    pipeline_agreement_score: sync.conflict ? 0.5 : 0.9,
    divergent: !resolved.axis_aligned || sync.conflict
  };
}

module.exports = { coordinateInterchannelConsistency };
