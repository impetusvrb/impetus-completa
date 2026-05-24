'use strict';

function computeOperationalAwareness({ context = {}, continuity = {}, reasoning = {} } = {}) {
  return {
    shift: context?.shift?.shift_name,
    business_hours: !!context?.temporal?.business_hours,
    operational_state: context?.operational?.state || 'idle',
    has_active_workflow: !!continuity?.workflow?.has_active_workflow,
    critical_incidents: context?.operational?.critical_incidents || 0,
    detected_risks: reasoning?.detected_risks || [],
    awareness_signature: [
      context?.shift?.shift_name,
      context?.operational?.state,
      reasoning?.priority?.tier,
      reasoning?.criticality?.level
    ]
      .filter(Boolean)
      .join('|')
  };
}

module.exports = { computeOperationalAwareness };
