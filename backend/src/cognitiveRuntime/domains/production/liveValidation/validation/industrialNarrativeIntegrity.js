'use strict';

function validateIndustrialNarrativeIntegrity(consolidated = {}) {
  const paragraphs = consolidated.production_narrative?.paragraphs || [];
  const generic = consolidated.production_narrative?.generic_enterprise === true;
  return {
    ok: paragraphs.length > 0 || consolidated.telemetry_readiness === 'empty',
    paragraph_count: paragraphs.length,
    generic_enterprise: generic
  };
}

module.exports = { validateIndustrialNarrativeIntegrity };
