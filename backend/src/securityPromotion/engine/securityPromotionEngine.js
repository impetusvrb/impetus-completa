'use strict';

/**
 * SEC-09 — Motor read-only de promoção (dashboard + health).
 * Não altera flags, .env nem PM2.
 */

const plan = require('../config/securityPromotionPlan');

const MODULE_LOADERS = {
  securityObservatory: () => require('../../securityObservatory'),
  securityCorrelation: () => require('../../securityCorrelation'),
  securityThreatIntelligence: () => require('../../securityThreatIntelligence'),
  securityRuntimeIntegrity: () => require('../../securityRuntimeIntegrity'),
  securityNotification: () => require('../../securityNotification'),
  securityResponse: () => require('../../securityResponse'),
  securitySOC: () => require('../../securitySOC')
};

function envFlag(name) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw).trim();
}

function isFlagOn(name) {
  const v = envFlag(name);
  if (v == null) return false;
  const lower = v.toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
}

function safeModuleHealth(moduleKey) {
  const started = Date.now();
  try {
    const loader = MODULE_LOADERS[moduleKey];
    if (!loader) return { ok: false, latencyMs: Date.now() - started, error: 'unknown_module' };
    const mod = loader();
    const enabled = typeof mod.isEnabled === 'function' ? mod.isEnabled() : null;
    let auditOk = false;
    let auditError = null;
    if (typeof mod.getAuditPayload === 'function') {
      try {
        const payload = mod.getAuditPayload();
        auditOk = payload != null;
      } catch (e) {
        auditError = e?.message || 'audit_failed';
      }
    }
    return {
      ok: true,
      latencyMs: Date.now() - started,
      enabled,
      auditOk,
      auditError
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: e?.message || 'load_failed'
    };
  }
}

function buildStepRuntime(step) {
  const flagOn = isFlagOn(step.primaryFlag);
  const related = {};
  for (const f of step.relatedFlags || []) {
    related[f] = envFlag(f);
  }
  const constraints = step.requiredConstraints || {};
  const constraintsOk = Object.entries(constraints).every(([k, expected]) => {
    const actual = envFlag(k);
    if (actual == null) {
      return String(expected).toLowerCase() === 'false' || String(expected) === 'advise' || String(expected) === '1';
    }
    return String(actual).toLowerCase() === String(expected).toLowerCase();
  });
  const health = safeModuleHealth(step.module);
  let promotionState = 'PENDING';
  if (flagOn && health.ok && constraintsOk) promotionState = 'ONLINE';
  else if (flagOn && (!health.ok || !constraintsOk)) promotionState = 'DEGRADED';
  else if (!flagOn) promotionState = 'OFF';

  return {
    ...step,
    runtime: {
      flagValue: envFlag(step.primaryFlag),
      flagOn,
      relatedFlags: related,
      constraintsOk,
      promotionState,
      health
    }
  };
}

function buildDashboard() {
  const steps = plan.ACTIVATION_SEQUENCE.map(buildStepRuntime);
  const flagsActive = steps.filter((s) => s.runtime.flagOn).map((s) => s.primaryFlag);
  const online = steps.filter((s) => s.runtime.promotionState === 'ONLINE').length;
  const degraded = steps.filter((s) => s.runtime.promotionState === 'DEGRADED').length;
  const pending = steps.filter((s) => s.runtime.promotionState === 'OFF').length;

  const classificationSummary = {
    READY: steps.filter((s) => s.classification === 'READY').length,
    READY_WITH_MONITORING: steps.filter((s) => s.classification === 'READY_WITH_MONITORING').length,
    NOT_ELIGIBLE: plan.NOT_ELIGIBLE.length,
    BLOCKED: plan.BLOCKED.length
  };

  return {
    version: plan.PROMOTION_VERSION,
    auto_activation: plan.AUTO_ACTIVATION,
    generatedAt: new Date().toISOString(),
    summary: {
      totalSteps: steps.length,
      online,
      degraded,
      pending,
      flagsActive,
      nextRecommendedStep: steps.find((s) => s.runtime.promotionState === 'OFF')?.phase || null
    },
    classificationSummary,
    steps,
    notEligible: plan.NOT_ELIGIBLE,
    blocked: plan.BLOCKED,
    forbiddenFlags: plan.FORBIDDEN_FLAGS,
    recommendedPhase1: plan.RECOMMENDED_PHASE_1,
    rollback: {
      independent: true,
      procedure: 'backend/docs/SEC_09_ROLLBACK.md',
      perStep: steps.map((s) => ({ phase: s.phase, ...s.rollback }))
    }
  };
}

function getPromotionPayload() {
  return {
    ok: true,
    phase: 'SEC-09',
    read_only: true,
    certification: 'SEC-08-ENTERPRISE-SECURITY-V1',
    promotion: buildDashboard()
  };
}

module.exports = {
  getPromotionPayload,
  buildDashboard,
  buildStepRuntime,
  isFlagOn,
  safeModuleHealth
};
