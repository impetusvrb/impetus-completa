'use strict';

/**
 * SEC-04 — Integrity Score (0.0 → 1.0) determinístico.
 */

function computeIntegrityScore(validations) {
  const weights = {
    hash: 0.35,
    configuration: 0.2,
    runtime: 0.2,
    filesystem: 0.15,
    network: 0.1
  };

  let score = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const v = validations[key];
    if (!v) continue;
    totalWeight += weight;
    const sectionScore = sectionToScore(v);
    score += sectionScore * weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((score / totalWeight) * 1000) / 1000;
}

function sectionToScore(section) {
  if (section.status === 'OK' && section.passed) return 1;
  if (section.status === 'WARNING') return 0.75;
  if (section.status === 'UNKNOWN') return 0.5;
  if (section.status === 'DEGRADED') return 0.4;

  const findings = section.findings || [];
  const critical = findings.filter((f) => f.severity === 'CRITICAL').length;
  const warnings = findings.filter((f) => f.severity === 'WARNING').length;

  if (section.status === 'COMPROMISED' || critical > 0) {
    return Math.max(0, 0.3 - critical * 0.08 - warnings * 0.02);
  }

  return Math.max(0, 0.6 - warnings * 0.05);
}

function deriveIntegrityStatus(score, criticalFindings) {
  if (criticalFindings.length >= 3 || score < 0.5) return 'COMPROMISED';
  if (criticalFindings.length > 0 || score < 0.85) return 'DEGRADED';
  if (score >= 0.95) return 'INTEGRITY_OK';
  return 'DEGRADED';
}

function buildRecommendations(validations, status) {
  const recs = [];

  if (validations.hash?.drift > 0) {
    recs.push({ priority: 'high', text: 'Rever ficheiros com hash drift face à SECURITY-BASELINE-01 (observacional)' });
  }
  if (validations.hash?.missing > 0) {
    recs.push({ priority: 'critical', text: 'Ficheiros críticos ausentes — investigar antes de SEC-06 response' });
  }
  if (validations.runtime?.findings?.some((f) => f.code === 'UNEXPECTED_RESTARTS')) {
    recs.push({ priority: 'medium', text: 'Verificar logs PM2 para restarts inesperados' });
  }
  if (validations.network?.findings?.some((f) => f.code.includes('PUBLIC_BIND'))) {
    recs.push({ priority: 'critical', text: 'Serviço exposto fora de localhost — rever LISTEN_HOST' });
  }
  if (status === 'INTEGRITY_OK') {
    recs.push({ priority: 'info', text: 'Ambiente conforme baseline certificada' });
  }

  recs.push({ priority: 'info', text: 'SEC-04 não executa auto-remediação — acções manuais ou SEC-06+' });

  return recs;
}

module.exports = {
  computeIntegrityScore,
  deriveIntegrityStatus,
  buildRecommendations,
  sectionToScore
};
