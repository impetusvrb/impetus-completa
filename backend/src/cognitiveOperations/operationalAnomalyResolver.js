'use strict';

const { correlateContextualAnomalies } = require('./contextualAnomalyCorrelator');

function resolveOperationalAnomalies(ctx = {}) {
  const correlation = correlateContextualAnomalies(ctx);
  return {
    ...correlation,
    resolved_at: new Date().toISOString(),
    auto_mitigation: false
  };
}

module.exports = { resolveOperationalAnomalies };
