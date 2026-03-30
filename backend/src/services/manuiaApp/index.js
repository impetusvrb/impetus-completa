/**
 * Fachada publica do modulo ManuIA App — importada por rotas e por outros servicos (motor de eventos).
 */
'use strict';

module.exports = {
  repository: require('./manuiaAppRepository'),
  availability: require('./manuiaAvailabilityService'),
  decision: require('./manuiaAlertDecisionService'),
  aiSummary: require('./manuiaAiSummaryService'),
  webPush: require('./manuiaWebPushService'),
  ingest: require('./manuiaInboxIngestService')
};
