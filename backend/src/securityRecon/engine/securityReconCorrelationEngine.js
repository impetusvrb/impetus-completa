'use strict';

/**
 * Security Recon Correlation Engine — correlaciona sinais normalizados.
 * Não substitui threat-watch, SEC-01, SEC-02 ou UFW/Cloudflare ban.
 */

const flags = require('../config/securityReconFlags');
const store = require('../store/reconStateStore');
const { BEHAVIOR_STATES } = require('../dto/securitySignalDto');
const { isTrustedLocalPeer } = require('../engine/signalNormalizer');
const decisionLimiter = require('../engine/decisionEventLimiter');

const RULE_VERSION = 'security_recon_v3';

/** @type {Array<(decision: object) => void>} */
const decisionListeners = new Set();

function subscribeDecision(fn) {
  if (typeof fn !== 'function') return () => {};
  decisionListeners.add(fn);
  return () => decisionListeners.delete(fn);
}

function emitDecision(decision, previousBehaviorState) {
  if (!decisionLimiter.shouldPublishDecision(decision, previousBehaviorState)) {
    return;
  }
  decisionLimiter.markPublished(decision);
  for (const fn of decisionListeners) {
    try {
      fn(decision);
    } catch (_e) {
      /* never break correlation */
    }
  }
}

function computeScoreDelta(signal, state) {
  if (isTrustedLocalPeer(signal)) {
    return -999;
  }

  let delta = 0;
  const type = signal.canonicalSignalType;
  const path = signal.path;
  const distinctPath = state ? store.isDistinctPath(state, path) : true;

  if (type === 'TECHNOLOGY_MISMATCH_PROBE' && distinctPath) delta += 4;
  else if (type === 'TECHNOLOGY_MISMATCH_PROBE') delta += 0;

  if (type === 'CREDENTIAL_PROBE' && distinctPath) delta += 3;
  if (type === 'HTTP_404_FLOOD') delta += 5;
  if (type === 'PATH_DISCOVERY' && distinctPath) delta += 1;
  if (type === 'SCANNER_UA') delta += 3;

  if (signal.metadata?.notFound && distinctPath) delta += 0.5;

  if (state) {
    if (state.distinctPaths.size >= 10 && !state.thresholdsHit.has('paths10')) {
      state.thresholdsHit.add('paths10');
      delta += 2;
    }
    if (state.distinctPaths.size >= 30 && !state.thresholdsHit.has('paths30')) {
      state.thresholdsHit.add('paths30');
      delta += 3;
    }
    if (state.probeHits >= 2 && !state.thresholdsHit.has('probes2')) {
      state.thresholdsHit.add('probes2');
      delta += 2;
    }
  }

  if (signal.metadata?.externalBanAlreadyApplied) delta += 1;

  return delta;
}

function scoreToBehaviorState(score, externalBanObserved) {
  if (externalBanObserved) return 'CONTAIN';
  if (score >= 9) return 'CONTAIN';
  if (score >= 6) return 'THROTTLE';
  if (score >= 3) return 'SUSPECT';
  return 'OBSERVE';
}

function buildDecision(signal, state, behaviorState) {
  return {
    schema_version: 'anti_recon_decision_v1',
    eventType: 'ANTI_RECON_DECISION',
    requestId: signal.requestId,
    timestamp: new Date().toISOString(),
    clientIp: signal.clientIp,
    immediatePeerIp: signal.immediatePeerIp,
    proxyResolutionSource: signal.proxyResolutionSource,
    routeCategory: signal.metadata?.routeCategory || null,
    requestedPath: signal.path,
    detectionSignals: {
      canonicalSignalType: signal.canonicalSignalType,
      originalSignalType: signal.originalSignalType,
      sourceLayer: signal.sourceLayer,
      distinctPaths: state.distinctPaths.size,
      notFoundCount: state.notFoundCount,
      probeHits: state.probeHits,
      signalCount: state.signalCount
    },
    riskScore: state.score,
    decision: behaviorState,
    ruleVersion: RULE_VERSION,
    credentialPresent: signal.credentialPresent === true,
    authenticated: signal.authenticated === true,
    serviceIdentityPresent: signal.serviceIdentityPresent === true,
    externalBanObserved: state.externalBanObserved === true
  };
}

/**
 * @param {object} signal — SecuritySignal
 * @returns {{ signal: object, state: object, decision: object, behaviorState: string }|null}
 */
function ingestSignal(signal) {
  try {
    if (!flags.isSecurityReconCorrelationEnabled()) return null;
    if (!signal || !signal.clientIp) return null;

    if (isTrustedLocalPeer(signal)) {
      const st = store.getOrCreate(signal.clientIp);
      return {
        signal,
        state: st,
        decision: buildDecision(signal, st, 'OBSERVE'),
        behaviorState: 'OBSERVE',
        skipped: 'trusted_local_peer'
      };
    }

    const ip = signal.clientIp;
    const prior = store.getOrCreate(ip);
    const previousBehavior = prior.behaviorState || 'OBSERVE';
    const delta = computeScoreDelta(signal, prior);
    const state = store.recordSignal(ip, signal, delta);

    const behaviorState = scoreToBehaviorState(state.score, state.externalBanObserved);
    if (BEHAVIOR_STATES.includes(behaviorState)) {
      store.setBehaviorState(ip, behaviorState);
    }

    const decision = buildDecision(signal, state, behaviorState);
    emitDecision(decision, previousBehavior);

    return { signal, state, decision, behaviorState };
  } catch (e) {
    console.warn('[SEC-RECON] ingestSignal fail-open:', e?.message || e);
    return null;
  }
}

function getBehaviorStateForIp(ip) {
  try {
    const state = store.getState(ip);
    if (!state) return 'OBSERVE';
    return state.behaviorState || 'OBSERVE';
  } catch (_e) {
    return 'OBSERVE';
  }
}

function getStateForIp(ip) {
  return store.getState(ip);
}

module.exports = {
  ingestSignal,
  getBehaviorStateForIp,
  getStateForIp,
  computeScoreDelta,
  scoreToBehaviorState,
  subscribeDecision,
  RULE_VERSION
};
