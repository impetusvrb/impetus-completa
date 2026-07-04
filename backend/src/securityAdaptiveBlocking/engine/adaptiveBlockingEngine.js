'use strict';

/**
 * SEC-14 — Adaptive Blocking Engine.
 * Consome incidentes certificados SEC-01→13; nunca modifica runtime.
 */

const flags = require('../config/securityAdaptiveBlockingFlags');
const metrics = require('../metrics/adaptiveBlockingMetrics');
const store = require('../store/adaptiveBlockingStore');
const collector = require('../collectors/secBlockingCollector');
const reputation = require('./reputationService');
const behavior = require('./behaviorAnalysisService');
const fingerprint = require('./fingerprintService');
const blacklist = require('./adaptiveBlacklistService');
const recommendations = require('./blockingRecommendationService');
const { createAdaptiveBlockingDashboardDto, freezeDto } = require('../dto/adaptiveBlockingDto');

function getCertifiedIncidents(context) {
  const open = context?.sec02?.open || [];
  const closed = context?.sec02?.closed || [];
  return [...open, ...closed].filter((inc) =>
    inc.status === 'OPEN' || inc.status === 'CLOSED' || inc.status === 'CERTIFIED'
  );
}

function aggregateBehaviorByIp(behaviorProfiles, incidents) {
  const byIp = new Map();
  for (const inc of incidents || []) {
    const profile = behaviorProfiles.find((p) => p.incidentId === inc.incidentId);
    if (!profile) continue;
    for (const ip of inc.participants?.ips || []) {
      const prev = byIp.get(ip);
      if (!prev || profile.behaviorScore > prev.behaviorScore) {
        byIp.set(ip, profile);
      }
    }
  }
  return byIp;
}

function computeAggregateBlockingLevel(reputations, blacklistSummary) {
  const byState = blacklistSummary?.byState || {};
  if ((byState.BLOCK_CANDIDATE || 0) > 0) return 'BLOCK_CANDIDATE';
  if ((byState.QUARANTINE || 0) > 0) return 'QUARANTINE';
  if ((byState.WATCHLIST || 0) > 0) return 'WATCHLIST';
  if ((byState.MANUAL_REVIEW || 0) > 0) return 'MANUAL_REVIEW';
  if ((byState.OBSERVED || 0) > 0) return 'OBSERVED';
  if (reputations.length && reputations.some((r) => r.reputationScore < 80)) return 'OBSERVED';
  return 'NORMAL';
}

function evaluateAdaptiveBlocking(opts = {}) {
  const start = Date.now();
  const enabled = flags.isSecurityAdaptiveBlockingEnabled();
  const context = collector.collectBlockingContext();
  const incidents = getCertifiedIncidents(context);

  const behaviorProfiles = behavior.analyzeAllBehaviors(incidents);
  const behaviorScore = behavior.aggregateBehaviorScore(behaviorProfiles);
  const behaviorByIp = aggregateBehaviorByIp(behaviorProfiles, incidents);

  const reputations = reputation.buildAllReputations(incidents);
  const fingerprints = fingerprint.buildFingerprintsForIncidents(incidents, behaviorProfiles);
  const blacklistEntries = blacklist.syncBlacklistFromReputations(reputations, behaviorByIp);
  const blacklistSummary = blacklist.getBlacklistSummary();
  const recs = recommendations.generateRecommendations(
    reputations,
    blacklistEntries,
    fingerprints,
    behaviorByIp
  );

  const blockingStatus = computeAggregateBlockingLevel(reputations, blacklistSummary);
  const topRec = recs.find((r) => r.action !== 'no_action') || recs[0] || null;
  const avgRep = reputations.length
    ? reputations.reduce((s, r) => s + r.reputationScore, 0) / reputations.length
    : 100;
  const avgFpConf = fingerprints.length
    ? fingerprints.reduce((s, f) => s + (f.fingerprintConfidence || 0), 0) / fingerprints.length
    : 0;

  const dashboard = freezeDto(createAdaptiveBlockingDashboardDto({
    enabled,
    blocking_mode: flags.blockingMode(),
    require_approval: flags.requireApproval(),
    blockingStatus,
    reputationScore: Math.round(avgRep),
    behaviorScore: Math.round(behaviorScore * 100) / 100,
    fingerprintConfidence: Math.round(avgFpConf * 100) / 100,
    recommendedAction: topRec?.action || 'no_action',
    recommendationReason: topRec?.recommendationReason || 'Sem incidentes certificados',
    executionAllowed: false,
    approvalRequired: flags.requireApproval(),
    reputations: reputations.slice(0, 20),
    blacklistSummary,
    behaviorProfiles: behaviorProfiles.slice(0, 20),
    fingerprints: fingerprints.slice(0, 20),
    recommendations: recs.slice(0, 20),
    modules_snapshot: {
      sec02: { enabled: context.sec02?.enabled, incidents: incidents.length },
      sec03: { enabled: context.sec03?.enabled, profiles: context.sec03?.profiles?.length || 0 },
      sec07: { enabled: context.sec07?.enabled },
      sec10: { enabled: context.sec10?.enabled },
      sec11: { enabled: context.sec11?.enabled },
      sec12: { enabled: context.sec12?.enabled }
    },
    metrics: metrics.getSnapshot()
  }));

  store.setLastDashboard(dashboard);
  metrics.increment('evaluations');
  metrics.recordEvaluationTime(Date.now() - start);

  if (opts.force !== false && enabled) {
    metrics.increment('adaptive_blocking_events');
  }

  return dashboard;
}

module.exports = {
  evaluateAdaptiveBlocking,
  getCertifiedIncidents,
  computeAggregateBlockingLevel
};
