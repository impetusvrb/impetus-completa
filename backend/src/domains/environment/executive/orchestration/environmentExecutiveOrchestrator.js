'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../flags/environmentExecutiveRuntimeFlags');
const obs = require('../shared/environmentExecutiveObservability');
const { publishEnvironmentIndustrialEvent } = require('../../events/environmentEventPublisher');
const EXEC = require('../events/executiveEventHints');
const esg = require('../esg/environmentExecutiveEsgRuntime');
const sustainability = require('../sustainability/environmentSustainabilityExecutiveRuntime');
const carbon = require('../carbon/environmentCarbonExecutiveRuntime');
const heatmaps = require('../heatmaps/environmentHeatmapRuntime');
const risk = require('../risk/environmentExecutiveRiskMapRuntime');
const intelligence = require('../intelligence/environmentExecutiveIntelligenceCenterRuntime');
const { environmentExecutiveMaturityRuntime } = require('../runtime/environmentExecutiveMaturityRuntime');

const _hits = new Map();

function _throttleOk(tenantId, max = 30) {
  const k = String(tenantId || 'global');
  const now = Date.now();
  let h = _hits.get(k);
  if (!h || now > h.resetAt) {
    h = { count: 0, resetAt: now + 60000 };
    _hits.set(k, h);
  }
  h.count++;
  return h.count <= max;
}

async function _maybePublish(partial, meta) {
  if (!flags.isEnvironmentExecutivePublishEnabled()) return { published: false };
  try {
    await publishEnvironmentIndustrialEvent(partial, meta);
    return { published: true };
  } catch {
    return { published: false };
  }
}

async function runExecutiveEnvironmentPack(companyId, userId, input = {}, opts = {}) {
  const tAll = Date.now();
  const correlationId = opts.correlation_id || input.correlation_id || uuidv4();
  const result = {
    ok: true,
    correlation_id: correlationId,
    company_id: companyId,
    skipped: false,
    shadow: true,
    assistive_only: true,
    no_authority: true,
    events: []
  };

  if (!flags.isEnvironmentExecutiveRuntimeEnabled()) {
    result.skipped = true;
    result.reason = 'executive_off';
    return result;
  }

  if (!_throttleOk(companyId)) {
    result.skipped = true;
    result.throttle = { reason: 'rate_limited' };
    return result;
  }

  const body = input.body || input;

  result.esg = esg.environmentExecutiveEsgRuntime(body);
  result.sustainability = sustainability.environmentSustainabilityExecutiveRuntime(body);
  result.carbon = carbon.environmentCarbonExecutiveRuntime(body);
  result.heatmaps = heatmaps.environmentHeatmapRuntime(body.heatmaps || body);
  result.risk = risk.environmentExecutiveRiskMapRuntime(body.risk || body);

  if (opts.cognitive_pack) {
    result.cognitive = opts.cognitive_pack;
  }

  result.intelligence = intelligence.environmentExecutiveIntelligenceCenterRuntime(result, body);
  result.maturity = environmentExecutiveMaturityRuntime(result);

  if (opts.emit_events !== false) {
    if (result.esg?.ok) {
      const pub = await _maybePublish(
        {
          event_name: EXEC.ESG_INSIGHT_GENERATED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { esg_score: result.esg.analytics?.overview?.esg_score }
        },
        { origin_layer: 'executive', intended_audience: 'director', user_id: userId }
      );
      result.events.push({ type: EXEC.ESG_INSIGHT_GENERATED, ...pub });
    }
    if (result.sustainability?.ok) {
      const pub = await _maybePublish(
        {
          event_name: EXEC.SUSTAINABILITY_INSIGHT_GENERATED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { score: result.sustainability.analytics?.sustainability_score }
        },
        { origin_layer: 'executive', intended_audience: 'manager', user_id: userId }
      );
      result.events.push({ type: EXEC.SUSTAINABILITY_INSIGHT_GENERATED, ...pub });
    }
    if (result.carbon?.hotspot_detected) {
      const pub = await _maybePublish(
        {
          event_name: EXEC.CARBON_HOTSPOT_DETECTED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { hotspots: result.carbon.heatmap?.hotspots }
        },
        { origin_layer: 'executive', intended_audience: 'manager', user_id: userId }
      );
      result.events.push({ type: EXEC.CARBON_HOTSPOT_DETECTED, ...pub });
    }
    if (result.risk?.escalate) {
      const pub = await _maybePublish(
        {
          event_name: EXEC.ENVIRONMENTAL_RISK_ESCALATED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { severity: result.risk.scoring?.severity }
        },
        { origin_layer: 'executive', intended_audience: 'director', user_id: userId }
      );
      result.events.push({ type: EXEC.ENVIRONMENTAL_RISK_ESCALATED, ...pub });
    }
    const prevMaturity = body.previous_maturity_score;
    const cur = result.maturity?.executive_maturity_score;
    if (prevMaturity != null && cur != null && Math.abs(cur - prevMaturity) > 0.08) {
      const pub = await _maybePublish(
        {
          event_name: EXEC.MATURITY_SHIFT_DETECTED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { from: prevMaturity, to: cur }
        },
        { origin_layer: 'executive', intended_audience: 'director', user_id: userId }
      );
      result.events.push({ type: EXEC.MATURITY_SHIFT_DETECTED, ...pub });
    }
    if (result.intelligence?.narratives?.narratives?.length) {
      const pub = await _maybePublish(
        {
          event_name: EXEC.ENVIRONMENTAL_NARRATIVE_GENERATED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { count: result.intelligence.narratives.narratives.length }
        },
        { origin_layer: 'executive', intended_audience: 'director', user_id: userId }
      );
      result.events.push({ type: EXEC.ENVIRONMENTAL_NARRATIVE_GENERATED, ...pub });
    }
    if (result.intelligence?.cross_domain?.insights?.length) {
      const pub = await _maybePublish(
        {
          event_name: EXEC.CROSS_DOMAIN_INSIGHT_GENERATED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { count: result.intelligence.cross_domain.insights.length }
        },
        { origin_layer: 'executive', intended_audience: 'manager', user_id: userId }
      );
      result.events.push({ type: EXEC.CROSS_DOMAIN_INSIGHT_GENERATED, ...pub });
    }
  }

  obs.record('environment_executive_runtime_ms', Date.now() - tAll, {});
  return result;
}

module.exports = { runExecutiveEnvironmentPack };
