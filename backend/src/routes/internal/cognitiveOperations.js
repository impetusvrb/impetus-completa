'use strict';

const express = require('express');
const router = express.Router();

const phaseN = require('../../cognitiveOperations/config/phaseNFeatureFlags');
const facade = require('../../cognitiveOperations/cognitiveOperationsFacade');
const { computeCognitiveRuntimeHealth } = require('../../cognitiveOperations/cognitiveHealthMonitor');
const { detectCognitiveEntropy } = require('../../cognitiveOperations/cognitiveEntropyDetector');
const { getEntropyTrend } = require('../../cognitiveOperations/runtimeEntropyTracker');
const { assessCognitiveStability } = require('../../cognitiveOperations/cognitiveStabilityEngine');
const { resolveOperationalConfidence } = require('../../cognitiveOperations/operationalConfidenceResolver');
const { resolveOperationalAnomalies } = require('../../cognitiveOperations/operationalAnomalyResolver');
const { adviseRuntimeCalibration } = require('../../cognitiveOperations/runtimeCalibrationAdvisor');
const { getEnterpriseOperationalTelemetry } = require('../../cognitiveOperations/enterpriseOperationalTelemetry');
const { getCognitiveOperationalState } = require('../../cognitiveOperations/cognitiveOperationalState');

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
    phase: 'N',
    observability: phaseN.isEnterpriseOperationsObservabilityEnabled(),
    shadow_first: true,
    operational_state: getCognitiveOperationalState(),
    flags: facade.getOperationsReport().flags
  });
});

router.get('/health', (req, res) => {
  const signals = facade.buildSignalsFromContext({
    cognitive_convergence: req.query.convergence ? JSON.parse(req.query.convergence) : {}
  });
  res.json({ ok: true, ...computeCognitiveRuntimeHealth(signals), telemetry: getEnterpriseOperationalTelemetry() });
});

router.get('/entropy', (req, res) => {
  const entropy = detectCognitiveEntropy({ fallback_rate: Number(req.query.fallback) || 0, cognitive_consistency_score: 0.85 });
  res.json({ ok: true, ...entropy, trend: getEntropyTrend(15) });
});

router.get('/stability', (req, res) => {
  res.json({ ok: true, ...assessCognitiveStability({ cognitive_consistency_score: Number(req.query.consistency) || 0.88 }) });
});

router.get('/confidence', (req, res) => {
  res.json({
    ok: true,
    ...resolveOperationalConfidence({
      drift_detected: req.query.drift === '1',
      entropy: Number(req.query.entropy) || 0.1,
      truth_integrity: 0.88,
      contextual_integrity: 0.86,
      governance_operational_health: 0.84
    })
  });
});

router.get('/anomalies', (req, res) => {
  res.json({
    ok: true,
    ...resolveOperationalAnomalies({
      drift: { drift_detected: req.query.drift === '1' },
      entropy: { runtime_entropy_score: Number(req.query.entropy) || 0 },
      fallback_rate: Number(req.query.fallback) || 0
    })
  });
});

router.get('/calibration', (req, res) => {
  res.json({
    ok: true,
    ...adviseRuntimeCalibration({
      runtime_entropy_score: Number(req.query.entropy) || 0.2,
      runtime_stability: Number(req.query.stability) || 0.85,
      cognitive_operational_pressure: Number(req.query.pressure) || 0.3
    })
  });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, ...facade.getOperationsReport() });
});

module.exports = router;
