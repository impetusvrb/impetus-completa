'use strict';

/**
 * Sete scores dimensionais da auditoria final (0–100).
 */

const RESIDUAL_DEBTS = require('./residualDebtCatalog');

function _clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function computeScores(ctx) {
  const { promptValidation, runtimeZones, evidence, shadowPatterns } = ctx;
  const pv = promptValidation;
  const cert = evidence?.certification_readiness_score ?? 70;

  const maturity_score_final = _clamp(
    pv.production_on_pct * 0.45 +
      (100 - Math.min(shadowPatterns?.length || 0, 20) * 3) * 0.25 +
      (evidence.master_audit_docs?.filter((d) => d.present).length / 6) * 100 * 0.15 +
      cert * 0.15
  );

  const architecture_score = _clamp(
    (runtimeZones.filter((z) => z.production_on).length / runtimeZones.length) * 100 * 0.5 +
      (evidence.core_runtime_files?.motor_a && evidence.core_runtime_files?.engine_v2 ? 85 : 55) * 0.3 +
      (pv.prompts.filter((p) => p.prompt_id >= 26 && p.production_on).length / 7) * 100 * 0.2
  );

  const governance_score = _clamp(
    (pv.prompts.filter((p) => [17, 18, 27, 29].includes(p.prompt_id) && p.production_on).length / 4) * 100 * 0.4 +
      (evidence.governance_aggregator?.filter((g) => g.production_on).length /
        Math.max(evidence.governance_aggregator?.length || 1, 1)) *
        100 *
        0.35 +
      (evidence.db_counts?.ai_legal_audit_logs > 0 ? 90 : 50) * 0.25
  );

  const ai_safety_score = _clamp(
    (pv.prompts.filter((p) => [12, 13, 24].includes(p.prompt_id) && p.production_on).length / 3) * 100 * 0.45 +
      (evidence.runtime_health_probes?.action_runtime?.ok ? 80 : 45) * 0.35 +
      cert * 0.2
  );

  const industrial_readiness_score = _clamp(
    (pv.prompts.filter((p) => [19, 20, 21, 22, 23, 25].includes(p.prompt_id) && p.production_on).length / 6) *
      100 *
      0.5 +
      (runtimeZones.find((z) => z.id === 'telemetry_real')?.production_on ? 75 : 38) * 0.3 +
      (runtimeZones.find((z) => z.id === 'industrial_resilience')?.production_on ? 85 : 40) * 0.2
  );

  const international_readiness_score = _clamp(
    (pv.prompts.filter((p) => [16, 17, 18, 30].includes(p.prompt_id) && p.production_on).length / 4) * 100 * 0.4 +
      (pv.prompts.find((p) => p.prompt_id === 30)?.production_on ? 88 : 50) * 0.35 +
      cert * 0.25
  );

  const certification_readiness_score = _clamp(cert);

  const overall_weighted =
    maturity_score_final * 0.2 +
    architecture_score * 0.15 +
    governance_score * 0.2 +
    ai_safety_score * 0.15 +
    industrial_readiness_score * 0.15 +
    international_readiness_score * 0.1 +
    certification_readiness_score * 0.05;

  return {
    maturity_score_final,
    architecture_score,
    governance_score,
    ai_safety_score,
    industrial_readiness_score,
    international_readiness_score,
    certification_readiness_score,
    overall_weighted: _clamp(overall_weighted),
    methodology: {
      scale: '0-100 automated technical consolidation',
      baseline_doc: 'ENTERPRISE_OPERATIONAL_MATURITY_SCORE.md (2026-05-25 baseline ~62)',
      not_formal_certification: true
    }
  };
}

function buildResidualDebtSummary() {
  return {
    total_items: RESIDUAL_DEBTS.length,
    critical: RESIDUAL_DEBTS.filter((d) => d.severity === 'critical').length,
    medium: RESIDUAL_DEBTS.filter((d) => d.severity === 'medium').length,
    low: RESIDUAL_DEBTS.filter((d) => d.severity === 'low').length,
    items: RESIDUAL_DEBTS
  };
}

function buildResidualRoadmap(scores) {
  const phases = [];
  if (scores.industrial_readiness_score < 70) {
    phases.push({
      phase: 'Q1',
      title: 'Industrial hardening',
      items: ['Lab PLC/MQTT/OPC-UA E2E', 'Edge agent mutual TLS', 'SZ4 persistence full rollout']
    });
  }
  if (scores.governance_score < 80) {
    phases.push({
      phase: 'Q2',
      title: 'Governance & visibility',
      items: ['Visibility API 100%', 'Z.28/Z.29 promotion gates', 'Federation production IdP']
    });
  }
  if (scores.international_readiness_score < 75) {
    phases.push({
      phase: 'Q3',
      title: 'International readiness',
      items: ['Locale rollout all tenants', 'SOC2 evidence pack', 'Multi-region residency']
    });
  }
  phases.push({
    phase: 'Q4',
    title: 'Consolidation & debt burn-down',
    items: ['Motor A → Engine V2 migration plan', 'Legacy chatAIService removal (P27 gates)', 'Formal ISO audits']
  });
  return { phases, horizon_months: 12 };
}

module.exports = { computeScores, buildResidualDebtSummary, buildResidualRoadmap };
