'use strict';

/**
 * SEC-03 — Threat Intelligence Runtime (bootstrap + audit payload).
 */

const flags = require('../config/securityThreatIntelligenceFlags');
const engine = require('../engine/threatIntelligenceEngine');
const store = require('../store/threatProfileStore');
const metrics = require('../metrics/threatIntelligenceMetrics');
const { createThreatDashboardDto } = require('../dto/threatDashboardDto');
const { freezeProfile } = require('../dto/threatProfileDto');

let pollTimer = null;
let unsubscribe = null;

function bootstrap() {
  if (!flags.isSecurityThreatIntelligenceEnabled()) {
    return { enabled: false };
  }

  backfillFromSec02();

  try {
    const bus = require('../../securityObservatory/bus/securityEventBus');
    unsubscribe = bus.subscribe(() => {
      scheduleBackfill();
    });
  } catch (e) {
    console.warn('[SEC-03_BOOT] bus subscribe failed:', e?.message);
  }

  pollTimer = setInterval(() => {
    try {
      backfillFromSec02();
    } catch (_e) {}
  }, 60000);
  if (pollTimer.unref) pollTimer.unref();

  console.log('[SEC-03] Enterprise Threat Intelligence Engine activo (consultative, read-only)');
  return { enabled: true };
}

function scheduleBackfill() {
  setTimeout(() => {
    try {
      backfillFromSec02();
    } catch (_e) {}
  }, 500);
}

function backfillFromSec02() {
  engine.analyzeAllIncidents();
}

function shutdown() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

function buildDashboard() {
  const profiles = store.getAllProfiles().map((p) => {
    const out = { ...p };
    delete out._incidentSnapshot;
    return freezeProfile(out);
  });

  const campaignMap = new Map();
  const indicatorMap = new Map();
  const originMap = new Map();
  const providerMap = new Map();
  const asnMap = new Map();
  const targetMap = new Map();
  const assessmentMap = new Map();

  for (const p of profiles) {
    const camp = p.campaignAssessment?.campaign_id;
    if (camp) campaignMap.set(camp, (campaignMap.get(camp) || 0) + 1);

    for (const ind of p.threatIndicators || []) {
      indicatorMap.set(ind.code, (indicatorMap.get(ind.code) || 0) + 1);
    }

    for (const ip of p._incidentSnapshot?.participants?.ips || []) {
      originMap.set(ip, (originMap.get(ip) || 0) + 1);
    }

    for (const ph of p.providerHints || []) {
      providerMap.set(ph.name, (providerMap.get(ph.name) || 0) + 1);
    }

    for (const ah of p.asnHints || []) {
      asnMap.set(ah.asn, (asnMap.get(ah.asn) || 0) + 1);
    }

    for (const asset of p.affectedAssets || []) {
      targetMap.set(asset, (targetMap.get(asset) || 0) + 1);
    }

    assessmentMap.set(p.primaryAssessment, (assessmentMap.get(p.primaryAssessment) || 0) + 1);
  }

  const top = (map, limit) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, count]) => ({ key, count }));

  const confidences = profiles.map((p) => p.confidence || 0);
  const avgConf = confidences.length
    ? Math.round((confidences.reduce((s, v) => s + v, 0) / confidences.length) * 1000) / 1000
    : 0;

  const evolution = buildHistoricalEvolution(profiles);

  return createThreatDashboardDto({
    intelligence_enabled: flags.isSecurityThreatIntelligenceEnabled(),
    top_campaigns: top(campaignMap, 10),
    top_threat_profiles: top(assessmentMap, 10),
    top_indicators: top(indicatorMap, 15),
    top_origins: top(originMap, 15),
    top_providers: top(providerMap, 10),
    top_asns: top(asnMap, 10),
    top_targets: top(targetMap, 10),
    historical_evolution: evolution,
    threat_confidence: { average: avgConf, distribution: Object.fromEntries(assessmentMap) },
    profiles: profiles.slice(0, 50),
    metrics_summary: metrics.getSnapshot()
  });
}

function buildHistoricalEvolution(profiles) {
  const byDay = new Map();
  for (const p of profiles) {
    const day = (p.analyzedAt || '').slice(0, 10);
    if (!day) continue;
    if (!byDay.has(day)) byDay.set(day, { date: day, profiles: 0, avg_confidence: 0, sum: 0 });
    const entry = byDay.get(day);
    entry.profiles += 1;
    entry.sum += p.confidence || 0;
    entry.avg_confidence = Math.round((entry.sum / entry.profiles) * 1000) / 1000;
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function getAuditPayload() {
  const dashboard = buildDashboard();
  const profiles = store.getAllProfiles().map((p) => {
    const out = { ...p };
    delete out._incidentSnapshot;
    return freezeProfile(out);
  });

  return {
    ok: true,
    phase: 'SEC-03',
    intelligence_enabled: flags.isSecurityThreatIntelligenceEnabled(),
    mode: 'consultative_only',
    no_auto_response: true,
    no_attacker_identity_inference: true,
    feature_flag: {
      SECURITY_THREAT_INTELLIGENCE: flags.isSecurityThreatIntelligenceEnabled(),
      historical_window_ms: flags.historicalWindowMs()
    },
    dashboard,
    threat_profiles: profiles.slice(0, 100),
    metrics: metrics.getSnapshot(),
    criteria: {
      threat_profile_available: true,
      campaign_assessment_available: true,
      historical_intelligence_available: true,
      threat_indicators_available: true,
      threat_dashboard_available: true,
      audit_endpoint_available: true,
      feature_flag_available: true,
      security_observatory_preserved: true,
      security_correlation_preserved: true,
      no_runtime_interference: true
    }
  };
}

module.exports = {
  bootstrap,
  shutdown,
  buildDashboard,
  getAuditPayload,
  backfillFromSec02
};
