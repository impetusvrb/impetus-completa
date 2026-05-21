'use strict';

const { buildHierarchicalVisibilityMatrix } = require('./hierarchicalVisibilityMatrix');
const { classifyModuleList } = require('./moduleDeliveryClassification');
const { CLASSIFICATION } = require('./moduleDeliveryClassification');

function computeHierarchyDeliveryReadiness(identity = {}, ctx = {}) {
  const hvm = buildHierarchicalVisibilityMatrix(identity);
  const modules = ctx.visible_modules || [];
  const classified = classifyModuleList(modules);

  let conflicts = 0;
  if (hvm.executive_visibility) {
    conflicts += classified.filter((c) => c.classification === CLASSIFICATION.OPERATIONAL_ONLY).length;
  }
  if (hvm.operational_floor_visibility) {
    conflicts += classified.filter((c) => c.classification === CLASSIFICATION.EXECUTIVE_ONLY).length;
  }

  const hierarchy_confidence = Number(Math.max(0.4, 1 - conflicts * 0.15).toFixed(4));

  return {
    hierarchy_confidence,
    hierarchy_conflicts: conflicts,
    visibility_matrix: hvm,
    hierarchy_delivery_ready: conflicts === 0 && hierarchy_confidence >= 0.75,
    enforcement_applied: false
  };
}

module.exports = { computeHierarchyDeliveryReadiness };
