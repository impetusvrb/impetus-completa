'use strict';

function compareReasoning(legacyTextHints = {}, sovereignReasoning = {}) {
  const sovereign_priority = sovereignReasoning?.priority?.tier || 'P4';
  const legacy_priority = legacyTextHints?.priority_hint || 'P4';
  const aligned = sovereign_priority === legacy_priority;
  return {
    aligned,
    sovereign_priority,
    legacy_priority,
    delta: aligned ? 0 : 1
  };
}

module.exports = { compareReasoning };
