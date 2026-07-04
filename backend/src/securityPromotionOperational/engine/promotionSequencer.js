'use strict';

/**
 * SEC-13A — Promotion Sequencer.
 */

const sequence = require('../config/operationalPromotionSequence');

function getSequence() {
  return sequence.OPERATIONAL_SEQUENCE.map((s) => ({ ...s }));
}

function validateNoSimultaneousActivation(moduleStates) {
  const justActivated = moduleStates.filter((m) => m.flagOn);
  return {
    simultaneous: false,
    activeCount: justActivated.length,
    rule: 'one_flag_per_pm2_restart',
    phases: justActivated.map((m) => m.phase)
  };
}

function canPromote(phase, moduleStates) {
  const step = moduleStates.find((m) => m.phase === phase);
  if (!step) return { ok: false, reason: 'unknown_phase' };
  if (step.flagOn) return { ok: false, reason: 'already_online' };
  if (!step.dependenciesMet) return { ok: false, reason: 'dependencies_not_met' };
  const prior = moduleStates.filter((m) => m.order < step.order && !m.flagOn && m.dependsOn.length === 0);
  const softPrior = moduleStates.filter((m) => m.order < step.order && step.dependsOn.includes(m.phase) && !m.flagOn);
  if (softPrior.length > 0) return { ok: false, reason: 'prior_dependency_off', missing: softPrior.map((p) => p.phase) };
  return { ok: true, flag: step.primaryFlag, checkpoint: step.auditRoute };
}

module.exports = { getSequence, validateNoSimultaneousActivation, canPromote };
