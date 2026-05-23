'use strict';

const { validateEnvironmentalSemanticPayload } = require('../runtime/environmentalSemanticValidator');

function validateEnvironmentalSemanticIsolation(payload = {}, consolidated = {}) {
  const base = validateEnvironmentalSemanticPayload(payload, consolidated.centers);
  return { ...base, internal_correlation_allowed: true };
}

module.exports = { validateEnvironmentalSemanticIsolation };
