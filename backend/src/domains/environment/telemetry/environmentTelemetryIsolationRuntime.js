'use strict';

const telemetry = require('../../../storage/telemetryIsolationService');
const storageFlags = require('../../../storage/storageFlags');

function getIsolationSnapshot() {
  return {
    w3_telemetry_ingest: storageFlags.isTelemetryIsolatedIngestEnabled(),
    isolation: telemetry.getIsolationStrategy(),
    domain: 'environment'
  };
}

module.exports = { getIsolationSnapshot };
