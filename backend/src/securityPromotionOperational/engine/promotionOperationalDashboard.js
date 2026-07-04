'use strict';

/**
 * SEC-13A — Promotion Operational Dashboard.
 */

const flags = require('../config/securityOperationalPromotionFlags');
const sequence = require('../config/operationalPromotionSequence');
const promotionRuntime = require('./securityPromotionRuntime');
const validationEngine = require('./operationalValidationEngine');
const reportEngine = require('./operationalValidationReport');
const sequencer = require('./promotionSequencer');
const metrics = require('../metrics/securityOperationalMonitor');
const store = require('../store/operationalPromotionStore');

function createDashboardDto(input) {
  return {
    schema_version: 'operational_promotion_dashboard_v1',
    read_only: true,
    enabled: input.enabled === true,
    promotion_mode: input.promotion_mode || 'controlled',
    validate_enabled: input.validate_enabled !== false,
    auto_activation: sequence.AUTO_ACTIVATION,
    operational_score: input.operational_score ?? 0,
    modules: input.modules || [],
    promotionRuntime: input.promotionRuntime || null,
    validation: input.validation || null,
    reports: input.reports || [],
    sequencer: input.sequencer || null,
    forbidden_in_phase: sequence.FORBIDDEN_IN_PHASE,
    allowed_modes: sequence.ALLOWED_MODES,
    sec14_prerequisite: input.sec14_prerequisite || false,
    metrics: input.metrics || {},
    generatedAt: input.generatedAt || new Date().toISOString()
  };
}

function buildDashboard(opts = {}) {
  if (!flags.isSecurityOperationalPromotionEnabled() && !opts.force) return null;

  const start = Date.now();
  const runtime = promotionRuntime.evaluatePromotionRuntime();
  const moduleStates = runtime.moduleStates;

  let validation = null;
  if (flags.validateOnEval() || opts.force) {
    validation = validationEngine.validateOperational(moduleStates);
    store.setLastValidation(validation);
  }

  const report = reportEngine.buildPromotionReport({
    moduleStates,
    validation,
    promotionRuntime: runtime
  });
  store.addReport(report);

  const online = moduleStates.filter((m) => m.state === 'ONLINE' || m.state === 'MONITORING').length;
  const offline = moduleStates.filter((m) => !m.flagOn).length;
  metrics.setModulesOnline(online);
  metrics.setModulesOffline(offline);

  const scoreBase = runtime.sequenceValid ? 70 : 40;
  const scoreOnline = (online / moduleStates.length) * 25;
  const scoreValidation = validation?.overallPass ? 5 : 0;
  const operationalScore = Math.min(100, scoreBase + scoreOnline + scoreValidation);
  metrics.setOperationalScore(operationalScore);
  metrics.recordDuration(Date.now() - start);
  if (runtime.onlineReady) metrics.increment('promotion_success');
  else if (runtime.sequenceViolations.length) metrics.increment('promotion_failure');

  const dashboard = createDashboardDto({
    enabled: flags.isSecurityOperationalPromotionEnabled(),
    promotion_mode: flags.promotionMode(),
    validate_enabled: flags.validateOnEval(),
    operational_score: operationalScore,
    modules: moduleStates,
    promotionRuntime: runtime,
    validation,
    reports: store.getReports(5),
    sequencer: {
      sequence: sequencer.getSequence().map((s) => s.phase),
      simultaneousRule: sequencer.validateNoSimultaneousActivation(moduleStates)
    },
    sec14_prerequisite: runtime.onlineReady && validation?.overallPass === true,
    metrics: metrics.getSnapshot()
  });

  store.setLastDashboard(dashboard);
  return dashboard;
}

module.exports = { buildDashboard, createDashboardDto };
