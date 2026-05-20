'use strict';

const express = require('express');
const router = express.Router();

const phaseO = require('../../runtimeStabilization/config/phaseOFeatureFlags');
const facade = require('../../runtimeStabilization/runtimeStabilizationFacade');
const { detectGovernanceFatigue } = require('../../runtimeStabilization/governanceFatigueDetector');
const { analyzePipelineRedundancy } = require('../../runtimeStabilization/pipelineRedundancyAnalyzer');
const { computeRuntimeEfficiency } = require('../../runtimeStabilization/runtimeEfficiencyEngine');
const { analyzeShadowOptimization } = require('../../runtimeStabilization/shadowOptimizationEngine');
const { evaluateRuntimeMaturity } = require('../../runtimeStabilization/runtimeMaturityEvaluator');
const { evaluateGovernanceMaturity } = require('../../runtimeStabilization/enterpriseGovernanceMaturity');
const { evaluateOperationalCognitiveMaturity } = require('../../runtimeStabilization/operationalCognitiveMaturity');
const { getStabilizationTelemetry } = require('../../runtimeStabilization/stabilizationTelemetry');

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
    phase: 'O',
    observability: phaseO.isRuntimeStabilizationObservabilityEnabled(),
    shadow_first: true,
    flags: facade.getStabilizationReport().flags
  });
});

router.get('/fatigue', (req, res) => {
  const layers = Number(req.query.layers) || 5;
  const pressure = Number(req.query.pressure) || 0.6;
  res.json({
    ok: true,
    ...detectGovernanceFatigue({ active_layers: layers, cognitive_operational_pressure: pressure })
  });
});

router.get('/redundancy', (req, res) => {
  const blocks = facade.buildActiveBlocks({
    semantic_alignment: req.query.semantic === '1' ? {} : null,
    precision_delivery: req.query.precision === '1' ? {} : null,
    cognitive_convergence: req.query.convergence === '1' ? {} : null,
    enterprise_cognitive_operations: req.query.operations === '1' ? {} : null
  });
  res.json({ ok: true, ...analyzePipelineRedundancy(blocks) });
});

router.get('/efficiency', (req, res) => {
  res.json({
    ok: true,
    ...computeRuntimeEfficiency({
      active_layers: Number(req.query.layers) || 4,
      observability_blocks: Number(req.query.observability) || 4
    })
  });
});

router.get('/shadow', (req, res) => {
  res.json({
    ok: true,
    ...analyzeShadowOptimization({
      shadow_layers: Number(req.query.layers) || 5,
      shadow_duplication: req.query.duplicate === '1'
    })
  });
});

router.get('/maturity', (req, res) => {
  const signals = {
    runtime_efficiency: Number(req.query.efficiency) || 0.85,
    runtime_stability: 0.88,
    runtime_entropy_score: Number(req.query.entropy) || 0.15,
    governance_effectiveness_score: 0.84,
    governance_fatigue: Number(req.query.fatigue) || 0.2,
    cognitive_runtime_health: 0.87,
    cognitive_operational_pressure: Number(req.query.pressure) || 0.3,
    runtime_resilience: 0.88
  };
  res.json({
    ok: true,
    runtime: evaluateRuntimeMaturity(signals),
    governance: evaluateGovernanceMaturity(signals),
    operational_cognitive: evaluateOperationalCognitiveMaturity(signals)
  });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, ...facade.getStabilizationReport() });
});

module.exports = router;
