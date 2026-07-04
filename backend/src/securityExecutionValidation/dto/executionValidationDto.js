'use strict';

/**
 * SEC-12 — Execution Validation DTOs.
 */

function createExecutionValidationDashboardDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'execution_validation_v1',
    read_only: true,
    dry_run_only: input.dry_run_only !== false,
    enabled: input.enabled === true,
    execution_readiness_score: input.execution_readiness_score ?? null,
    readiness: input.readiness || null,
    actionRegistry: input.actionRegistry || [],
    planValidation: input.planValidation || null,
    dryRunResults: input.dryRunResults || [],
    impactAssessments: input.impactAssessments || [],
    approvalValidation: input.approvalValidation || null,
    rollbackValidations: input.rollbackValidations || [],
    sec11_snapshot: input.sec11_snapshot || null,
    metrics: input.metrics || {},
    sec13_eligible: input.sec13_eligible === true,
    disclaimer: 'SEC-12 — validation and dry-run only. No actions executed.',
    generatedAt: input.generatedAt || now
  };
}

function freezeDto(obj) {
  return Object.freeze(JSON.parse(JSON.stringify(obj)));
}

module.exports = { createExecutionValidationDashboardDto, freezeDto };
