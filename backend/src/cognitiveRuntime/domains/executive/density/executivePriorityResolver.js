'use strict';

function resolveExecutivePriority(centers = []) {
  return [...centers].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
}

module.exports = { resolveExecutivePriority };
