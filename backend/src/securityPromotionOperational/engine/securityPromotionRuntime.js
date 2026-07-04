'use strict';

const sequence = require('../config/operationalPromotionSequence');
const store = require('../store/operationalPromotionStore');

const MODULE_LOADERS = {
  securityObservatory: () => require('../../securityObservatory'),
  securityCorrelation: () => require('../../securityCorrelation'),
  securityThreatIntelligence: () => require('../../securityThreatIntelligence'),
  securityRuntimeIntegrity: () => require('../../securityRuntimeIntegrity'),
  securityNotification: () => require('../../securityNotification'),
  securityResponse: () => require('../../securityResponse'),
  securitySOC: () => require('../../securitySOC'),
  securityActiveDefense: () => require('../../securityActiveDefense'),
  securityAdaptiveProtection: () => require('../../securityAdaptiveProtection'),
  securityExecutionValidation: () => require('../../securityExecutionValidation'),
  securityControlledExecution: () => require('../../securityControlledExecution')
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

function constraintsOk(step) {
  const c = step.requiredConstraints || {};
  return Object.entries(c).every(([k, expected]) => {
    const actual = envFlag(k);
    if (actual == null) return String(expected).toLowerCase() === 'false' || expected === 'advise' || expected === '1';
    return String(actual).toLowerCase() === String(expected).toLowerCase();
  });
}

function dependenciesOnline(stepsByPhase, step) {
  for (const dep of step.dependsOn || []) {
    const depStep = stepsByPhase.get(dep);
    if (!depStep || !depStep.flagOn) return false;
  }
  return true;
}

function detectActiveModules() {
  return sequence.OPERATIONAL_SEQUENCE.filter((s) => isFlagOn(s.primaryFlag)).map((s) => s.phase);
}

function validateSequenceOrder(moduleStates) {
  const violations = [];
  let highestOnOrder = 0;
  for (const m of moduleStates) {
    if (m.flagOn) highestOnOrder = Math.max(highestOnOrder, m.order);
  }
  for (const m of moduleStates) {
    if (m.order < highestOnOrder && !m.flagOn) {
      violations.push({
        phase: m.phase,
        reason: 'strict_sequence_gap',
        note: 'Promoção fora de ordem — activar sequencialmente SEC-01→13'
      });
    }
    if (m.flagOn && !m.dependenciesMet) {
      violations.push({ phase: m.phase, reason: 'dependencies_not_met', dependsOn: m.dependsOn });
    }
  }
  return violations;
}

function buildModuleStates() {
  const stepsByPhase = new Map();
  const states = sequence.OPERATIONAL_SEQUENCE.map((step) => {
    const flagOn = isFlagOn(step.primaryFlag);
    const entry = { ...step, flagOn, constraintsOk: constraintsOk(step) };
    stepsByPhase.set(step.phase, entry);
    return entry;
  });

  for (const s of states) {
    s.dependenciesMet = dependenciesOnline(stepsByPhase, s);
  }

  return states.map((step) => {
    let health = { ok: true, latencyMs: 0 };
    try {
      const start = Date.now();
      const mod = MODULE_LOADERS[step.module]?.();
      if (mod?.getAuditPayload) mod.getAuditPayload();
      health = { ok: true, latencyMs: Date.now() - start, enabled: mod?.isEnabled?.() };
    } catch (e) {
      health = { ok: false, latencyMs: 0, error: e?.message };
    }

    let state = 'OFF';
    if (store.isRollback(step.phase)) state = 'ROLLBACK';
    else if (step.flagOn && health.ok && step.constraintsOk && step.dependenciesMet) state = 'ONLINE';
    else if (step.flagOn && (!health.ok || !step.constraintsOk)) state = 'DEGRADED';
    else if (step.flagOn && !step.dependenciesMet) state = 'FAILED';
    else if (step.flagOn) state = 'MONITORING';
    else if (step.dependenciesMet && !step.flagOn) state = 'READY';

    return {
      phase: step.phase,
      module: step.module,
      primaryFlag: step.primaryFlag,
      order: step.order,
      state,
      flagOn: step.flagOn,
      flagValue: envFlag(step.primaryFlag),
      constraintsOk: step.constraintsOk,
      dependenciesMet: step.dependenciesMet,
      dependsOn: step.dependsOn,
      health,
      auditRoute: step.auditRoute,
      minObservationMinutes: step.minObservationMinutes,
      rollback: { flag: `${step.primaryFlag}=false`, independent: true }
    };
  });
}

function getNextPromotionStep(moduleStates) {
  return moduleStates.find((m) => m.state === 'READY') || null;
}

function evaluatePromotionRuntime() {
  const active = detectActiveModules();
  const moduleStates = buildModuleStates();
  const violations = validateSequenceOrder(moduleStates);
  const nextStep = getNextPromotionStep(moduleStates);

  return {
    version: sequence.PROMOTION_VERSION,
    auto_activation: sequence.AUTO_ACTIVATION,
    activeModules: active,
    moduleStates,
    sequenceViolations: violations,
    sequenceValid: violations.length === 0,
    nextPromotionStep: nextStep,
    onlineReady: moduleStates.every((m) => !m.flagOn || m.state === 'ONLINE' || m.state === 'MONITORING')
  };
}

module.exports = {
  detectActiveModules,
  validateSequenceOrder,
  buildModuleStates,
  evaluatePromotionRuntime,
  isFlagOn,
  MODULE_LOADERS
};
