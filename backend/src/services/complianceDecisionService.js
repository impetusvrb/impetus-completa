'use strict';

/**
 * Camada de decisão de conformidade — metadados regulatórios e plano de ação
 * alinhado ao aiComplianceEngine (sem alterar limiares por defeito).
 */

const DEFAULT_REGULATION = String(process.env.COMPLIANCE_DEFAULT_REGULATION_TAG || 'LGPD').slice(0, 32);

/**
 * Plano derivado da classificação e contexto (incl. regras opcionais de policy).
 * @param {object} classification — saída de dataClassificationService.classifyData
 * @param {object} ctx
 * @param {'full'|'limited'|'restricted'|'none'} ctx.adaptiveResponseMode
 * @param {object} [ctx.policyRules] — regras fundidas (ex.: compliance_force_anonymize)
 */
function planCompliance(classification, ctx = {}) {
  const adaptive = ctx.adaptiveResponseMode || 'full';
  const needAnonymizeByAdaptive = adaptive === 'limited' || adaptive === 'restricted';
  const sensitiveHigh = classification.contains_sensitive_data && classification.risk_level === 'HIGH';
  const criticalCombo =
    classification.risk_level === 'CRITICAL' &&
    (classification.contains_sensitive_data || classification.contains_personal_data);
  const forceAnon = ctx.policyRules && ctx.policyRules.compliance_force_anonymize === true;
  const shouldAnonymize =
    forceAnon ||
    needAnonymizeByAdaptive ||
    (classification.contains_sensitive_data &&
      (classification.risk_level === 'HIGH' || classification.risk_level === 'MEDIUM'));

  let primaryAction = 'STORE';
  if (criticalCombo) primaryAction = 'BLOCK';
  else if (shouldAnonymize) primaryAction = 'ANONYMIZE';
  else if (sensitiveHigh) primaryAction = 'REVIEW';

  return {
    criticalCombo,
    sensitiveHigh,
    shouldAnonymize,
    needAnonymizeByAdaptive,
    primaryAction
  };
}

function resolveRegulationTags(_ctx) {
  const extra = String(process.env.COMPLIANCE_EXTRA_REGULATION_TAG || '').trim();
  if (extra && extra.toUpperCase() === 'GDPR') return 'LGPD,GDPR';
  return DEFAULT_REGULATION || 'LGPD';
}

/**
 * @param {string} complianceAction — allowed|blocked|anonymized
 * @param {boolean} anonymizationApplied
 */
function complianceStatusFromOutcome(complianceAction, anonymizationApplied) {
  if (complianceAction === 'blocked') return 'BLOCKED';
  if (complianceAction === 'anonymized' || anonymizationApplied) return 'ANONYMIZED';
  if (complianceAction === 'allowed') return 'COMPLIANT';
  return 'REVIEW_REQUIRED';
}

function buildAuditExtensions({ complianceAction, anonymizationApplied, compliance_status_override }) {
  return {
    regulation_tag: resolveRegulationTags(),
    compliance_status:
      compliance_status_override || complianceStatusFromOutcome(complianceAction, anonymizationApplied),
    retention_applied: false,
    anonymization_applied: !!anonymizationApplied
  };
}

/**
 * Decisão explícita para relatórios / dashboard (sem efeitos colaterais).
 */
function evaluateComplianceDecision(classification, ctx = {}) {
  const plan = planCompliance(classification, ctx);
  let decision = 'STORE';
  if (plan.criticalCombo) decision = 'BLOCK';
  else if (plan.shouldAnonymize) decision = 'ANONYMIZE';
  else if (plan.sensitiveHigh) decision = 'STORE';

  return {
    decision,
    plan,
    regulation_frameworks: resolveRegulationTags().split(',').map((s) => s.trim()),
    require_human_review: plan.sensitiveHigh || plan.criticalCombo
  };
}

module.exports = {
  planCompliance,
  resolveRegulationTags,
  complianceStatusFromOutcome,
  buildAuditExtensions,
  evaluateComplianceDecision
};
