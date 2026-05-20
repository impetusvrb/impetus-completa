'use strict';

/**
 * secureChatContextBuilder — pipeline chat governado (Fase F).
 * request → resolveContentExposure → envelope → sanitizer → boundary → IA
 */

const phaseF = require('../config/phaseFFeatureFlags');
const cognitiveFlags = require('../config/cognitiveFeatureFlags');
const { resolveContentExposure } = require('../unifiedExposureResolver');
const { resolveCognitiveEnvelope } = require('../cognitiveEnvelopeResolver');
const { logPhaseF } = require('../observability/phaseFLogger');
const telemetry = require('../observability/governanceTelemetry');
const { compareExposureShadow } = require('../shadow/governanceShadowComparator');
const { resolveGovernedKpis } = require('./secureKpiExposureResolver');
const cognitiveBoundaryGuard = require('../../security/cognitiveBoundaryGuard');
const contextExposureSanitizer = require('../../security/contextExposureSanitizer');
const secureContextBuilder = require('../../services/secureContextBuilder');

/**
 * @param {object} user
 * @param {object} opts — { message, contextualPack?, history? }
 */
async function buildSecureChatContext(user, opts = {}) {
  const exposure = await resolveContentExposure(user, {});
  telemetry.recordExposureEvaluation();

  const envelope =
    exposure.cognitive_envelope ||
    resolveCognitiveEnvelope(user, {
      dashboardConfig: { functional_axis: exposure.functional_axis },
      force: cognitiveFlags.isCognitiveEnvelopeEnabled() || phaseF.isChatGovernanceEnabled()
    });

  const fullExposure = { ...exposure, cognitive_envelope: envelope };

  if (phaseF.isGovernanceShadowModeEnabled()) {
    compareExposureShadow(
      'dashboard_chat',
      {
        visible_modules: exposure.visible_modules,
        allow_ai_insights: exposure.sections?.ai_insights,
        kpi_count: opts.contextualPack?.kpis?.length
      },
      {
        visible_modules: fullExposure.visible_modules,
        allow_ai_insights: fullExposure.allow_ai_insights ?? fullExposure.sections?.ai_insights,
        kpi_count: null
      },
      user?.id
    );
  }

  if (!phaseF.isChatGovernanceEnabled(user)) {
    return {
      governed: false,
      exposure: fullExposure,
      contextualPack: opts.contextualPack || null,
      secureContext: null,
      use_legacy_path: true
    };
  }

  const boundary = cognitiveBoundaryGuard.assertChannelBoundary('dashboard_chat', user, fullExposure);
  if (!boundary.allowed) {
    logPhaseF('CHAT_SCOPE_DENIED', { user_id: user?.id, reason: boundary.reason });
    telemetry.recordDenial('chat_scope');
    return {
      governed: true,
      exposure: fullExposure,
      contextualPack: cognitiveBoundaryGuard.boundarySanitizePack(null, user, fullExposure, 'dashboard_chat'),
      secureContext: null,
      scope_denied: true,
      denial_reason: boundary.reason
    };
  }

  let pack = opts.contextualPack;
  if (pack) {
    pack = cognitiveBoundaryGuard.boundarySanitizePack(pack, user, fullExposure, 'dashboard_chat');
    if (Array.isArray(pack.kpis)) {
      const kpiGov = resolveGovernedKpis(user, pack.kpis, fullExposure);
      pack.kpis = kpiGov.kpis;
      if (kpiGov.denied_keys?.length) {
        for (const d of kpiGov.denied_keys) {
          logPhaseF('CHAT_KPI_DENIED', { kpi_key: d.key, reason: d.reason, user_id: user?.id });
        }
      }
    }
    if (cognitiveFlags.isContextSanitizerEnabled() || phaseF.isChatGovernanceEnabled(user)) {
      pack = contextExposureSanitizer.sanitizeContextForAI(pack, user, envelope);
      logPhaseF('CHAT_CONTEXT_SANITIZED', { user_id: user?.id });
      telemetry.recordSanitization('chat');
    }
  }

  let secureContext = null;
  try {
    const built = await secureContextBuilder.buildContext(user, {
      companyId: user.company_id,
      queryText: opts.message || '',
      context_pack: pack,
      metrics: pack?.metrics,
      channel: 'dashboard_chat_governed'
    });
    secureContext = built;
  } catch (err) {
    console.warn('[secureChatContextBuilder]', err?.message ?? err);
  }

  logPhaseF('CHAT_POLICY_APPLIED', {
    user_id: user?.id,
    has_pack: !!pack,
    envelope_depth: envelope?.depth
  });

  try {
    const bridge = require('../../explainability/governanceTraceBridge');
    bridge.recordGovernanceDecision({
      user_id: user?.id,
      tenant_id: user?.company_id,
      domain: fullExposure.functional_axis,
      hierarchy_level: user?.hierarchy_level,
      decision: boundary.allowed ? 'allow' : 'deny',
      policy_layer: boundary.allowed ? 'rbac' : 'deny',
      reason: boundary.reason || 'chat_policy_applied',
      affected_channel: 'dashboard_chat',
      envelope,
      exposure: fullExposure,
      sanitized: !!pack && !opts.contextualPack?.mqtt
    });
  } catch {
    /* optional */
  }

  return {
    governed: true,
    exposure: fullExposure,
    contextualPack: pack,
    secureContext,
    use_legacy_path: false
  };
}

module.exports = { buildSecureChatContext };
