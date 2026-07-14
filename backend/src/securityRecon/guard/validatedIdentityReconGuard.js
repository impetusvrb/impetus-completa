'use strict';

/**
 * Guard pós-validação — executado SOMENTE após auth oficial bem-sucedida.
 * Síncrono, fail-open, feature-flagged, zero SQL.
 */
const flags = require('../config/securityReconFlags');
const { evaluateValidatedIdentityDecision } = require('../engine/postValidationDecision');
const { normalizeFromHttpRequest } = require('../engine/signalNormalizer');
const { resolveCanonicalClientIp } = require('../../services/clientIpResolver');
const decisionLimiter = require('../engine/decisionEventLimiter');

const NEUTRAL_404 = Object.freeze({ success: false, error: 'Not found' });

function applyEnforcementResponse(res, decision) {
  res.status(404);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json(NEUTRAL_404);
}

function recordPostValidationEnforcement(req, evaluation) {
  try {
    const canonicalIp = req.impetusClientNetwork || resolveCanonicalClientIp(req);
    const signal = normalizeFromHttpRequest(req, {
      canonicalIp,
      statusCode: 404
    });
    signal.metadata.postValidationEnforcement = evaluation.decision;
    signal.metadata.rawScore = evaluation.rawScore;
    signal.metadata.effectiveScore = evaluation.effectiveScore;
    signal.metadata.validationSource = evaluation.identity.validationSource;

    const decision = {
      schema_version: 'anti_recon_decision_v1',
      eventType: 'ANTI_RECON_DECISION',
      requestId: req.id || req.headers?.['x-request-id'] || null,
      timestamp: new Date().toISOString(),
      clientIp: evaluation.clientIp,
      immediatePeerIp: evaluation.immediatePeerIp,
      requestedPath: (req.originalUrl || req.path || '').split('?')[0],
      riskScore: evaluation.effectiveScore,
      rawRiskScore: evaluation.rawScore,
      decision: evaluation.decision,
      ruleVersion: evaluation.ruleVersion,
      enforcementStage: 'post_validation',
      authenticated: evaluation.identity.authenticatedIdentity,
      identityType: evaluation.identity.identityType,
      validationSource: evaluation.identity.validationSource
    };

    if (decisionLimiter.shouldPublishDecision(decision, null)) {
      decisionLimiter.markPublished(decision);
      try {
        const sec01 = require('../../securityObservatory');
        if (sec01.isEnabled()) {
          sec01.recordExternalEvent('ANTI_RECON_DECISION', {
            ip: decision.clientIp,
            decision: decision.decision,
            risk_score: decision.riskScore,
            path: decision.requestedPath,
            rule_version: decision.ruleVersion,
            stage: 'post_validation'
          });
        }
      } catch (_e) {
        /* optional */
      }
    }
  } catch (e) {
    console.warn('[SEC-RECON] post-validation record fail-open:', e?.message || e);
  }
}

/**
 * @returns {boolean} true → continuar para next(); false → resposta já enviada
 */
function runValidatedIdentityReconGuard(req, res, meta = {}) {
  if (!flags.isSecurityReconCorrelationEnabled()) return true;
  if (!flags.reconContainmentEnabled()) return true;

  try {
    const evaluation = evaluateValidatedIdentityDecision(req, meta);

    if (evaluation.decision === 'ALLOW' || evaluation.decision === 'SUSPECT' || evaluation.decision === 'OBSERVE') {
      return true;
    }

    if (evaluation.decision === 'THROTTLE' || evaluation.decision === 'CONTAIN') {
      req._reconPostValidationBlocked = evaluation.decision;
      recordPostValidationEnforcement(req, evaluation);
      applyEnforcementResponse(res, evaluation.decision);
      return false;
    }

    return true;
  } catch (e) {
    console.warn('[SEC-RECON] validatedIdentityReconGuard fail-open:', e?.message || e);
    return true;
  }
}

module.exports = {
  runValidatedIdentityReconGuard,
  NEUTRAL_404,
  recordPostValidationEnforcement,
  applyEnforcementResponse
};
