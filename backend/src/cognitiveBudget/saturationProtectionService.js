'use strict';

/**
 * WAVE 4 — protecção de saturação (bridge cognitivePressureService).
 */

const flags = require('./cognitiveBudgetFlags');

let _pressureService = null;

function _pressure() {
  if (_pressureService) return _pressureService;
  try {
    _pressureService = require('../services/enterprise/cognitivePressureService');
  } catch (_e) {
    _pressureService = null;
  }
  return _pressureService;
}

/**
 * Reduz budget quando pressão cognitiva elevada.
 * @param {number} budgetTokens
 * @param {object} [ctx]
 */
function adjustBudgetForPressure(budgetTokens, ctx = {}) {
  if (!flags.isSaturationProtectionEnabled()) return budgetTokens;

  const svc = _pressure();
  if (!svc) return budgetTokens;

  const samples = svc.getRecentPressureSamples(5);
  const latest = samples.length ? samples[samples.length - 1] : null;
  const pressure = latest ? latest.overall_pressure : 0;

  if (pressure > 0.85) return Math.floor(budgetTokens * 0.4);
  if (pressure > 0.7) return Math.floor(budgetTokens * 0.6);
  if (pressure > 0.55) return Math.floor(budgetTokens * 0.8);

  return budgetTokens;
}

function samplePressureForBudget(ctx) {
  const svc = _pressure();
  if (!svc || !svc.sample) return null;
  return svc.sample({
    queue_depth: ctx.queue_depth || 0,
    events_per_sec: ctx.events_per_sec || 0
  });
}

module.exports = {
  adjustBudgetForPressure,
  samplePressureForBudget
};
