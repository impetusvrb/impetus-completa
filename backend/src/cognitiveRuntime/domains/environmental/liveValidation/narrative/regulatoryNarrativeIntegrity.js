'use strict';

function validateRegulatoryNarrativeIntegrity(consolidated = {}) {
  const paragraphs = consolidated.environmental_narrative?.paragraphs || [];
  return { ok: paragraphs.length > 0 || consolidated.telemetry_readiness === 'empty', count: paragraphs.length };
}

module.exports = { validateRegulatoryNarrativeIntegrity };
