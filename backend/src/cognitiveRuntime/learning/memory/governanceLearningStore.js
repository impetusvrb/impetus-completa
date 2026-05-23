'use strict';

const { loadGovernanceLearningStore, saveGovernanceLearningStore } = require('../persistence/supervisedLearningPersistence');

function recordRecommendationOutcome(tenantId, recId, outcome = 'pending') {
  const store = loadGovernanceLearningStore(tenantId);
  const entry = { rec_id: recId, outcome, at: new Date().toISOString() };
  if (outcome === 'accepted') store.accepted = [...(store.accepted || []), entry].slice(-100);
  else if (outcome === 'rejected') store.rejected = [...(store.rejected || []), entry].slice(-100);
  else store.recommendations_log = [...(store.recommendations_log || []), entry].slice(-200);
  saveGovernanceLearningStore(tenantId, store);
  return store;
}

module.exports = { recordRecommendationOutcome, loadGovernanceLearningStore };
