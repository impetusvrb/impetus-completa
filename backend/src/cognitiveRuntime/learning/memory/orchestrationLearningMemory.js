'use strict';

const { loadGovernanceLearningStore, saveGovernanceLearningStore } = require('../persistence/supervisedLearningPersistence');

const MAX_SNAPSHOTS = 50;

function appendOrchestrationSnapshot(tenantId, snapshot = {}) {
  const store = loadGovernanceLearningStore(tenantId);
  store.snapshots = [...(store.snapshots || []), { ...snapshot, recorded_at: new Date().toISOString() }].slice(-MAX_SNAPSHOTS);
  saveGovernanceLearningStore(tenantId, store);
  return store;
}

function getOrchestrationLearningMemory(tenantId) {
  return loadGovernanceLearningStore(tenantId);
}

module.exports = { appendOrchestrationSnapshot, getOrchestrationLearningMemory };
