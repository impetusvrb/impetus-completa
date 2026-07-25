'use strict';

/**
 * APPSEC-02 — Appsec Certification Engine
 * Decisão formal APPSEC_CERTIFIED | APPSEC_CERTIFIED_WITH_REMARKS | APPSEC_FAILED
 */

const { CERTIFICATION_DECISION, COMPARISON_STATUS } = require('./dto/appsecValidationDto');

/**
 * @param {object[]} comparison
 * @param {object[]} regressions
 * @param {object} scores
 */
function determineCertification(comparison, regressions, scores) {
  const remarks = [];
  let decision = CERTIFICATION_DECISION.APPSEC_CERTIFIED;

  if (regressions.length > 0) {
    decision = CERTIFICATION_DECISION.APPSEC_FAILED;
    remarks.push(`${regressions.length} regressão(ões) de código APPSEC-01 detectada(s)`);
  }

  const p0p1Failed = comparison.filter((c) =>
    ['P0', 'P1'].includes(c.baseline_priority) &&
    [COMPARISON_STATUS.NOT_FIXED, COMPARISON_STATUS.REGRESSION].includes(c.status)
  );

  if (p0p1Failed.length > 0) {
    decision = CERTIFICATION_DECISION.APPSEC_FAILED;
    remarks.push(`P0/P1 não corrigidos: ${p0p1Failed.map((c) => c.finding_id).join(', ')}`);
  }

  const p0p1Partial = comparison.filter((c) =>
    ['P0', 'P1'].includes(c.baseline_priority) &&
    c.status === COMPARISON_STATUS.PARTIALLY_FIXED
  );

  if (decision !== CERTIFICATION_DECISION.APPSEC_FAILED && p0p1Partial.length > 0) {
    decision = CERTIFICATION_DECISION.APPSEC_CERTIFIED_WITH_REMARKS;
    for (const c of p0p1Partial) {
      remarks.push(`${c.finding_id}: parcialmente mitigado — ${c.impact_operational || c.after_summary}`);
    }
  }

  const p2Open = comparison.filter((c) =>
    c.baseline_priority === 'P2' &&
    [COMPARISON_STATUS.NOT_FIXED, COMPARISON_STATUS.PARTIALLY_FIXED].includes(c.status)
  );

  if (decision === CERTIFICATION_DECISION.APPSEC_CERTIFIED && p2Open.length > 0) {
    decision = CERTIFICATION_DECISION.APPSEC_CERTIFIED_WITH_REMARKS;
    remarks.push(`P2 residual: ${p2Open.map((c) => c.finding_id).join(', ')}`);
  }

  const p3Open = comparison.filter((c) =>
    ['P3'].includes(c.baseline_priority) &&
    c.status === COMPARISON_STATUS.NOT_FIXED
  );

  if (decision === CERTIFICATION_DECISION.APPSEC_CERTIFIED && p3Open.length > 0) {
    decision = CERTIFICATION_DECISION.APPSEC_CERTIFIED_WITH_REMARKS;
    remarks.push(`P3 informacional: ${p3Open.map((c) => c.finding_id).join(', ')}`);
  }

  if (scores.security_improvement_score < 70 && decision === CERTIFICATION_DECISION.APPSEC_CERTIFIED) {
    decision = CERTIFICATION_DECISION.APPSEC_CERTIFIED_WITH_REMARKS;
    remarks.push(`Security Improvement Score ${scores.security_improvement_score}% abaixo do alvo 70%`);
  }

  return {
    decision,
    remarks,
    certified_at: new Date().toISOString(),
    valid_for: 'APPSEC-01 layer validation',
    next_step: decision === CERTIFICATION_DECISION.APPSEC_FAILED
      ? 'Corrigir regressões/P0/P1 antes de Red Team externo'
      : 'Recomendado Red Team independente para confirmação P0/P1'
  };
}

module.exports = {
  determineCertification
};
