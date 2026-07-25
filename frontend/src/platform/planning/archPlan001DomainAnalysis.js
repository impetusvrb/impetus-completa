/**
 * ARCH-PLAN-001 — Análise de domínios (consome ENT-001 exclusivamente).
 */
import {
  getDomainCatalog,
  getPlatformHeatmap,
  getCrossDomainMatrix,
  getEvolutionCandidates,
  ENT_001_PHASE
} from '../knowledge/index.js';
import { ARCH_PLAN_001_PHASE, ARCH_PLAN_001_BASELINE } from './archPlan001Constants.js';

function _scoreDomain(row, heatmap, candidate) {
  let maturityScore = 0;
  const m = heatmap?.maturity || row.maturity;
  if (m === 'certified') maturityScore = 100;
  else if (m === 'mature') maturityScore = 80;
  else if (m === 'partial') maturityScore = 55;
  else if (m === 'discovered') maturityScore = 40;
  else if (m === 'not_started') maturityScore = 10;

  const reuseScore = Math.min(100, (row.moduleCount || 0) * 8 + (row.runtimeCount || 0) * 6 + (row.cognitiveCount || 0) * 4);
  const infraScore = row.active ? 20 : 0;
  const gapPenalty = (candidate?.whatMustBeDeveloped?.length || 0) * 5;

  const valueRiskRatio = maturityScore + reuseScore + infraScore - gapPenalty;

  return Object.freeze({
    maturityScore,
    reuseScore,
    infraScore,
    gapPenalty,
    valueRiskRatio: Math.max(0, valueRiskRatio)
  });
}

export function buildDomainAnalysis() {
  const domains = getDomainCatalog();
  const heatmap = getPlatformHeatmap();
  const matrix = getCrossDomainMatrix();
  const evo = getEvolutionCandidates();

  return Object.freeze(
    domains.map((domain) => {
      const row = matrix.find((r) => r.domainId === domain.domainId) || {};
      const heat = heatmap.find((h) => h.domainId === domain.domainId) || {};
      const candidate = evo.domainCandidates.find((c) => c.domainId === domain.domainId);
      const scores = _scoreDomain(row, heat, candidate);

      return Object.freeze({
        domainId: domain.domainId,
        label: domain.label,
        active: domain.active,
        maturity: heat.maturity || domain.maturity,
        maturityLabel: heat.maturityLabel || domain.maturity,
        moduleCount: row.moduleCount || 0,
        runtimeCount: row.runtimeCount || 0,
        cognitiveCount: row.cognitiveCount || 0,
        integrationCount: row.integrationCount || 0,
        certification: domain.certification,
        scores,
        entRecommendation: candidate?.recommendation || null,
        rationale: heat.rationale || null,
        source: `${ENT_001_PHASE} baseline`
      });
    })
  );
}

export const ARCH_DOMAIN_ANALYSIS = buildDomainAnalysis();

export function getDomainAnalysis(domainId) {
  return ARCH_DOMAIN_ANALYSIS.find((d) => d.domainId === domainId) ?? null;
}

export function listDomainsByValueRisk() {
  return [...ARCH_DOMAIN_ANALYSIS].sort((a, b) => b.scores.valueRiskRatio - a.scores.valueRiskRatio);
}

export function validateDomainAnalysis() {
  const issues = [];
  if (ARCH_DOMAIN_ANALYSIS.length < 15) issues.push('incomplete domain analysis');
  if (!getDomainAnalysis('finance')) issues.push('finance analysis required');
  if (!getDomainAnalysis('logistics_wms')) issues.push('logistics_wms analysis required');
  return {
    valid: issues.length === 0,
    issues,
    phase: ARCH_PLAN_001_PHASE,
    baseline: ARCH_PLAN_001_BASELINE,
    count: ARCH_DOMAIN_ANALYSIS.length
  };
}
