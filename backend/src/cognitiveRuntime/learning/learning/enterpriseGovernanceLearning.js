'use strict';

const { analyzeCognitivePatterns } = require('../patterns/cognitivePatternAnalyzer');
const { analyzeUsefulnessTrends } = require('../usefulness/usefulnessTrendAnalyzer');
const { learnOperationalSignals } = require('../usefulness/operationalSignalLearning');
const { learnStrategicSignals } = require('../usefulness/strategicSignalLearning');
const { analyzeFatigueLearning } = require('../fatigue/fatigueLearningRuntime');
const { analyzeAttentionCollapse } = require('../fatigue/attentionCollapseAnalyzer');
const { analyzeAlertPersistence } = require('../fatigue/alertPersistenceAnalyzer');
const { learnDashboardStress } = require('../fatigue/dashboardStressLearning');
const { learnConvergence } = require('../convergence/convergenceLearningRuntime');
const { analyzeEnterpriseAlignment } = require('../convergence/enterprisePatternAlignment');
const { learnOrganizationalStability } = require('../convergence/organizationalStabilityLearning');
const { learnCrossDomain } = require('../convergence/crossDomainLearningEngine');
const { buildGovernanceRecommendations } = require('../recommendations/governanceRecommendationEngine');
const { runLearningRecommendationRuntime } = require('../recommendations/learningRecommendationRuntime');
const { superviseLearning } = require('../governance/contextualLearningSupervisor');
const { appendOrchestrationSnapshot, getOrchestrationLearningMemory } = require('../memory/orchestrationLearningMemory');
const { extractCockpitPatterns } = require('../memory/cockpitPatternMemory');
const { runExecutiveLearning } = require('../learning/executiveLearningRuntime');
const { analyzeLearningPerformance } = require('../performance/learningPerformanceRuntime');
const { verifyGovernanceLearningSafety } = require('../performance/governanceLearningSafety');

function runOrganizationalLearningRuntime(user = {}, payload = {}, ctx = {}, store = {}) {
  const patterns = analyzeCognitivePatterns(store, payload);
  const usefulness = analyzeUsefulnessTrends(store);
  const opSignals = learnOperationalSignals(store, payload);
  const stSignals = learnStrategicSignals(store, payload);
  const fatigue = analyzeFatigueLearning(store);
  const attention = analyzeAttentionCollapse(store);
  const alerts = analyzeAlertPersistence(store);
  const stress = learnDashboardStress(store);
  const convergence = learnConvergence(store, payload);
  const alignment = analyzeEnterpriseAlignment(store);
  const stability = learnOrganizationalStability(store);
  const crossDomain = learnCrossDomain(store, payload);
  const cockpitPatterns = extractCockpitPatterns(store);
  const recommendations = buildGovernanceRecommendations({ patterns, fatigue, usefulness, convergence });
  const supervised = runLearningRecommendationRuntime(recommendations);
  const governance = superviseLearning(supervised);
  const executive = runExecutiveLearning(store, payload);
  const perf = analyzeLearningPerformance({ snapshot_count: (store.snapshots || []).length });
  const safety = verifyGovernanceLearningSafety(supervised);

  return {
    patterns,
    usefulness: { ...usefulness, operational: opSignals, strategic: stSignals },
    fatigue: { ...fatigue, attention, alerts, stress },
    convergence: { ...convergence, alignment, stability, crossDomain },
    cockpit_patterns: cockpitPatterns,
    recommendations: supervised,
    executive_learning: executive,
    governance,
    performance: perf,
    safety
  };
}

function runEnterpriseGovernanceLearning(user = {}, payload = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id || 'default';
  const ao = payload.adaptive_orchestration || {};
  const snapshot = {
    usefulness_score: ao.usefulness_score,
    fatigue_detected: ao.fatigue_detected,
    cross_domain_pressure: ao.cross_domain_pressure,
    convergence_index: payload.executive_cognitive_runtime?.strategic?.convergence,
    runtime_safe: ao.runtime_safe,
    alert_count: payload.executive_cognitive_centers?.filter((c) => c.render_slot === 'alertas').length ?? 0,
    executive_fatigue: ao.fatigue_detected && payload.executive_cognitive_runtime?.consolidation_applied
  };
  appendOrchestrationSnapshot(tenantId, snapshot);
  const store = getOrchestrationLearningMemory(tenantId);
  const report = runOrganizationalLearningRuntime(user, payload, ctx, store);

  const governance_learning = {
    phase: 'Z.29',
    learning_active: true,
    patterns_detected: report.patterns.patterns_detected || [],
    fatigue_patterns: report.fatigue.fatigue_patterns || [],
    usefulness_trends: report.usefulness.usefulness_trends || [],
    convergence_trends: report.convergence.convergence_trends || [],
    recommendations_generated: report.recommendations.recommendations_generated || [],
    auto_mutation_applied: false,
    runtime_safe: report.performance.runtime_safe !== false && report.safety.safe !== false,
    supervised: true,
    snapshot_count: (store.snapshots || []).length
  };

  return { governance_learning, report, store };
}

module.exports = { runEnterpriseGovernanceLearning, runOrganizationalLearningRuntime };
