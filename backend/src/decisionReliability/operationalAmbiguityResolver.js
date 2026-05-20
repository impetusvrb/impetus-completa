'use strict';

function resolveOperationalAmbiguity(signals = {}) {
  const issues = [];
  if (signals.vague_language) issues.push('vague_language');
  if (signals.multiple_interpretations) issues.push('multiple_interpretations');
  if (signals.guidance_conflict) issues.push('guidance_conflict');
  return {
    operational_ambiguity: issues.length > 0,
    issues,
    score: Number(Math.min(1, issues.length * 0.25).toFixed(4))
  };
}

module.exports = { resolveOperationalAmbiguity };
