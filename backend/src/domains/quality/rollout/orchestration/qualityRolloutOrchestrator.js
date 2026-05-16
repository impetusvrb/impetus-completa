'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../flags/qualityRolloutRuntimeFlags');
const obs = require('../../../../services/operational/enterpriseObservabilityRuntime');
const budgetSvc = require('../../../../cognitiveBudget/aiContextBudgetService');
const { publishQualityIndustrialEvent } = require('../../events/qualityEventPublisher');
const EVT = require('../events/rolloutEventHints');

const { evaluateGovernanceRolloutControl } = require('../governance/qualityGovernanceRolloutControl');
const { scoreOperationalMaturity } = require('../maturity/qualityOperationalMaturityScoring');
const { analyzeAdoption } = require('../adoption/qualityAdoptionAnalyticsEngine');
const { assessIndustrialReadiness } = require('../readiness/qualityIndustrialReadinessEngine');
const { protectUserSaturation } = require('../saturation/qualityUserSaturationProtection');
const { evaluateTenantRollout } = require('../tenant/qualityTenantRolloutEngine');
const { evaluatePlantRollout } = require('../plant/qualityPlantRolloutEngine');
const { evaluateWorkflowRollout } = require('../workflow/qualityWorkflowRolloutEngine');
const { computeRolloutConfidence } = require('../scoring/qualityRolloutConfidenceScore');
const mem = require('../runtime/qualityRolloutMemoryStore');

const _hits = new Map();

function throttleOk(tenantId, max = 40) {
  const k = String(tenantId || '');
  const now = Date.now();
  const w = 60000;
  let h = _hits.get(k);
  if (!h || now > h.resetAt) {
    h = { c: 0, resetAt: now + w };
    _hits.set(k, h);
  }
  h.c++;
  return h.c <= max;
}

async function _publish(partial, meta) {
  if (!flags.isRolloutIndustrialPublishEnabled()) return { published: false };
  try {
    await publishQualityIndustrialEvent(partial, meta);
    return { published: true };
  } catch (_e) {
    return { published: false };
  }
}

async function runRolloutAssessmentPack(companyId, userId, snapshot = {}, opts = {}) {
  const t0 = Date.now();
  const correlationId = String(opts.correlation_id || snapshot.correlation_id || uuidv4());
  const out = {
    ok: true,
    correlation_id: correlationId,
    company_id: companyId,
    skipped: false,
    governance: null,
    maturity: null,
    adoption: null,
    readiness: null,
    saturation: null,
    tenant: null,
    plant: null,
    workflow: null,
    confidence: null,
    events: [],
    budget: null
  };

  if (!flags.isQualityRolloutRuntimeEnabled()) {
    out.skipped = true;
    out.reason = 'rollout_off';
    return out;
  }

  if (!throttleOk(companyId)) {
    out.skipped = true;
    out.reason = 'throttled';
    return out;
  }

  try {
    const b = await budgetSvc.resolveBudget({
      company_id: companyId,
      domain: 'quality',
      module: 'quality_rollout',
      user_id: userId,
      persona: opts.persona
    });
    out.budget = { enabled: b.enabled, budget_tokens: b.budget_tokens ?? null };
  } catch (_e) {
    out.budget = { enabled: false };
  }

  const snap = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const desiredCognitive = !!(snap.workflows && snap.workflows.cognitive && snap.workflows.cognitive.enabled);
  const desiredTelemetry = !!(snap.workflows && snap.workflows.telemetry && snap.workflows.telemetry.enabled);

  const tGov = Date.now();
  out.governance = evaluateGovernanceRolloutControl({
    desired_cognitive: desiredCognitive,
    desired_telemetry: desiredTelemetry,
    desired_governance_features: !!(snap.require_governance_v7)
  });
  obs.recordMetric('quality_governance_rollout_ms', Date.now() - tGov, {});

  const combinedBlockers = [...(out.governance.blockers || [])];

  if (flags.isMaturityScoringEnabled()) {
    const t1 = Date.now();
    out.maturity = scoreOperationalMaturity(snap.maturity_metrics || {});
    obs.recordMetric('quality_maturity_scoring_ms', Date.now() - t1, {});
    if (out.maturity.emit_event && opts.emit_events !== false) {
      const pub = await _publish(
        {
          event_name: EVT.MATURITY_CHANGED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: { level: out.maturity.maturity_level, score: out.maturity.maturity_score }
        },
        { origin_layer: 'operational', intended_audience: 'management', user_id: userId }
      );
      out.events.push({ type: EVT.MATURITY_CHANGED, ...pub });
    }
    if (out.maturity.maturity_level === 'COGNITIVE_READY' && opts.emit_events !== false) {
      const pub = await _publish(
        {
          event_name: EVT.COGNITIVE_READY,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: { maturity_score: out.maturity.maturity_score }
        },
        { origin_layer: 'operational', intended_audience: 'executive', user_id: userId }
      );
      out.events.push({ type: EVT.COGNITIVE_READY, ...pub });
    }
  }

  if (flags.isAdoptionAnalyticsEnabled()) {
    const t2 = Date.now();
    out.adoption = analyzeAdoption(snap.adoption || {});
    obs.recordMetric('quality_adoption_analytics_ms', Date.now() - t2, {});
  }

  let readinessInputs = {
    workflow_completion_rate: snap.maturity_metrics?.workflow_completion_rate,
    trained_operators_ratio: snap.adoption?.trained_operators_ratio,
    maturity_score: out.maturity?.maturity_score,
    require_telemetry: desiredTelemetry,
    require_governance: desiredCognitive
  };

  if (flags.isReadinessEngineEnabled()) {
    const t3 = Date.now();
    out.readiness = assessIndustrialReadiness(readinessInputs);
    obs.recordMetric('quality_readiness_runtime_ms', Date.now() - t3, {});
    if (out.readiness.readiness_blockers.length && opts.emit_events !== false) {
      const pub = await _publish(
        {
          event_name: EVT.READINESS_BLOCKED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: { blockers: out.readiness.readiness_blockers, score: out.readiness.readiness_score }
        },
        { origin_layer: 'operational', intended_audience: 'supervisor', user_id: userId }
      );
      out.events.push({ type: EVT.READINESS_BLOCKED, ...pub });
    }
    combinedBlockers.push(...out.readiness.readiness_blockers);
  }

  let saturation = null;
  if (flags.isSaturationProtectionRolloutEnabled()) {
    const t4 = Date.now();
    saturation = protectUserSaturation(snap.saturation || {}, opts.saturation || {});
    out.saturation = saturation;
    obs.recordMetric('quality_saturation_runtime_ms', Date.now() - t4, {});
    if (saturation.saturated && opts.emit_events !== false) {
      const pub = await _publish(
        {
          event_name: EVT.SATURATION_DETECTED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: { saturation_score: saturation.saturation_score, suppression: saturation.suppression }
        },
        { origin_layer: 'operational', intended_audience: 'supervisor', user_id: userId }
      );
      out.events.push({ type: EVT.SATURATION_DETECTED, ...pub });
    }
    if (saturation.suppression?.suppress_recommendation_stream && opts.emit_events !== false) {
      const pub2 = await _publish(
        {
          event_name: EVT.RECOMMENDATION_SUPPRESSED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: { reason: 'saturation_digest', cooldown: saturation.suppression.cognitive_cooldown_minutes }
        },
        { origin_layer: 'operational', intended_audience: 'operator', user_id: userId }
      );
      out.events.push({ type: EVT.RECOMMENDATION_SUPPRESSED, ...pub2 });
    }
  }

  const blockerDedup = [...new Set(combinedBlockers)];

  if (flags.isTenantRolloutEnabled()) {
    const memState = mem.getTenantRolloutState(companyId) || {};
    const tenantCtx = {
      current_stage: snap.tenant?.current_stage || memState.tenant_stage || 'shadow',
      target_stage: snap.tenant?.target_stage || 'staged',
      mode: snap.tenant?.mode || 'staged',
      blockers: blockerDedup,
      adoption_hints: out.adoption ? [`participation=${out.adoption.operational_participation_index?.toFixed(2)}`] : []
    };
    out.tenant = evaluateTenantRollout(tenantCtx);
    if (out.tenant.emit_event && opts.emit_events !== false) {
      const pub = await _publish(
        {
          event_name: EVT.TENANT_STAGE_CHANGED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: { from: tenantCtx.current_stage, to: tenantCtx.target_stage, allowed: out.tenant.transition_allowed }
        },
        { origin_layer: 'operational', intended_audience: 'management', user_id: userId }
      );
      out.events.push({ type: EVT.TENANT_STAGE_CHANGED, ...pub });
    }
    if (opts.persist_state && out.tenant.transition_allowed) {
      mem.mergeTenantRolloutState(companyId, { tenant_stage: tenantCtx.target_stage, last_mode: tenantCtx.mode });
    }
  }

  if (flags.isPlantRolloutEnabled()) {
    out.plant = evaluatePlantRollout(snap.plants || {}, { blockers: blockerDedup });
    const anyEmit = Object.values(out.plant.plants || {}).some((p) => p.emit_event);
    if (anyEmit && opts.emit_events !== false) {
      const pub = await _publish(
        {
          event_name: EVT.PLANT_STAGE_CHANGED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: { plants: out.plant.plants }
        },
        { origin_layer: 'operational', intended_audience: 'management', user_id: userId }
      );
      out.events.push({ type: EVT.PLANT_STAGE_CHANGED, ...pub });
    }
  }

  if (flags.isWorkflowRolloutEnabled()) {
    out.workflow = evaluateWorkflowRollout(snap.workflows || {}, {
      maturity_level: out.maturity?.maturity_level || 'INITIAL',
      blockers: blockerDedup
    });
    const wfEmit = Object.entries(out.workflow.workflows || {}).filter(([, v]) => v.emit_event);
    if (wfEmit.length && opts.emit_events !== false) {
      const pub = await _publish(
        {
          event_name: EVT.WORKFLOW_ENABLED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: { transitions: wfEmit.map(([k]) => k).slice(0, 16) }
        },
        { origin_layer: 'operational', intended_audience: 'supervisor', user_id: userId }
      );
      out.events.push({ type: EVT.WORKFLOW_ENABLED, ...pub });
    }
  }

  out.confidence = computeRolloutConfidence({
    maturity_score: out.maturity?.maturity_score,
    readiness_score: out.readiness?.readiness_score,
    participation_index: out.adoption?.operational_participation_index,
    saturation_score: saturation?.saturation_score
  });

  if (
    out.confidence.rollout_confidence >= (opts.activation_confidence_threshold ?? 0.72) &&
    !blockerDedup.length &&
    opts.emit_events !== false
  ) {
    const pub = await _publish(
      {
        event_name: EVT.ACTIVATION_APPROVED,
        company_id: String(companyId),
        correlation_id: correlationId,
        payload: { confidence: out.confidence.rollout_confidence }
      },
      { origin_layer: 'operational', intended_audience: 'management', user_id: userId }
    );
    out.events.push({ type: EVT.ACTIVATION_APPROVED, ...pub });
  }

  obs.recordMetric('quality_rollout_runtime_ms', Date.now() - t0, {});

  return out;
}

module.exports = { runRolloutAssessmentPack, throttleOk };
