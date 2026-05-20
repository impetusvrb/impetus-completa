'use strict';

const express = require('express');
const router = express.Router();

const phaseR = require('../../decisionReliability/config/phaseRFeatureFlags');
const facade = require('../../decisionReliability/decisionReliabilityFacade');
const { computeOperationalTrust } = require('../../decisionReliability/operationalTrustEngine');
const { analyzeRecommendationQuality } = require('../../decisionReliability/recommendationQualityAnalyzer');
const { detectCognitiveAmbiguity } = require('../../decisionReliability/cognitiveAmbiguityDetector');
const { assessDecisionStability } = require('../../decisionReliability/decisionStabilityEngine');
const { assessHumanOversight } = require('../../decisionReliability/humanOversightReliability');
const { getReliabilityTelemetry } = require('../../decisionReliability/reliabilityTelemetry');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  }
  next();
});

router.get('/status', (req, res) => {
  res.json({
    ok: true,
    phase: 'R',
    observability: phaseR.isDecisionReliabilityObservabilityEnabled(),
    shadow_first: true,
    flags: facade.getReliabilityReport().flags
  });
});

router.get('/trust', (req, res) => {
  res.json({
    ok: true,
    ...computeOperationalTrust(
      { functional_axis: req.query.axis, cognitive_consistency_score: Number(req.query.consistency) || 0.85 },
      { text: req.query.text || '', degraded: req.query.degraded === '1' }
    )
  });
});

router.get('/recommendations', (req, res) => {
  res.json({
    ok: true,
    ...analyzeRecommendationQuality(
      { text: req.query.text || 'Recomendo verificar o KPI de qualidade antes da reunião operacional.' },
      { functional_axis: req.query.axis, canonical_axis: req.query.axis }
    )
  });
});

router.get('/ambiguity', (req, res) => {
  res.json({
    ok: true,
    ...detectCognitiveAmbiguity(
      {
        canonical_axis: req.query.axis,
        ambiguous_targeting: req.query.ambiguous === '1',
        interchannel_divergence: req.query.divergence === '1'
      },
      { text: req.query.text || '' }
    )
  });
});

router.get('/stability', (req, res) => {
  res.json({
    ok: true,
    ...assessDecisionStability(
      req.user,
      { text: req.query.text || 'stable guidance' },
      { channel: req.query.channel || 'api' }
    )
  });
});

router.get('/supervision', (req, res) => {
  res.json({
    ok: true,
    ...assessHumanOversight({
      low_trust: req.query.low_trust === '1',
      high_ambiguity: req.query.high_ambiguity === '1',
      weak_guidance: req.query.weak === '1',
      escalate_recommended: req.query.escalate === '1'
    })
  });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, ...facade.getReliabilityReport(), telemetry: getReliabilityTelemetry() });
});

module.exports = router;
