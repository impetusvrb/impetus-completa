'use strict';

const gov = require('../governance/edgeGovernanceService');
const persistence = require('../services/edgeQueuePersistenceService');
const bridge = require('./edgeConnectorBridgeRuntime');
const tracing = require('../observability/edgeTracing');
const edgeMem = require('../../domains/environment/telemetry/environmentEdgeTelemetryRuntime');

const _stats = {
  enqueued: 0,
  persisted: 0,
  synced: 0,
  bridge_audit: 0,
  bridge_ingest: 0,
  errors: 0,
};

function getGlobalStats() {
  return { ..._stats };
}

async function persistEnqueueIfNeeded(companyId, memResult, payload) {
  const mode = gov.getEffectiveMode('audit');
  if (!gov.isActiveForTenant(companyId) || !gov.shouldPersistQueue(mode)) {
    return { skipped: true };
  }
  const item = {
    sequence: payload.edge_sequence != null ? String(payload.edge_sequence) : memResult.item_id,
    idempotency_key: payload.idempotency_key || null,
    connector_source: payload.connector_source || payload.telemetry_source || 'edge',
    payload,
  };
  if (item.idempotency_key) {
    const pending = await persistence.loadPending(companyId, 2000);
    if (pending.some((p) => p.idempotency_key === item.idempotency_key)) {
      return { duplicate: true };
    }
  }
  const r = await persistence.persistEnqueue(companyId, item);
  if (r.persisted) _stats.persisted += 1;
  return r;
}

async function syncPersistentQueue(companyId, userId = null) {
  const mode = gov.getEffectiveMode(gov.getDiagnostics().mode);
  if (!gov.isActiveForTenant(companyId)) {
    return { ok: false, code: 'TENANT_NOT_PILOT' };
  }

  const pending = await persistence.loadPending(companyId);
  if (!pending.length) {
    return { ok: true, synced: 0, remaining: 0, source: 'persistent' };
  }

  let synced = 0;
  let failed = 0;
  const syncedIds = [];

  for (const row of pending) {
    const r = await bridge.bridgeEdgePayload(companyId, row.payload, mode);
    if (r.ok || r.skipped || r.audit) {
      synced += 1;
      syncedIds.push(row.id);
      if (r.audit) _stats.bridge_audit += 1;
      else _stats.bridge_ingest += 1;
    } else {
      failed += 1;
      _stats.errors += 1;
    }
  }

  if (syncedIds.length) {
    await persistence.markSynced(syncedIds);
    _stats.synced += syncedIds.length;
  }

  await tracing.trace(companyId, 'persistent_sync', synced > 0 ? 'ok' : 'warn', {
    synced,
    failed,
    mode,
  });

  return {
    ok: synced > 0 || failed === 0,
    synced,
    failed,
    remaining: pending.length - syncedIds.length,
    source: 'persistent',
    mode,
  };
}

async function syncAllLayers(companyId, userId, ingestFn) {
  const mem = await edgeMem.syncEdgeQueue(companyId, userId, ingestFn);
  const mode = gov.getEffectiveMode(gov.getDiagnostics().mode);
  let persistent = { skipped: true };
  if (gov.isEdgeRuntimeRealEnabled() && gov.isActiveForTenant(companyId)) {
    persistent = await syncPersistentQueue(companyId, userId);
  }
  return { memory: mem, persistent, mode };
}

async function warmBoot() {
  await persistence.ensureSchema();
  await persistence.purgeSynced(7);

  const pilots = gov.getDiagnostics().pilot_tenants || [];
  const hydration = [];

  for (const tid of pilots) {
    try {
      const pending = await persistence.loadPending(tid, 100);
      const stats = await persistence.getQueueStats(tid);
      hydration.push({ tenant_id: tid, pending_db: pending.length, stats });
    } catch (err) {
      hydration.push({ tenant_id: tid, error: err?.message });
    }
  }

  let lab = { skipped: true };
  if (require('../config/edgeRuntimeFlags').isIndustrialLabEnabled()) {
    const labSvc = require('../lab/industrialLabE2eService');
    if (require('../config/edgeRuntimeFlags').labAutoE2eOnBoot()) {
      lab = await labSvc.runSuite(pilots[0] || null);
    }
  }

  return {
    ok: true,
    mode: gov.getDiagnostics().mode,
    hydration,
    lab,
    stats: getGlobalStats(),
  };
}

module.exports = {
  warmBoot,
  persistEnqueueIfNeeded,
  syncPersistentQueue,
  syncAllLayers,
  getGlobalStats,
};
