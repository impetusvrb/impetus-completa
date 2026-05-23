'use strict';

function runRegulatoryIsolationRuntime(payload = {}, consolidated = {}) {
  const { validateEnvironmentalBoundary } = require('./environmentalBoundaryValidator');
  const b = validateEnvironmentalBoundary({ ...payload, centers: consolidated.centers });
  return { ...b, regulatory_isolation_ok: b.cross_domain_clean };
}

module.exports = { runRegulatoryIsolationRuntime };
