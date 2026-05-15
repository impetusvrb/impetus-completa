'use strict';

/**
 * IMPETUS — Enterprise Consolidation API (Fase 12)
 * Rota interna unificada para todos os serviços enterprise.
 * Exposição: /api/internal/enterprise/*
 */

const express = require('express');
const router = express.Router();

let operationalTelemetry, executiveComposition, cognitiveEntrypoint,
    pipelineAuthority, observability, explainability,
    adaptiveCognition, automatedGovernance, aiBenchmark,
    cognitiveSimulation, environmentalCognitive,
    authorityRouter, pipelineConsolidation, coldStorage,
    operationalDensity, continuousValidation, cognitivePressure, boundedGovernance;

try { operationalTelemetry = require('../../services/enterprise/operationalTelemetryService'); } catch (e) { console.warn('[ENTERPRISE] operationalTelemetryService not loaded:', e.message); }
try { executiveComposition = require('../../services/enterprise/executiveCompositionService'); } catch (e) { console.warn('[ENTERPRISE] executiveCompositionService not loaded:', e.message); }
try { cognitiveEntrypoint = require('../../services/enterprise/cognitiveEntrypointRegistry'); } catch (e) { console.warn('[ENTERPRISE] cognitiveEntrypointRegistry not loaded:', e.message); }
try { authorityRouter = require('../../services/enterprise/cognitiveAuthorityRouter'); } catch (e) { console.warn('[ENTERPRISE] cognitiveAuthorityRouter not loaded:', e.message); }
try { pipelineConsolidation = require('../../services/enterprise/pipelineAuthorityConsolidation'); } catch (e) { console.warn('[ENTERPRISE] pipelineAuthorityConsolidation not loaded:', e.message); }
try { coldStorage = require('../../services/enterprise/cognitiveColdStorage'); } catch (e) { console.warn('[ENTERPRISE] cognitiveColdStorage not loaded:', e.message); }
try { operationalDensity = require('../../services/enterprise/operationalDensityService'); } catch (e) { console.warn('[ENTERPRISE] operationalDensityService not loaded:', e.message); }
try { continuousValidation = require('../../services/enterprise/continuousValidationEngine'); } catch (e) { console.warn('[ENTERPRISE] continuousValidationEngine not loaded:', e.message); }
try { cognitivePressure = require('../../services/enterprise/cognitivePressureService'); } catch (e) { console.warn('[ENTERPRISE] cognitivePressureService not loaded:', e.message); }
try { boundedGovernance = require('../../services/enterprise/boundedGovernanceEngine'); } catch (e) { console.warn('[ENTERPRISE] boundedGovernanceEngine not loaded:', e.message); }
try { pipelineAuthority = require('../../services/enterprise/eventPipelineAuthorityService'); } catch (e) { console.warn('[ENTERPRISE] eventPipelineAuthorityService not loaded:', e.message); }
try { observability = require('../../services/enterprise/enterpriseObservabilityService'); } catch (e) { console.warn('[ENTERPRISE] enterpriseObservabilityService not loaded:', e.message); }
try { explainability = require('../../services/enterprise/cognitiveExplainabilityService'); } catch (e) { console.warn('[ENTERPRISE] cognitiveExplainabilityService not loaded:', e.message); }
try { adaptiveCognition = require('../../services/enterprise/adaptiveCognitionEngine'); } catch (e) { console.warn('[ENTERPRISE] adaptiveCognitionEngine not loaded:', e.message); }
try { automatedGovernance = require('../../services/enterprise/automatedGovernanceEngine'); } catch (e) { console.warn('[ENTERPRISE] automatedGovernanceEngine not loaded:', e.message); }
try { aiBenchmark = require('../../services/enterprise/aiBenchmarkService'); } catch (e) { console.warn('[ENTERPRISE] aiBenchmarkService not loaded:', e.message); }
try { cognitiveSimulation = require('../../services/enterprise/cognitiveSimulationEngine'); } catch (e) { console.warn('[ENTERPRISE] cognitiveSimulationEngine not loaded:', e.message); }
try { environmentalCognitive = require('../../services/enterprise/environmentalCognitiveService'); } catch (e) { console.warn('[ENTERPRISE] environmentalCognitiveService not loaded:', e.message); }

function _safe(fn) {
  return (req, res) => {
    try {
      const result = fn(req, res);
      if (result && typeof result.then === 'function') {
        result.then(r => res.json(r)).catch(e => res.status(500).json({ error: e.message }));
      } else {
        res.json(result);
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };
}

router.get('/health', _safe(() => {
  const services = {};
  if (operationalTelemetry) services.operational_telemetry = operationalTelemetry.getHealth();
  if (executiveComposition) services.executive_composition = executiveComposition.getMetrics();
  if (cognitiveEntrypoint) services.cognitive_entrypoint = cognitiveEntrypoint.getHealth();
  if (pipelineAuthority) services.pipeline_authority = pipelineAuthority.getHealth();
  if (observability) services.observability = observability.getHealth();
  if (explainability) services.explainability = explainability.getMetrics();
  if (adaptiveCognition) services.adaptive_cognition = adaptiveCognition.getHealth();
  if (automatedGovernance) services.automated_governance = automatedGovernance.getHealth();
  if (aiBenchmark) services.ai_benchmark = aiBenchmark.getHealth();
  if (cognitiveSimulation) services.cognitive_simulation = cognitiveSimulation.getHealth();
  if (environmentalCognitive) services.environmental = environmentalCognitive.getHealth();
  if (authorityRouter) services.authority_router = authorityRouter.getHealth();
  if (pipelineConsolidation) services.pipeline_consolidation = pipelineConsolidation.getHealth();
  if (coldStorage) services.cold_storage = coldStorage.getHealth();
  if (operationalDensity) services.operational_density = operationalDensity.getHealth();
  if (continuousValidation) services.continuous_validation = continuousValidation.getHealth();
  if (cognitivePressure) services.cognitive_pressure = cognitivePressure.getHealth();
  if (boundedGovernance) services.bounded_governance = boundedGovernance.getHealth();

  const healthyCount = Object.values(services).filter(s =>
    s && (s.status === 'healthy' || s.status === 'observation_only' || s.status === 'disabled' || s.status === 'shadow')
  ).length;

  return {
    enterprise_status: healthyCount === Object.keys(services).length ? 'operational' : 'partial',
    services_total: Object.keys(services).length,
    services_healthy: healthyCount,
    services,
    evaluated_at: new Date().toISOString()
  };
}));

router.get('/telemetry/health', _safe(() => operationalTelemetry ? operationalTelemetry.getHealth() : { error: 'not_loaded' }));
router.get('/telemetry/snapshot/:companyId', _safe((req) => operationalTelemetry ? operationalTelemetry.getUnifiedSnapshot(req.params.companyId) : { error: 'not_loaded' }));
router.get('/telemetry/freshness/:companyId', _safe((req) => operationalTelemetry ? operationalTelemetry.evaluateFreshness(req.params.companyId) : { error: 'not_loaded' }));
router.get('/telemetry/events/:companyId', _safe((req) => operationalTelemetry ? operationalTelemetry.getRecentEvents(req.params.companyId, { limit: 50, domain: req.query.domain }) : { error: 'not_loaded' }));

router.post('/telemetry/ingest', _safe((req) => operationalTelemetry ? operationalTelemetry.ingest(req.body) : { error: 'not_loaded' }));

router.get('/composition/metrics', _safe(() => executiveComposition ? executiveComposition.getMetrics() : { error: 'not_loaded' }));
router.post('/composition/compose', _safe((req) => executiveComposition ? executiveComposition.compose(req.body.widgets || [], req.body.context || {}) : { error: 'not_loaded' }));
router.post('/composition/narrative', _safe((req) => executiveComposition ? executiveComposition.buildNarrative(req.body.snapshot || {}, req.body.context || {}) : { error: 'not_loaded' }));

router.get('/cognitive/entrypoints', _safe(() => cognitiveEntrypoint ? cognitiveEntrypoint.getRegisteredEntrypoints() : { error: 'not_loaded' }));
router.get('/cognitive/metrics', _safe(() => cognitiveEntrypoint ? cognitiveEntrypoint.getMetrics() : { error: 'not_loaded' }));
router.get('/cognitive/health', _safe(() => cognitiveEntrypoint ? cognitiveEntrypoint.getHealth() : { error: 'not_loaded' }));

router.get('/pipeline/health', _safe(() => pipelineAuthority ? pipelineAuthority.getHealth() : { error: 'not_loaded' }));
router.get('/pipeline/scores', _safe(() => pipelineAuthority ? pipelineAuthority.getRuntimeScores() : { error: 'not_loaded' }));
router.get('/pipeline/decisions', _safe(() => pipelineAuthority ? pipelineAuthority.getRecentDecisions(50) : { error: 'not_loaded' }));
router.post('/pipeline/arbitrate', _safe((req) => pipelineAuthority ? pipelineAuthority.arbitrate(req.body || {}) : { error: 'not_loaded' }));
router.post('/pipeline/kill-switch/activate', _safe((req) => pipelineAuthority ? pipelineAuthority.activateKillSwitch(req.body.reason, req.body.activated_by) : { error: 'not_loaded' }));
router.post('/pipeline/kill-switch/deactivate', _safe(() => pipelineAuthority ? pipelineAuthority.deactivateKillSwitch() : { error: 'not_loaded' }));

router.get('/observability/health', _safe(() => observability ? observability.getHealth() : { error: 'not_loaded' }));
router.get('/observability/prometheus', (req, res) => {
  try {
    if (!observability) return res.status(503).send('not_loaded');
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(observability.exportPrometheusText());
  } catch (e) { res.status(500).send(e.message); }
});
router.post('/observability/snapshot', _safe(() => observability ? observability.takeSnapshot() : { error: 'not_loaded' }));

router.get('/explainability/metrics', _safe(() => explainability ? explainability.getMetrics() : { error: 'not_loaded' }));
router.get('/explainability/explain/:decisionId', _safe((req) => explainability ? explainability.explainDecision(req.params.decisionId) : { error: 'not_loaded' }));
router.get('/explainability/recent/:companyId', _safe((req) => explainability ? explainability.getRecentDecisions(req.params.companyId, 20) : { error: 'not_loaded' }));

router.get('/adaptive/health', _safe(() => adaptiveCognition ? adaptiveCognition.getHealth() : { error: 'not_loaded' }));
router.get('/adaptive/weights', _safe(() => adaptiveCognition ? adaptiveCognition.getAllWeights() : { error: 'not_loaded' }));
router.post('/adaptive/feedback', _safe((req) => adaptiveCognition ? adaptiveCognition.submitFeedback(req.body) : { error: 'not_loaded' }));

router.get('/governance/health', _safe(() => automatedGovernance ? automatedGovernance.getHealth() : { error: 'not_loaded' }));
router.get('/governance/state', _safe(() => automatedGovernance ? automatedGovernance.getGovernanceState() : { error: 'not_loaded' }));
router.get('/governance/actions', _safe(() => automatedGovernance ? automatedGovernance.getRecentActions(50) : { error: 'not_loaded' }));
router.get('/governance/predictions', _safe(() => automatedGovernance ? automatedGovernance.getPredictiveAlerts(20) : { error: 'not_loaded' }));
router.post('/governance/evaluate', _safe((req) => automatedGovernance ? automatedGovernance.evaluate(req.body || {}) : { error: 'not_loaded' }));

router.get('/benchmark/health', _safe(() => aiBenchmark ? aiBenchmark.getHealth() : { error: 'not_loaded' }));
router.get('/benchmark/compare', _safe(() => aiBenchmark ? aiBenchmark.compareModels() : { error: 'not_loaded' }));
router.get('/benchmark/best/:taskType', _safe((req) => aiBenchmark ? aiBenchmark.selectBestForTask(req.params.taskType) : { error: 'not_loaded' }));
router.post('/benchmark/record', _safe((req) => aiBenchmark ? aiBenchmark.recordRun(req.body.model, req.body.task_type, req.body) : { error: 'not_loaded' }));

router.get('/simulation/health', _safe(() => cognitiveSimulation ? cognitiveSimulation.getHealth() : { error: 'not_loaded' }));
router.get('/simulation/recent', _safe(() => cognitiveSimulation ? cognitiveSimulation.getRecentSimulations(50) : { error: 'not_loaded' }));
router.get('/simulation/regressions', _safe(() => cognitiveSimulation ? cognitiveSimulation.getRegressionReports(20) : { error: 'not_loaded' }));
router.post('/simulation/compare', _safe((req) => cognitiveSimulation ? cognitiveSimulation.runComparison(req.body.input, req.body.response_a || {}, req.body.response_b || {}, req.body.context || {}) : { error: 'not_loaded' }));
router.post('/simulation/analyze-regression', _safe((req) => cognitiveSimulation ? cognitiveSimulation.analyzeRegression(req.body || {}) : { error: 'not_loaded' }));

router.get('/environmental/health', _safe(() => environmentalCognitive ? environmentalCognitive.getHealth() : { error: 'not_loaded' }));
router.get('/environmental/panel/:companyId', _safe((req) => environmentalCognitive ? environmentalCognitive.getExecutivePanelData(req.params.companyId) : { error: 'not_loaded' }));
router.post('/environmental/ingest', _safe((req) => environmentalCognitive ? environmentalCognitive.ingestEnvironmentalData(req.body.company_id, req.body) : { error: 'not_loaded' }));

/* ===== Consolidação Operacional Cognitiva (F1-F8) ===== */

router.get('/authority-router/health', _safe(() => authorityRouter ? authorityRouter.getHealth() : { error: 'not_loaded' }));
router.get('/authority-router/metrics', _safe(() => authorityRouter ? authorityRouter.getMetrics() : { error: 'not_loaded' }));
router.get('/authority-router/active', _safe(() => authorityRouter ? authorityRouter.getActiveRequests() : { error: 'not_loaded' }));
router.get('/authority-router/legacy-audit', _safe(() => authorityRouter ? authorityRouter.getLegacyAudit(100) : { error: 'not_loaded' }));
router.post('/authority-router/route', _safe((req) => authorityRouter ? authorityRouter.route(req.body || {}) : { error: 'not_loaded' }));
router.post('/authority-router/advance/:requestId', _safe((req) => authorityRouter ? authorityRouter.advanceStage(req.params.requestId, req.body || {}) : { error: 'not_loaded' }));

router.get('/pipeline-consolidation/health', _safe(() => pipelineConsolidation ? pipelineConsolidation.getHealth() : { error: 'not_loaded' }));
router.get('/pipeline-consolidation/metrics', _safe(() => pipelineConsolidation ? pipelineConsolidation.getMetrics() : { error: 'not_loaded' }));
router.get('/pipeline-consolidation/mode', _safe(() => pipelineConsolidation ? { mode: pipelineConsolidation.getMode(), level: pipelineConsolidation.getModeLevel() } : { error: 'not_loaded' }));
router.get('/pipeline-consolidation/recommendations', _safe(() => pipelineConsolidation ? pipelineConsolidation.getRecommendations(50) : { error: 'not_loaded' }));
router.get('/pipeline-consolidation/shadow-decisions', _safe(() => pipelineConsolidation ? pipelineConsolidation.getShadowDecisions(50) : { error: 'not_loaded' }));
router.get('/pipeline-consolidation/divergence-rate', _safe(() => pipelineConsolidation ? { rate_pct: pipelineConsolidation.getDivergenceRate() } : { error: 'not_loaded' }));
router.post('/pipeline-consolidation/evaluate', _safe((req) => pipelineConsolidation ? pipelineConsolidation.evaluateAuthority(req.body || {}) : { error: 'not_loaded' }));

router.get('/cold-storage/health', _safe(() => coldStorage ? coldStorage.getHealth() : { error: 'not_loaded' }));
router.get('/cold-storage/metrics', _safe(() => coldStorage ? coldStorage.getMetrics() : { error: 'not_loaded' }));
router.get('/cold-storage/snapshot', _safe(() => coldStorage ? coldStorage.takeSnapshot() : { error: 'not_loaded' }));
router.get('/cold-storage/query/:type', _safe((req) => coldStorage ? coldStorage.query(req.params.type, req.query || {}) : { error: 'not_loaded' }));
router.get('/cold-storage/temporal/:type', _safe((req) => coldStorage ? coldStorage.temporalAnalysis(req.params.type, req.query || {}) : { error: 'not_loaded' }));
router.post('/cold-storage/store', _safe((req) => coldStorage ? { record_id: coldStorage.store(req.body.type, req.body.data || req.body) } : { error: 'not_loaded' }));
router.post('/cold-storage/archive', _safe((req) => coldStorage ? coldStorage.archiveOlderThan(req.body.days || 90) : { error: 'not_loaded' }));

router.get('/operational-density/health', _safe(() => operationalDensity ? operationalDensity.getHealth() : { error: 'not_loaded' }));
router.get('/operational-density/metrics', _safe(() => operationalDensity ? operationalDensity.getMetrics() : { error: 'not_loaded' }));
router.get('/operational-density/history/:companyId', _safe((req) => operationalDensity ? operationalDensity.getDensityHistory(req.params.companyId) : { error: 'not_loaded' }));
router.post('/operational-density/evaluate', _safe((req) => operationalDensity ? operationalDensity.evaluate(req.body.snapshot || {}, req.body) : { error: 'not_loaded' }));

router.get('/continuous-validation/health', _safe(() => continuousValidation ? continuousValidation.getHealth() : { error: 'not_loaded' }));
router.get('/continuous-validation/metrics', _safe(() => continuousValidation ? continuousValidation.getMetrics() : { error: 'not_loaded' }));
router.get('/continuous-validation/violations', _safe(() => continuousValidation ? continuousValidation.getRecentViolations(50) : { error: 'not_loaded' }));
router.get('/continuous-validation/stats', _safe(() => continuousValidation ? continuousValidation.getValidationStats() : { error: 'not_loaded' }));
router.get('/continuous-validation/benchmarks', _safe(() => continuousValidation ? continuousValidation.getTemporalComparison() : { error: 'not_loaded' }));
router.post('/continuous-validation/validate', _safe((req) => continuousValidation ? continuousValidation.validate(req.body.input || {}, req.body.output || {}, req.body.context || {}) : { error: 'not_loaded' }));
router.post('/continuous-validation/benchmark', _safe((req) => continuousValidation ? continuousValidation.recordBenchmark(req.body.model, req.body) : { error: 'not_loaded' }));

router.get('/cognitive-pressure/health', _safe(() => cognitivePressure ? cognitivePressure.getHealth() : { error: 'not_loaded' }));
router.get('/cognitive-pressure/metrics', _safe(() => cognitivePressure ? cognitivePressure.getMetrics() : { error: 'not_loaded' }));
router.get('/cognitive-pressure/samples', _safe(() => cognitivePressure ? cognitivePressure.getRecentPressureSamples(50) : { error: 'not_loaded' }));
router.get('/cognitive-pressure/health-scores', _safe(() => cognitivePressure ? cognitivePressure.getRecentHealthScores(50) : { error: 'not_loaded' }));
router.get('/cognitive-pressure/latest-health', _safe(() => cognitivePressure ? cognitivePressure.getLatestHealthScore() : { error: 'not_loaded' }));
router.get('/cognitive-pressure/trend', _safe(() => cognitivePressure ? cognitivePressure.getPressureTrend() : { error: 'not_loaded' }));
router.post('/cognitive-pressure/sample', _safe((req) => cognitivePressure ? cognitivePressure.sample(req.body || {}) : { error: 'not_loaded' }));
router.post('/cognitive-pressure/compute-health', _safe((req) => cognitivePressure ? cognitivePressure.computeHealthScore(req.body || {}) : { error: 'not_loaded' }));

router.get('/bounded-governance/health', _safe(() => boundedGovernance ? boundedGovernance.getHealth() : { error: 'not_loaded' }));
router.get('/bounded-governance/metrics', _safe(() => boundedGovernance ? boundedGovernance.getMetrics() : { error: 'not_loaded' }));
router.get('/bounded-governance/suggestions', _safe(() => boundedGovernance ? boundedGovernance.getRecentSuggestions(50) : { error: 'not_loaded' }));
router.get('/bounded-governance/violations', _safe(() => boundedGovernance ? boundedGovernance.getBoundaryViolations(50) : { error: 'not_loaded' }));
router.get('/bounded-governance/saturation', _safe(() => boundedGovernance ? boundedGovernance.getSaturationState() : { error: 'not_loaded' }));
router.post('/bounded-governance/check', _safe((req) => boundedGovernance ? boundedGovernance.checkBoundary(req.body.action, req.body.context || {}) : { error: 'not_loaded' }));
router.post('/bounded-governance/suggest', _safe((req) => boundedGovernance ? boundedGovernance.suggest(req.body.type, req.body.analysis || {}) : { error: 'not_loaded' }));
router.post('/bounded-governance/simulate', _safe((req) => boundedGovernance ? boundedGovernance.simulate(req.body.change || {}, req.body.current_state || {}) : { error: 'not_loaded' }));

module.exports = router;
