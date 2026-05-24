'use strict';

function snapshotCognitiveState({ continuity = {}, context = {}, reasoning = {}, actions = {} } = {}) {
  return {
    continuation_score: continuity?.continuation_score || 0,
    awareness_score: context?.awareness_score || 0,
    reasoning_quality: reasoning?.reasoning_quality || 0,
    industrial_intelligence_score: reasoning?.industrial_intelligence_score || 0,
    actions_prepared: actions?.count || 0,
    operational_state: context?.operational?.state || 'idle',
    risk_score: context?.risk?.risk_score || 0,
    has_inherited_context: !!continuity?.inherited_context
  };
}

module.exports = { snapshotCognitiveState };
