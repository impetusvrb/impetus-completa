'use strict';

/**
 * SEC-06 — Resolução determinística de nível de resposta.
 */

const flags = require('../config/securityResponseFlags');
const { getCatalogEntry } = require('../catalog/actionCatalog');

const LEVEL_RANK = { OBSERVE: 0, ADVISE: 1, ASSIST: 2, PROTECT: 3 };

function resolveRecommendedLevel(context) {
  const { incident, threatProfile, integrityReport, notification } = context;
  const severity = incident?.severity || notification?.severity || 'LOW';
  const integrity = integrityReport?.integrityStatus;
  const threatRisk = threatProfile?.riskLevel;

  if (integrity === 'COMPROMISED') return 'PROTECT';
  if (severity === 'CRITICAL' || threatRisk === 'Critical') return 'ASSIST';
  if (severity === 'HIGH' || integrity === 'DEGRADED') return 'ASSIST';
  if (severity === 'MEDIUM' || threatRisk === 'Medium') return 'ADVISE';
  if (incident?.classification === 'OPERATIONAL_ACCESS') return 'OBSERVE';
  return 'ADVISE';
}

function resolveCatalogId(level, context) {
  if (level === 'PROTECT') return 'protect_plan_only';
  if (level === 'ASSIST') {
    if (context.incident?.severity === 'CRITICAL') return 'assist_full_analysis';
    return 'assist_evidence_bundle';
  }
  if (level === 'ADVISE') {
    if (context.integrityReport?.integrityStatus === 'DEGRADED') return 'advise_integrity_check';
    return 'advise_review_logs';
  }
  return 'observe_only';
}

function resolveCurrentMode(recommendedLevel) {
  const defaultMode = flags.defaultResponseMode();
  const maxLevel = flags.maxExecutableLevel();

  const modeRank = LEVEL_RANK[defaultMode.toUpperCase()] ?? 1;
  const recRank = LEVEL_RANK[recommendedLevel] ?? 0;
  const maxRank = maxLevel;

  const effectiveRank = Math.min(recRank, modeRank, maxRank);

  if (recommendedLevel === 'PROTECT') {
    return flags.protectModeEnabled() ? 'PROTECT' : 'ASSIST';
  }

  const rankToLevel = ['OBSERVE', 'ADVISE', 'ASSIST', 'PROTECT'];
  return rankToLevel[effectiveRank] || 'ADVISE';
}

function buildRecommendedActions(catalogEntry, level) {
  const actions = [];
  if (catalogEntry?.recommended_response) {
    actions.push({ type: 'recommendation', text: catalogEntry.recommended_response, level });
  }
  for (const aid of catalogEntry?.assistActions || []) {
    actions.push({ type: 'assist_action', actionId: aid, level: 'ASSIST' });
  }
  return actions;
}

module.exports = {
  LEVEL_RANK,
  resolveRecommendedLevel,
  resolveCatalogId,
  resolveCurrentMode,
  buildRecommendedActions
};
