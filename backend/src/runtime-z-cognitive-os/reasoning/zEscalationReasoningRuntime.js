'use strict';

function inferEscalation(priority = {}, impact = {}, criticality = {}) {
  const tier = priority.tier || 'P4';
  const breadth = impact.breadth || 0;
  const level = criticality.level || 'low';

  let escalate_to = 'self';
  if (tier === 'P1' || level === 'critical') escalate_to = 'plant_manager';
  else if (tier === 'P2' || level === 'high') escalate_to = 'area_manager';
  else if (tier === 'P3' && breadth >= 2) escalate_to = 'supervisor';

  return {
    suggested_escalation: escalate_to,
    requires_human_review: ['plant_manager', 'area_manager'].includes(escalate_to),
    automatic_escalation: false,
    rationale: { tier, criticality: level, impact_breadth: breadth }
  };
}

module.exports = { inferEscalation };
