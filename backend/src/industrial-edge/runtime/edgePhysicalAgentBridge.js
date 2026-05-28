'use strict';

/**
 * Ponte edge_agents (ingest físico) → fila edge persistente + telemetria ambiente.
 */
async function onEdgeIngestComplete(companyId, readings = []) {
  const gov = require('../governance/edgeGovernanceService');
  if (!gov.isEdgeRuntimeRealEnabled() || !gov.isActiveForTenant(companyId)) {
    return { bridged: false };
  }

  const edgeSync = require('./edgeRealSyncRuntime');
  const tracing = require('../observability/edgeTracing');
  let bridged = 0;

  for (const rd of readings) {
    const payload = {
      connector_source: 'modbus',
      edge_sequence: String(Date.now()),
      idempotency_key: `edge-ingest-${rd.machine_identifier || 'eq'}-${Date.now()}`,
      registers: [{
        address: 0,
        raw_value: rd.temperature != null ? Math.round(Number(rd.temperature) * 10) : 0,
        metric_key: `edge.${rd.machine_identifier || 'machine'}.temp`,
        unit: 'C',
      }],
      meta: {
        machine_identifier: rd.machine_identifier,
        vibration: rd.vibration,
        status: rd.status,
        source: 'edge_physical_agent',
      },
    };
    try {
      const mem = require('../../domains/environment/telemetry/environmentEdgeTelemetryRuntime');
      mem.enqueueEdgeSample(companyId, payload);
      await edgeSync.persistEnqueueIfNeeded(companyId, { ok: true }, payload);
      bridged += 1;
    } catch { /* optional */ }
  }

  await tracing.trace(companyId, 'edge_physical_bridge', 'ok', { bridged, count: readings.length });
  return { bridged: true, samples: bridged };
}

module.exports = { onEdgeIngestComplete };
