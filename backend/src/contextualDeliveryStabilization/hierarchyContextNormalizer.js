'use strict';

function normalizeHierarchyContext(target) {
  const band = target?.hierarchy?.hierarchy_band || 'operator';
  return {
    normalized_band: band,
    corporate_contamination_risk: ['operator', 'supervisor'].includes(band),
    executive_insight_allowed: ['executive', 'director'].includes(band)
  };
}

module.exports = { normalizeHierarchyContext };
