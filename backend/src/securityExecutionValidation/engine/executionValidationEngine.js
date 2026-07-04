'use strict';

/**
 * SEC-12 — Execution Validation Engine (orquestrador).
 */

const flags = require('../config/securityExecutionValidationFlags');
const metrics = require('../metrics/executionValidationMetrics');
const store = require('../store/executionValidationStore');
const registry = require('../registry/protectionActionRegistry');
const executionValidator = require('./executionValidator');
const dryRunEngine = require('./dryRunEngine');
const approvalValidator = require('./approvalWorkflowValidator');
const readinessScore = require('./executionReadinessScore');
const impactAnalyzer = require('./changeImpactAnalyzer');
const { collectValidationContext } = require('../collectors/validationContextCollector');
const {
  createExecutionValidationDashboardDto,
  freezeDto
} = require('../dto/executionValidationDto');

function evaluateValidation(opts = {}) {
  if (!flags.isSecurityExecutionValidationEnabled() && !opts.force) return null;

  const start = Date.now();
  metrics.increment('evaluations');

  const context = collectValidationContext();
  const sec11Dashboard = context.sec11?.dashboard || null;

  const planValidation = executionValidator.validateProtectionPlan(sec11Dashboard);
  const validations = planValidation.actions || [];

  const approvalValidation = approvalValidator.validateApproval(
    sec11Dashboard?.approvalStatus?.request,
    sec11Dashboard?.recommendedProfile
  );

  const dryRunResults = dryRunEngine.runDryRun(validations);
  const impactAssessments = impactAnalyzer.analyzePlanImpact(
    validations.map((v) => ({ actionId: v.actionId, registryAction: registry.getActionById(v.actionId) }))
  );
  metrics.increment('impact_assessments', impactAssessments.length);

  const readiness = readinessScore.computeExecutionReadinessScore({
    validations,
    dryRuns: dryRunResults,
    approvalValidation,
    sec11Dashboard
  });
  metrics.increment('execution_scores');

  const rollbackValidations = validations.map((v) => ({
    actionId: v.actionId,
    ...v.rollback
  }));

  const dashboard = createExecutionValidationDashboardDto({
    enabled: flags.isSecurityExecutionValidationEnabled(),
    dry_run_only: flags.dryRunOnly(),
    execution_readiness_score: readiness.execution_readiness_score,
    readiness,
    actionRegistry: registry.getAllActions(),
    planValidation,
    dryRunResults,
    impactAssessments,
    approvalValidation,
    rollbackValidations,
    sec11_snapshot: sec11Dashboard
      ? {
          recommendedProfile: sec11Dashboard.recommendedProfile,
          threatScore: sec11Dashboard.threatScore,
          protectionPlanId: sec11Dashboard.protectionPlan?.planId
        }
      : null,
    sec13_eligible: readiness.readyForSec13 && flags.dryRunOnly(),
    metrics: metrics.getSnapshot()
  });

  store.addValidation({
    at: new Date().toISOString(),
    readinessScore: readiness.execution_readiness_score,
    planValid: planValidation.planValid,
    actionCount: validations.length
  });
  dryRunResults.forEach((d) => store.addDryRun(d));
  store.setLastEvaluation({ at: new Date().toISOString(), readiness });
  store.setLastDashboard(dashboard);
  metrics.recordEvaluationTime(Date.now() - start);

  return freezeDto(dashboard);
}

module.exports = { evaluateValidation };
