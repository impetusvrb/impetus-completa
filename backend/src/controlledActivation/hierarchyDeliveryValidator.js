'use strict';

function validateHierarchyDelivery(user, ctx = {}) {
  const band = ctx.hierarchy_band || ctx.contextual_delivery?.hierarchy?.hierarchy?.hierarchy_band;
  const integrity = ctx.hierarchy_integrity ?? ctx.contextual_delivery?.hierarchy?.hierarchy_integrity ?? 0.9;
  const denied = ctx.contextual_delivery?.hierarchy?.denied_hierarchy?.length || 0;
  return {
    valid: denied === 0 && integrity >= 0.75,
    hierarchy_accuracy: Number(integrity.toFixed(4)),
    hierarchy_band: band,
    denied_count: denied
  };
}

module.exports = { validateHierarchyDelivery };
