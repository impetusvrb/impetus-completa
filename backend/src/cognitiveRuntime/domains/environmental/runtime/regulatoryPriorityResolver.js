'use strict';

function resolveRegulatoryPriority(centers = []) {
  return [...centers].sort((a, b) => {
    const pri = (c) => (c.center_id?.includes('risk') || c.center_id?.includes('compliance') ? 2 : 1);
    return pri(b) - pri(a) || (b.weight || 0) - (a.weight || 0);
  });
}

module.exports = { resolveRegulatoryPriority };
