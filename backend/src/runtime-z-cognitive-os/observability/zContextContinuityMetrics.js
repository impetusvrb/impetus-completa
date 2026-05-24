'use strict';

function computeContextContinuityMetrics(continuity = {}) {
  return {
    continuation_score: continuity?.continuation_score || 0,
    has_inherited_context: !!continuity?.inherited_context,
    workflow_active: !!continuity?.workflow?.has_active_workflow,
    operational_continuity: !!continuity?.operational?.has_operational_continuity
  };
}

module.exports = { computeContextContinuityMetrics };
