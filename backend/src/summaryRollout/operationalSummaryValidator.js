'use strict';

const { validateContextualSummary } = require('./contextualSummaryValidator');
const { validateHierarchySummary } = require('./hierarchySummaryValidator');
const { normalizeAxis } = require('./summaryPayloadUtils');

function validateOperationalSummary(user, summaryPayload, ctx = {}) {
  const hierarchy = validateHierarchySummary(user, summaryPayload, ctx);
  const contextual = validateContextualSummary(user, summaryPayload, {
    ...ctx,
    hierarchy_band: hierarchy.hierarchy_band
  });

  const valid = hierarchy.valid && contextual.valid;
  const confidence = Number(
    ((contextual.contextual_alignment_score + hierarchy.hierarchy_coherence) / 2).toFixed(4)
  );

  return {
    valid,
    summary_delivery_confidence: confidence,
    contextual,
    hierarchy,
    issues: [...contextual.issues, ...hierarchy.issues]
  };
}

module.exports = { validateOperationalSummary };
