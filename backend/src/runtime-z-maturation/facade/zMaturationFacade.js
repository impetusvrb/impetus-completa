'use strict';

/**
 * SZ3 — Runtime Z Cognitive Maturation Layer
 *
 * Facade canónica. Recebe o output do SZ2 (runtime_z_cognitive_os) e
 * devolve um bloco `runtime_z_maturation` enriquecido com:
 *   - padrões observados / identificados
 *   - scores calibrados (ruído reduzido)
 *   - narrativa operacional madura
 *   - ergonomia de resposta adaptada ao perfil
 *   - cenário industrial identificado
 *   - priorização amadurecida
 *
 * Additive-only. Se SZ2 não correu, degrada graciosamente.
 */

const flags = require('../config/sz3FeatureFlags');
const obs_sz3 = require('../observability/zMaturationObservability');
const { matchPatterns } = require('../patterns/zPatternMatchRuntime');
const { observe: observePattern } = require('../patterns/zPatternObservationRuntime');
const { calibrateScores } = require('../calibration/zInferenceCalibrationRuntime');
const { buildMatureNarrative } = require('../language/zLanguageMaturationRuntime');
const { computeErgonomics } = require('../ergonomics/zCognitiveErgonomicsRuntime');
const { shapeResponse } = require('../ergonomics/zResponseShapingRuntime');
const { matchScenario } = require('../industrial/zIndustrialScenarioMatcher');
const { maturePriority } = require('../prioritization/zPrioritizationMaturationRuntime');

function resolveStage(tenantId) {
  const promoted = flags.promotedTenants();
  if (tenantId && promoted.includes(String(tenantId))) {
    return { stage: flags.promotedStage(), tenant_promoted: true };
  }
  return { stage: flags.defaultStage(), tenant_promoted: false };
}

/**
 * @param {object} user           — req.user
 * @param {object} sz2Output      — legacyResponse.runtime_z_cognitive_os
 * @param {object} ctx            — { tenant_id, profile, message }
 */
function applyMaturation(user = {}, sz2Output = {}, ctx = {}) {
  if (!flags.isEnabled()) return { skipped: true, reason: 'sz3_disabled' };

  const tenantId = ctx?.tenant_id || user?.company_id || null;
  const message = String(ctx?.message || '').trim();
  const profileCode = ctx?.profile || user?.role_code || user?.role || 'default';
  const stageInfo = resolveStage(tenantId);

  try {
    const sz2Cog = sz2Output || {};
    const domains = sz2Cog?.reasoning?.detected_risks || [];
    const anchors = sz2Cog?.continuity?.inherited_context?.anchors || [];

    // 1 — observar padrão desta interacção
    observePattern(tenantId, {
      type: sz2Cog?.intent?.primary || 'generic',
      domains,
      anchors,
      intent: sz2Cog?.intent?.primary
    });

    // 2 — match padrões
    const patternMatch = matchPatterns(tenantId, message, domains);

    // 3 — calibração de scores
    const calibration = calibrateScores(tenantId, sz2Cog, patternMatch);

    // 4 — cenário industrial
    const scenario = matchScenario(message, sz2Cog);

    // 5 — priorização madura
    const maturePrio = maturePriority({
      sz2Reasoning: sz2Cog?.reasoning,
      patternMatch,
      calibration,
      profileCode,
      operational: sz2Cog?.context?.operational
    });

    // 6 — linguagem madura
    const matureNarrative = buildMatureNarrative({
      calibration,
      patternMatch,
      sz2CogOutput: sz2Cog
    });

    // 7 — ergonomia
    const ergonomics = computeErgonomics({
      profileCode,
      criticality: sz2Cog?.reasoning?.criticality,
      urgency: sz2Cog?.context?.urgency,
      operational: sz2Cog?.context?.operational,
      temporal: sz2Cog?.context?.temporal,
      calibration
    });

    // 8 — shaping da resposta
    const shaped = shapeResponse({
      ergonomics,
      narrative: matureNarrative,
      actions: sz2Cog?.actions,
      calibration,
      patternMatch
    });

    // observabilidade
    obs_sz3.record({
      language_mature: matureNarrative.mature,
      calibration_applied: calibration.calibrated,
      pattern_matched: !!patternMatch.top,
      scenario_matched: scenario.matched,
      priority_uplifted: maturePrio.tier_changed,
      noise_suppressed: calibration.suppress_enrichment,
      language_quality: matureNarrative.language_quality,
      overall_quality: calibration.overall_quality
    });

    if (patternMatch.top) obs_sz3.emit({ type: 'PATTERN_MATCHED', pattern_id: patternMatch.top.id, tenant: tenantId });
    if (scenario.matched) obs_sz3.emit({ type: 'SCENARIO_IDENTIFIED', scenario: scenario.scenario, tenant: tenantId });
    if (maturePrio.tier_changed) obs_sz3.emit({ type: 'PRIORITY_UPLIFTED', from: maturePrio.base_tier, to: maturePrio.tier, tenant: tenantId });
    if (calibration.suppress_enrichment) obs_sz3.emit({ type: 'NOISE_SUPPRESSED', noise_level: calibration.noise_level, tenant: tenantId });

    return {
      ok: true,
      payload: {
        runtime_z_maturation: {
          stage: stageInfo.stage,
          tenant_promoted: stageInfo.tenant_promoted,
          assistive_only: true,
          auto_execution: false,
          human_authority_preserved: true,

          pattern_match: patternMatch,
          calibration,
          scenario,
          mature_priority: maturePrio,
          mature_narrative: matureNarrative,
          ergonomics,
          shaped_response: shaped,

          maturation_quality: Number(
            Math.min(
              1,
              (matureNarrative.language_quality || 0) * 0.4 +
                (calibration.overall_quality || 0) * 0.4 +
                (patternMatch.confidence || 0) * 0.2
            ).toFixed(3)
          ),
          noise_level: calibration.noise_level,
          pattern_id: patternMatch?.top?.id || null
        }
      },
      stageInfo
    };
  } catch (err) {
    obs_sz3.record({ error: true });
    obs_sz3.emit({ type: 'SZ3_ERROR', message: err?.message });
    return {
      ok: false,
      payload: {
        runtime_z_maturation: {
          stage: stageInfo.stage,
          error: true,
          error_message: err?.message || 'sz3_unknown_error',
          assistive_only: true,
          auto_execution: false,
          human_authority_preserved: true
        }
      },
      stageInfo
    };
  }
}

module.exports = { applyMaturation, resolveStage, observability: obs_sz3 };
