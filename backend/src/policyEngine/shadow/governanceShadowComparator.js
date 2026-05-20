'use strict';

const phaseF = require('../config/phaseFFeatureFlags');
const { logPhaseF } = require('../observability/phaseFLogger');
const telemetry = require('../observability/governanceTelemetry');
const { evaluateShadowReview } = require('../observability/governanceShadowReview');

let traceBridge = null;
function getTraceBridge() {
  if (!traceBridge) {
    try {
      traceBridge = require('../../explainability/governanceTraceBridge');
    } catch {
      traceBridge = null;
    }
  }
  return traceBridge;
}

function _stableKeys(arr, keyFn) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => keyFn(x)).sort();
}

/**
 * Compara exposição legacy vs governada sem alterar resposta ao cliente.
 * @returns {{ diverged: boolean, diff: object }}
 */
function compareExposureShadow(channel, legacyPayload, governedPayload, userId) {
  if (!phaseF.isGovernanceShadowModeEnabled()) {
    return { diverged: false, diff: null, shadow_only: true };
  }

  const legacyMods = _stableKeys(legacyPayload?.visible_modules || legacyPayload?.modules, (m) => String(m));
  const govMods = _stableKeys(governedPayload?.visible_modules || governedPayload?.modules, (m) => String(m));

  const legacyKpiCount = Array.isArray(legacyPayload?.kpis) ? legacyPayload.kpis.length : legacyPayload?.kpi_count;
  const govKpiCount = Array.isArray(governedPayload?.kpis) ? governedPayload.kpis.length : governedPayload?.kpi_count;

  const legacyAi = legacyPayload?.allow_ai_insights ?? legacyPayload?.sections?.ai_insights;
  const govAi = governedPayload?.allow_ai_insights ?? governedPayload?.sections?.ai_insights;

  const diverged =
    JSON.stringify(legacyMods) !== JSON.stringify(govMods) ||
    (typeof legacyKpiCount === 'number' &&
      typeof govKpiCount === 'number' &&
      legacyKpiCount !== govKpiCount) ||
    (legacyAi !== undefined && govAi !== undefined && legacyAi !== govAi);

  const diff = {
    module_count_legacy: legacyMods.length,
    module_count_governed: govMods.length,
    kpi_count_legacy: legacyKpiCount,
    kpi_count_governed: govKpiCount,
    ai_insights_legacy: legacyAi,
    ai_insights_governed: govAi
  };

  const shadowReview = evaluateShadowReview({
    legacy_module_count: legacyMods.length,
    governed_module_count: govMods.length,
    legacy_kpi_count: typeof legacyKpiCount === 'number' ? legacyKpiCount : undefined,
    governed_kpi_count: typeof govKpiCount === 'number' ? govKpiCount : undefined,
    legacy_ai: legacyAi,
    governed_ai: govAi
  });

  if (diverged) {
    logPhaseF('COGNITIVE_EXPOSURE_DIVERGENCE', { channel, user_id: userId, diff, shadow_review: shadowReview });
    telemetry.recordShadowDivergence(channel, diff);
    try {
      const collector = require('../../governanceBootstrap/governanceShadowRuntimeCollector');
      collector.recordDivergence(channel, diff, { user_id: userId, shadow_review: shadowReview });
    } catch {
      /* optional bootstrap collector */
    }
  }

  const bridge = getTraceBridge();
  if (bridge) {
    bridge.recordGovernanceDecision({
      type: 'shadow_comparison',
      channel,
      user_id: userId,
      decision: diverged ? 'deny' : 'allow',
      policy_layer: diverged ? 'domain_authority' : 'ux',
      reason: diverged ? 'shadow_divergence' : 'shadow_aligned',
      shadow_diverged: diverged,
      legacy: legacyPayload,
      governed: governedPayload,
      meta: { diff, shadow_review: shadowReview }
    });
  }

  return { diverged, diff, shadow_only: true, shadow_review: shadowReview };
}

module.exports = { compareExposureShadow };
