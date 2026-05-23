'use strict';

function validateAdaptiveOrchestrationReport(report = {}) {
  const ao = report.adaptive_orchestration || report;
  return {
    valid: ao.auto_mutation_applied === false && ao.auto_remediation !== true,
    supervised: ao.supervised === true,
    runtime_safe: ao.runtime_safe !== false
  };
}

module.exports = { validateAdaptiveOrchestrationReport };
