'use strict';

const flags = require('../config/securityReconFlags');

/** @type {Map<string, { state: object, lastAccess: number }>} */
const store = new Map();

let cleanupTimer = null;

function nowMs() {
  return Date.now();
}

function keyForIp(ip) {
  return String(ip || 'unknown').toLowerCase();
}

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(pruneExpired, 60000);
  if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();
}

function stopCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

function createEmptyState() {
  return {
    score: 0,
    behaviorState: 'OBSERVE',
    distinctPaths: new Set(),
    pathSeen: new Map(),
    notFoundCount: 0,
    probeHits: 0,
    signalCount: 0,
    lastSignalAt: 0,
    firstSeenAt: nowMs(),
    externalBanObserved: false,
    thresholdsHit: new Set(),
    signals: []
  };
}

function pruneExpired() {
  const windowMs = flags.reconWindowMs();
  const maxKeys = flags.reconMaxKeys();
  const cutoff = nowMs() - windowMs;

  for (const [k, entry] of store) {
    if (entry.lastAccess < cutoff) store.delete(k);
  }

  if (store.size <= maxKeys) return;

  const sorted = [...store.entries()].sort((a, b) => a[1].lastAccess - b[1].lastAccess);
  const toRemove = sorted.length - maxKeys;
  for (let i = 0; i < toRemove; i++) {
    store.delete(sorted[i][0]);
  }
}

function getOrCreate(ip) {
  startCleanup();
  const k = keyForIp(ip);
  const t = nowMs();
  let entry = store.get(k);

  if (!entry || t - entry.lastAccess > flags.reconWindowMs()) {
    entry = { state: createEmptyState(), lastAccess: t };
    store.set(k, entry);
  }

  entry.lastAccess = t;
  return entry.state;
}

function isDistinctPath(state, path) {
  if (!path) return false;
  return !state.pathSeen.has(path);
}

function recordSignal(ip, signal, scoreDelta) {
  const state = getOrCreate(ip);
  const t = nowMs();

  if (signal.path) {
    const prev = state.pathSeen.get(signal.path) || 0;
    state.pathSeen.set(signal.path, prev + 1);
    state.distinctPaths.add(signal.path);
  }
  if (signal.metadata?.notFound) state.notFoundCount += 1;
  if (signal.canonicalSignalType === 'TECHNOLOGY_MISMATCH_PROBE' ||
      signal.canonicalSignalType === 'CREDENTIAL_PROBE') {
    state.probeHits += 1;
  }
  if (signal.metadata?.externalBanAlreadyApplied) {
    state.externalBanObserved = true;
  }

  state.signalCount += 1;
  state.lastSignalAt = t;
  state.score = Math.max(0, state.score + (scoreDelta || 0));
  state.signals.push({
    at: signal.timestamp,
    type: signal.canonicalSignalType,
    source: signal.sourceLayer
  });
  if (state.signals.length > 32) state.signals.shift();

  return state;
}

function getState(ip) {
  const entry = store.get(keyForIp(ip));
  if (!entry) return null;
  if (nowMs() - entry.lastAccess > flags.reconWindowMs()) {
    store.delete(keyForIp(ip));
    return null;
  }
  return entry.state;
}

function setBehaviorState(ip, behaviorState) {
  const state = getOrCreate(ip);
  state.behaviorState = behaviorState;
  return state;
}

function getSnapshot() {
  return {
    keys: store.size,
    maxKeys: flags.reconMaxKeys(),
    windowMs: flags.reconWindowMs()
  };
}

function clearAll() {
  store.clear();
}

module.exports = {
  getOrCreate,
  recordSignal,
  getState,
  setBehaviorState,
  isDistinctPath,
  getSnapshot,
  clearAll,
  stopCleanup,
  startCleanup
};
