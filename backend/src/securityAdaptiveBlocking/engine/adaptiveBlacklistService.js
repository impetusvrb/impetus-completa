'use strict';

/**
 * SEC-14 — Adaptive Blacklist Service.
 * Registra estados — nunca executa bloqueio real.
 */

const store = require('../store/adaptiveBlockingStore');
const metrics = require('../metrics/adaptiveBlockingMetrics');

const { BLACKLIST_STATES } = store;

function resolveStateFromReputation(rep, behaviorScore) {
  const score = rep?.reputationScore ?? 100;
  const recurrence = rep?.recurrence ?? 0;

  if (score <= 15 || (score <= 25 && recurrence >= 5)) return 'BLOCK_CANDIDATE';
  if (score <= 30 || (behaviorScore >= 0.7 && recurrence >= 3)) return 'QUARANTINE';
  if (score <= 45 || behaviorScore >= 0.5) return 'WATCHLIST';
  if (score <= 60 || recurrence >= 2) return 'OBSERVED';
  if (score <= 75 && recurrence >= 1) return 'MANUAL_REVIEW';
  return 'NORMAL';
}

function updateBlacklistForIp(ip, rep, behaviorScore, reason) {
  const state = resolveStateFromReputation(rep, behaviorScore);
  const prev = store.getBlacklistEntry(ip);
  if (prev?.state === state) return prev;

  store.setBlacklistState(ip, state, reason || `reputation=${rep?.reputationScore}, behavior=${behaviorScore}`);
  metrics.increment('adaptive_blocking_events');

  if (state === 'WATCHLIST') metrics.increment('watchlist_ips');
  if (state === 'QUARANTINE' || state === 'BLOCK_CANDIDATE') metrics.increment('quarantine_candidates');
  if (state === 'MANUAL_REVIEW') metrics.increment('manual_reviews');

  return store.getBlacklistEntry(ip);
}

function syncBlacklistFromReputations(reputations, behaviorByIp) {
  return (reputations || []).map((rep) => {
    const behaviorScore = behaviorByIp?.get(rep.ip)?.behaviorScore ?? 0;
    return updateBlacklistForIp(rep.ip, rep, behaviorScore, 'sync_from_reputation');
  });
}

function getBlacklistSummary() {
  const entries = store.getAllBlacklistEntries();
  const byState = {};
  for (const s of BLACKLIST_STATES) byState[s] = 0;
  for (const e of entries) byState[e.state] = (byState[e.state] || 0) + 1;
  return { total: entries.length, byState, entries: entries.slice(0, 50) };
}

module.exports = {
  BLACKLIST_STATES,
  resolveStateFromReputation,
  updateBlacklistForIp,
  syncBlacklistFromReputations,
  getBlacklistSummary
};
