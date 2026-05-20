'use strict';

function recommendDependencyReduction(deps = {}) {
  const suggestions = [];
  for (const c of deps.conflicts || []) {
    suggestions.push({
      action: 'review_dependency',
      between: [c.a, c.b],
      type: c.type,
      auto_execute: false
    });
  }
  return { suggestions, count: suggestions.length };
}

module.exports = { recommendDependencyReduction };
