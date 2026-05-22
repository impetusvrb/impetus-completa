'use strict';

const { loadQualityTenantSignals } = require('../../bridge/qualityTenantSignalLoader');
const { invokeBlockBridge, buildEngineContext } = require('../../bridge/qualityBlockBridgeInvoker');
const { buildQualitySpecializedKpis, mergeKpisWithLegacy } = require('../quality/qualityKpiAdapter');
const { buildQualitySpecializedSummary, enrichSummaryPayload } = require('../quality/qualitySummaryAdapter');
const { buildQualitySpecializedInsights } = require('../quality/qualityInsightAdapter');
const { buildSpecializedCockpitHints, enrichProfileConfigCards } = require('../quality/qualityCockpitAdapter');
const { buildQualityContextualQuestions } = require('../quality/qualityContextualQuestionsAdapter');
const { buildQualityOperationalMetrics } = require('../quality/qualityOperationalMetricsAdapter');
const { resolveEnrichmentChannels } = require('./adaptiveCockpitResolver');

async function buildQualityDeliveryBundle(user = {}, payload = {}, ctx = {}, qualityPilot = {}) {
  const shadow = qualityPilot.shadow_cognitive_cockpit || {};
  const blockIds = (shadow.blocks || []).map((b) => b.block_id);

  let signalBundle;
  if (ctx.mock_signals) {
    signalBundle = ctx.mock_signals;
  } else {
    signalBundle = await loadQualityTenantSignals(user, {
      tenant_id: user?.company_id,
      user_id: user?.id,
      hierarchy_scope: ctx.hierarchy_scope,
      mock_signals: ctx.mock_signals
    });
  }

  const bridgeCtx = {
    tenant_id: user?.company_id,
    user_id: user?.id,
    correlation_id: ctx.correlation_id
  };
  const bindings = [];
  for (const blockId of blockIds) {
    const fromShadow = (shadow.blocks || []).find((b) => b.block_id === blockId);
    if (fromShadow?.shadow_signals?.bridge_status === 'bound_z20') {
      bindings.push({ ...fromShadow.shadow_signals, block_id: blockId });
    } else {
      bindings.push(invokeBlockBridge(blockId, signalBundle, bridgeCtx));
    }
  }

  const engineContext = buildEngineContext(signalBundle, bindings);
  bridgeCtx._engine_context = engineContext;

  for (const blockId of ['quality.contextual_quality_ai', 'quality.quality_narrative']) {
    const idx = bindings.findIndex((b) => b.block_id === blockId);
    if (idx >= 0) {
      bindings[idx] = invokeBlockBridge(blockId, signalBundle, bridgeCtx);
    }
  }

  return {
    signalBundle,
    bindings,
    engineContext,
    shadow
  };
}

async function buildSpecializedDeliveryArtifacts(user, payload, ctx, qualityPilot) {
  const channels = resolveEnrichmentChannels(ctx);
  const bundle = await buildQualityDeliveryBundle(user, payload, ctx, qualityPilot);

  const artifacts = {
    kpis: null,
    summary: null,
    insights: null,
    cockpit: null,
    contextual_questions: null,
    operational_metrics: null
  };

  if (channels.channels.kpis) {
    const specialized = buildQualitySpecializedKpis(bundle.bindings, bundle.signalBundle, {
      max_kpis: channels.max_specialized_kpis
    });
    artifacts.kpis = mergeKpisWithLegacy(payload.kpis || [], specialized, {
      max_total: 10,
      demote_generic: true
    });
  }

  if (channels.channels.summary) {
    artifacts.summary = buildQualitySpecializedSummary(bundle.bindings, bundle.engineContext);
  }

  if (channels.channels.insights) {
    artifacts.insights = buildQualitySpecializedInsights(bundle.bindings, bundle.engineContext);
  }

  if (channels.channels.cockpit_hints) {
    const hints = buildSpecializedCockpitHints(bundle.shadow);
    artifacts.cockpit = enrichProfileConfigCards(payload, hints);
  }

  if (channels.channels.contextual_questions) {
    artifacts.contextual_questions = buildQualityContextualQuestions(
      bundle.bindings,
      bundle.engineContext
    );
  }

  if (channels.channels.operational_metrics) {
    artifacts.operational_metrics = buildQualityOperationalMetrics(
      bundle.bindings,
      bundle.signalBundle
    );
  }

  return { artifacts, bundle, channels };
}

module.exports = {
  buildQualityDeliveryBundle,
  buildSpecializedDeliveryArtifacts
};
