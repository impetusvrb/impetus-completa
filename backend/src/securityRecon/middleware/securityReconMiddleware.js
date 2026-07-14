'use strict';

const flags = require('../config/securityReconFlags');
const engine = require('../engine/securityReconCorrelationEngine');
const { normalizeFromHttpRequest } = require('../engine/signalNormalizer');
const { resolveIdentityContext } = require('../engine/identityContext');
const { canEnforcePreAuth } = require('../engine/anonymousPreAuthPolicy');
const {
  classifyRoute,
  isContainmentCandidate,
  isPublicContractRoute
} = require('../engine/routeExposurePolicy');
const {
  resolveCanonicalClientIp
} = require('../../services/clientIpResolver');

const NEUTRAL_404 = Object.freeze({ success: false, error: 'Not found' });

function applyNeutralContainment(res) {
  res.status(404);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json(NEUTRAL_404);
}

function shouldApplyRuntimeContainment(behavior, state, identity, pathOnly) {
  if (!flags.reconContainmentEnabled()) return false;
  if (identity.authenticatedIdentity) return false;

  if (!canEnforcePreAuth(state, pathOnly)) return false;

  if (state?.externalBanObserved) return true;

  if (isPublicContractRoute(pathOnly) && behavior !== 'CONTAIN') {
    return false;
  }

  if (!isContainmentCandidate(pathOnly, false) && !isPublicContractRoute(pathOnly)) {
    return false;
  }

  return behavior === 'CONTAIN';
}

function securityReconMiddleware(req, res, next) {
  if (!flags.isSecurityReconCorrelationEnabled()) return next();

  try {
    const pathOnly = (req.originalUrl || req.path || '').split('?')[0];
    const canonicalIp = resolveCanonicalClientIp(req);
    req.impetusClientNetwork = canonicalIp;

    const routeCategory = classifyRoute(pathOnly);
    const identity = resolveIdentityContext(req);
    const behavior = engine.getBehaviorStateForIp(canonicalIp.clientIp);
    const state = engine.getStateForIp(canonicalIp.clientIp);

    if (shouldApplyRuntimeContainment(behavior, state, identity, pathOnly)) {
      const signal = normalizeFromHttpRequest(req, {
        canonicalIp,
        statusCode: 404
      });
      signal.metadata.routeCategory = routeCategory;
      signal.metadata.containmentApplied = 'CONTAIN_EXTERNAL';
      engine.ingestSignal(signal);

      req._reconContainmentApplied = 'CONTAIN_EXTERNAL';
      applyNeutralContainment(res);
      return;
    }

    const t0 = Date.now();
    res.on('finish', () => {
      if (req._reconContainmentApplied) return;
      try {
        const finishIdentity = resolveIdentityContext(req);
        const signal = normalizeFromHttpRequest(req, {
          canonicalIp,
          statusCode: res.statusCode
        });
        signal.metadata.routeCategory = routeCategory;
        signal.metadata.latencyMs = Date.now() - t0;
        signal.metadata.identityStageAtFinish = finishIdentity.identityStage;
        engine.ingestSignal(signal);
      } catch (e) {
        console.warn('[SEC-RECON] finish ingest fail-open:', e?.message || e);
      }
    });
  } catch (e) {
    console.warn('[SEC-RECON] middleware fail-open:', e?.message || e);
  }

  return next();
}

module.exports = { securityReconMiddleware, NEUTRAL_404, shouldApplyRuntimeContainment };
