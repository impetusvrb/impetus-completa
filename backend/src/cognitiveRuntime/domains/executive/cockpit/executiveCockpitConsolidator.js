'use strict';

const { runExecutiveAggregationRuntime } = require('../aggregation/executiveAggregationRuntime');
const { aggregateStrategicDomains } = require('../aggregation/strategicDomainAggregator');
const { resolveStrategicOee } = require('../strategic/strategicOeeRuntime');
const { computeEnterpriseHealth } = require('../strategic/enterpriseHealthEngine');
const { computeCrossDomainMaturity } = require('../strategic/crossDomainMaturityRuntime');
const { computeOrganizationalReliability } = require('../strategic/organizationalReliabilityRuntime');
const { buildExecutiveStrategicAi } = require('../ai/executiveStrategicAi');
const { generateExecutiveInsights } = require('../ai/executiveInsightGenerator');
const { runExecutiveNarrativeRuntime } = require('../narrative/executiveNarrativeRuntime');
const { buildBoardroomCenters } = require('../boardroom/executiveCenters');
const { applyExecutiveDensityGovernor } = require('../density/executiveDensityGovernor');
const { protectBoardroomAttention } = require('../density/boardroomAttentionProtection');
const { resolveExecutivePriority } = require('../density/executivePriorityResolver');
const { reduceStrategicNoise } = require('../density/strategicNoiseReducer');
const { runStrategicIsolationRuntime } = require('../governance/strategicIsolationRuntime');
const { validateExecutiveGovernance } = require('../governance/executiveGovernanceValidator');
const { validateEnterpriseConvergence } = require('../convergence/enterpriseConvergenceValidator');
const { computeExecutiveCognitiveHealth } = require('../observability/executiveCognitiveHealth');
const { resolvePromotedExecutiveWidgetsFromShadow } = require('../../../renderPromotion/executive/executiveWidgetPromotionResolver');
const { buildExecutiveSuppressionPlan } = require('../../../renderPromotion/executive/executiveWidgetSuppression');
const flags = require('../../../config/phaseZ27FeatureFlags');

async function consolidateExecutiveBoardroom(user = {}, payload = {}, ctx = {}, execPilot = {}) {
  const aggregation = runExecutiveAggregationRuntime(payload, ctx);
  const strategic = aggregateStrategicDomains(aggregation.enterprise);
  const oee = resolveStrategicOee(aggregation.enterprise);
  const health = computeEnterpriseHealth(aggregation.enterprise);
  const maturity = computeCrossDomainMaturity(aggregation.enterprise);
  const reliability = computeOrganizationalReliability(strategic);
  const narrative = runExecutiveNarrativeRuntime(aggregation.enterprise, strategic, reliability);
  const ai = buildExecutiveStrategicAi(strategic, health);
  const insights = generateExecutiveInsights(strategic, health);

  let centersRaw = buildBoardroomCenters(aggregation, strategic, health, narrative, ai);
  centersRaw = resolveExecutivePriority(reduceStrategicNoise(centersRaw).filtered);

  const shadow = execPilot.shadow_cognitive_cockpit || {};
  let widgets =
    payload.widgets_promoted?.length > 0
      ? payload.widgets_promoted
      : resolvePromotedExecutiveWidgetsFromShadow(shadow, { max_widgets: flags.maxWidgets() });

  const densityOut = applyExecutiveDensityGovernor(centersRaw, widgets.filter((w) => !w.collapsed_generic));
  const attention = protectBoardroomAttention(densityOut.centers);
  const isolation = runStrategicIsolationRuntime(payload, { centers: densityOut.centers });
  const governance = validateExecutiveGovernance(payload, { centers: densityOut.centers });
  const convergence = validateEnterpriseConvergence(strategic);
  const usefulness = Math.round((health.reliable ? 0.85 : 0.6) * 100) / 100;

  const { executive_cognitive_health } = computeExecutiveCognitiveHealth({
    usefulness,
    convergence: strategic.convergence,
    isolation_ok: isolation.strategic_isolation_ok,
    aggregation_ready: aggregation.enterprise.aggregation_readiness !== 'empty'
  });

  return {
    phase: 'Z.27',
    cockpit_mode: 'executive_boardroom',
    consolidation_applied: true,
    global_replace: false,
    centers: densityOut.centers,
    widgets: densityOut.widgets,
    density: { ...densityOut.density, ...attention },
    aggregation,
    strategic: { ...strategic, oee, maturity, reliability, insights },
    executive_contextual_ai: ai,
    executive_narrative: narrative,
    executive_cognitive_health,
    semantic_validation: isolation,
    governance_validation: governance,
    convergence_validation: convergence,
    specialized_summary: narrative.paragraphs?.join(' ') || null,
    aggregation_readiness: aggregation.enterprise.aggregation_readiness
  };
}

module.exports = { consolidateExecutiveBoardroom };
