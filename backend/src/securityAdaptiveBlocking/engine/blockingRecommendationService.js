'use strict';

/**
 * SEC-14 — Blocking Recommendation Service.
 * Sempre auto_execute: false.
 */

const store = require('../store/adaptiveBlockingStore');
const metrics = require('../metrics/adaptiveBlockingMetrics');
const flags = require('../config/securityAdaptiveBlockingFlags');

const RECOMMENDATION_TYPES = Object.freeze([
  'temporary_quarantine',
  'temporary_rate_limit',
  'challenge',
  'manual_review',
  'no_action'
]);

function mapStateToRecommendation(blacklistState, rep, behaviorScore) {
  switch (blacklistState) {
    case 'BLOCK_CANDIDATE':
      return {
        action: 'temporary_quarantine',
        reason: `Reputação crítica (${rep?.reputationScore}) com recorrência ${rep?.recurrence}`,
        priority: 'HIGH'
      };
    case 'QUARANTINE':
      return {
        action: 'temporary_quarantine',
        reason: `Score de reputação ${rep?.reputationScore} e behavior ${Math.round(behaviorScore * 100)}%`,
        priority: 'HIGH'
      };
    case 'WATCHLIST':
      return {
        action: 'temporary_rate_limit',
        reason: 'Comportamento suspeito em observação — rate limit recomendado',
        priority: 'MEDIUM'
      };
    case 'MANUAL_REVIEW':
      return {
        action: 'manual_review',
        reason: 'Evidências insuficientes para contenção automática',
        priority: 'MEDIUM'
      };
    case 'OBSERVED':
      if (behaviorScore >= 0.4) {
        return {
          action: 'challenge',
          reason: 'Padrão de probing detectado — challenge recomendado',
          priority: 'LOW'
        };
      }
      return {
        action: 'no_action',
        reason: 'Observação contínua — sem contenção nesta fase',
        priority: 'LOW'
      };
    default:
      return {
        action: 'no_action',
        reason: 'Comportamento dentro dos limites normais',
        priority: 'INFO'
      };
  }
}

function createRecommendation(ip, rep, blacklistEntry, behaviorScore, fingerprint) {
  const mapped = mapStateToRecommendation(blacklistEntry?.state || 'NORMAL', rep, behaviorScore);
  const rec = {
    schema_version: 'blocking_recommendation_v1',
    recommendationId: `rec-${Date.now()}-${String(ip || 'unknown').replace(/\./g, '-')}`,
    ip,
    action: mapped.action,
    recommendationReason: mapped.reason,
    priority: mapped.priority,
    reputationScore: rep?.reputationScore ?? null,
    behaviorScore: behaviorScore ?? null,
    fingerprintConfidence: fingerprint?.fingerprintConfidence ?? null,
    blacklistState: blacklistEntry?.state || 'NORMAL',
    auto_execute: false,
    executionAllowed: false,
    approvalRequired: flags.requireApproval(),
    blockingMode: flags.blockingMode(),
    disclaimer: 'Recomendação only — SEC-14 não executa bloqueio, rate limit ou challenge',
    createdAt: new Date().toISOString()
  };

  store.addRecommendation(rec);
  metrics.increment('blocking_recommendations');
  return rec;
}

function generateRecommendations(reputations, blacklistEntries, fingerprints, behaviorByIp) {
  const fpByIp = new Map();
  for (const fp of fingerprints || []) {
    if (fp.ip) fpByIp.set(fp.ip, fp);
  }
  const blByIp = new Map((blacklistEntries || []).map((e) => [e.ip, e]));

  return (reputations || []).map((rep) => {
    const behaviorScore = behaviorByIp?.get(rep.ip)?.behaviorScore ?? 0;
    return createRecommendation(
      rep.ip,
      rep,
      blByIp.get(rep.ip),
      behaviorScore,
      fpByIp.get(rep.ip)
    );
  });
}

module.exports = {
  RECOMMENDATION_TYPES,
  mapStateToRecommendation,
  createRecommendation,
  generateRecommendations
};
