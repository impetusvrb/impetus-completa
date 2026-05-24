'use strict';

function shadowContextAccuracy(currentMessage = '', continuity = {}, context = {}) {
  const hasInherited = !!continuity?.inherited_context;
  const hasAwareness = (context?.awareness_score || 0) > 0.4;
  const accuracy = Number(
    ((hasInherited ? 0.5 : 0.2) + (hasAwareness ? 0.4 : 0.2)).toFixed(3)
  );
  return {
    inherited_context_present: hasInherited,
    awareness_strong: hasAwareness,
    accuracy_score: Math.min(1, accuracy),
    message_excerpt: String(currentMessage || '').slice(0, 120)
  };
}

module.exports = { shadowContextAccuracy };
