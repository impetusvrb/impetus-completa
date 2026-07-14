'use strict';

const flags = require('./config/securityReconFlags');
const runtime = require('./runtime/securityReconRuntime');
const engine = require('./engine/securityReconCorrelationEngine');
const catalog = require('./catalog/securitySignatureCatalog');
const dto = require('./dto/securitySignalDto');
const middleware = require('./middleware/securityReconMiddleware');
const threatIngest = require('./ingest/threatWatchSignalIngestor');
const routePolicy = require('./engine/routeExposurePolicy');
const guard = require('./guard/validatedIdentityReconGuard');
const edgeGate = require('./guard/edgeIngestValidatedGate');
const postValidation = require('./engine/postValidationDecision');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityReconCorrelationEnabled,
  flags,
  runtime,
  engine,
  catalog,
  dto,
  middleware,
  threatIngest,
  routePolicy,
  guard,
  edgeGate,
  postValidation,
  getAuditPayload: runtime.getAuditPayload
};
