'use strict';

/**
 * PROMPT 32 — Final consolidation audit facade (read-only assessment).
 */

const flags = require('../config/finalConsolidationAuditFlags');
const catalog = require('../catalog/promptSequenceCatalog');
const evidenceCollector = require('../collectors/runtimeEvidenceCollector');
const promptValidation = require('../engine/promptValidationEngine');
const scoreEngine = require('../engine/consolidationScoreEngine');
const classificationEngine = require('../engine/classificationEngine');
const executiveReport = require('../engine/executiveReportBuilder');
const audit = require('../observability/finalConsolidationAuditAuditService');

function _log(event, data) {
  try {
    console.info(
      '[FINAL_CONSOLIDATION_AUDIT]',
      JSON.stringify({ event, ts: new Date().toISOString(), mode: flags.consolidationAuditMode(), ...data })
    );
  } catch (_e) {}
}

function getHealth() {
  return {
    mode: flags.consolidationAuditMode(),
    active: flags.isFinalConsolidationAuditActive(),
    prompts_in_sequence: catalog.listPrompts().length,
    runtime_zones: catalog.RUNTIME_ZONES.length,
    invariants: {
      additive_only: true,
      read_only_assessment: true,
      no_production_mutation: true,
      motor_a_preserved: true,
      engine_v2_preserved: true,
      shadow_validation_required_for_promotion: true
    }
  };
}

async function runFullConsolidationAudit(companyId = null, ctx = {}) {
  if (!flags.isFinalConsolidationAuditActive()) {
    return { ok: false, error: 'final_consolidation_audit_inactive', mode: flags.consolidationAuditMode() };
  }

  const evidence = await evidenceCollector.collectRuntimeEvidence(companyId);
  const prompt_validation = promptValidation.validateAllPrompts(evidence);
  const runtime_zones = promptValidation.validateRuntimeZones(evidence);
  const anti_patterns = classificationEngine.detectAntiPatterns(evidence, prompt_validation);
  const scores = scoreEngine.computeScores({
    promptValidation: prompt_validation,
    runtimeZones: runtime_zones,
    evidence,
    shadowPatterns: evidence.shadow_anti_patterns
  });
  const classification = classificationEngine.classifySystem(scores, prompt_validation, anti_patterns);
  const residual_debt = scoreEngine.buildResidualDebtSummary();
  const residual_roadmap = scoreEngine.buildResidualRoadmap(scores);
  const remaining_risks = executiveReport.buildRemainingRisks(anti_patterns, scores);

  const executive_report = executiveReport.buildExecutiveReport({
    scores,
    classification,
    promptValidation: prompt_validation,
    antiPatterns: anti_patterns,
    residual_debt,
    residual_roadmap,
    remaining_risks
  });

  const report = {
    ok: true,
    mode: flags.consolidationAuditMode(),
    company_id: companyId,
    generated_at: new Date().toISOString(),
    scores,
    classification,
    anti_patterns,
    prompt_validation,
    runtime_zones,
    evidence_inventory: {
      master_docs: evidence.master_audit_docs,
      shadow_flags_count: evidence.shadow_anti_patterns?.length,
      db_counts: evidence.db_counts,
      governance_states: evidence.governance_aggregator
    },
    executive_report,
    remaining_risks,
    residual_debt,
    residual_roadmap,
    explainability: {
      method: 'automated_consolidation_audit',
      validates_prompts_1_to_32: true,
      does_not_mutate_flags: true,
      does_not_remove_legacy_runtimes: true,
      baseline_reference: 'ENTERPRISE_OPERATIONAL_MATURITY_SCORE.md'
    }
  };

  _log('audit_complete', {
    company_id: companyId,
    classification: classification.classification,
    overall: scores.overall_weighted,
    prompts_on: prompt_validation.production_on_count
  });

  const snap = await audit.saveSnapshot(companyId, report);
  report.snapshot_id = snap.id;

  await audit.recordAudit({
    companyId,
    actorUserId: ctx.actorUserId,
    action: 'full_consolidation_audit',
    payload: {
      classification: classification.classification,
      overall_score: scores.overall_weighted,
      snapshot_id: snap.id
    }
  });

  return report;
}

module.exports = {
  getHealth,
  runFullConsolidationAudit,
  listPrompts: catalog.listPrompts
};
