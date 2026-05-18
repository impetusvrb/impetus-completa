'use strict';

module.exports = {
  ...require('./enterpriseOperationalHardeningRuntime'),
  ...require('./enterpriseTelemetryHardening'),
  ...require('./enterpriseEdgeHardening'),
  ...require('./enterpriseTenantHardening'),
  ...require('./enterpriseCognitiveHardening'),
  ...require('./enterpriseObservabilityHardening'),
  ...require('./enterpriseMaturityConsolidation'),
  ...require('./enterpriseContinuity'),
  ...require('./enterpriseResilienceValidationRuntime')
};
