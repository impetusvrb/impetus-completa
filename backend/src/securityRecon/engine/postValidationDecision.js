'use strict';

const engine = require('./securityReconCorrelationEngine');
const { buildValidatedIdentityContext } = require('./validatedIdentityContext');
const { resolveCanonicalClientIp } = require('../../services/clientIpResolver');
const { classifyRoute } = require('./routeExposurePolicy');
const { STATE_THRESHOLDS } = require('./scorePolicy');

const AUTHENTICATED_SCORE_REDUCER = 3;
const RULE_VERSION = 'security_recon_v3';

/**
 * Avalia decisão pós-validação sem reiniciar score nem duplicar store.
 * AUTHENTICATED_IDENTITY é redutor contextual — nunca imunidade absoluta.
 */
function evaluateValidatedIdentityDecision(req, meta = {}) {
  const canonicalIp = req.impetusClientNetwork || resolveCanonicalClientIp(req);
  const clientIp = canonicalIp.clientIp || 'unknown';
  const state = engine.getStateForIp(clientIp) || {
    score: 0,
    behaviorState: 'OBSERVE',
    externalBanObserved: false,
    distinctPaths: new Set(),
    probeHits: 0,
    notFoundCount: 0,
    signalCount: 0
  };

  const identity = buildValidatedIdentityContext(req, meta);
  const rawScore = state.score || 0;

  let effectiveScore = rawScore;
  if (identity.authenticatedIdentity || identity.serviceIdentityValidated) {
    effectiveScore = Math.max(0, rawScore - AUTHENTICATED_SCORE_REDUCER);
  }

  let decision = 'ALLOW';
  if (state.externalBanObserved) {
    decision = 'CONTAIN';
  } else if (effectiveScore >= STATE_THRESHOLDS.CONTAIN.min) {
    decision = 'CONTAIN';
  } else if (effectiveScore >= STATE_THRESHOLDS.THROTTLE.min) {
    decision = 'THROTTLE';
  } else if (effectiveScore >= STATE_THRESHOLDS.SUSPECT.min) {
    decision = 'SUSPECT';
  } else {
    decision = 'ALLOW';
  }

  const pathOnly = (req.originalUrl || req.path || '').split('?')[0];

  return {
    decision,
    rawScore,
    effectiveScore,
    identity,
    clientIp,
    immediatePeerIp: canonicalIp.immediatePeerIp,
    routeCategory: classifyRoute(pathOnly),
    externalBanObserved: state.externalBanObserved === true,
    ruleVersion: RULE_VERSION
  };
}

module.exports = {
  evaluateValidatedIdentityDecision,
  AUTHENTICATED_SCORE_REDUCER,
  RULE_VERSION
};
