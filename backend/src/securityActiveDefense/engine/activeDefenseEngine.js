'use strict';

/**
 * SEC-10 — Active Defense Engine.
 * Consome SEC-02→07 read-only; produz Defense Recommendations apenas.
 */

const flags = require('../config/securityActiveDefenseFlags');
const metrics = require('../metrics/activeDefenseMetrics');
const store = require('../store/activeDefenseStore');
const { collectSecModulesData } = require('../collectors/secModuleCollector');
const threatPatterns = require('./threatPatternService');
const escalation = require('./attackEscalationService');
const surface = require('./adaptiveSurfaceProtection');
const modeManager = require('./securityModeManager');
const operatorPkg = require('../notification/operatorNotificationPackage');
const adapters = require('../notification/adapters/notificationAdapters');
const {
  createDefenseRecommendationDto,
  createActiveDefenseDashboardDto,
  freezeDto
} = require('../dto/activeDefenseDto');

function matchProfile(incidentId, profiles) {
  return (profiles || []).find((p) => p.incidentId === incidentId) || null;
}

function buildTimeline(incidents, notifications) {
  const events = [];
  for (const inc of incidents || []) {
    events.push({
      ts: inc.lastSeen || inc.firstSeen,
      type: 'INCIDENT',
      label: `${inc.severity} ${inc.classification}`,
      incidentId: inc.incidentId
    });
  }
  for (const n of (notifications || []).slice(0, 10)) {
    events.push({
      ts: n.createdAt || n.timestamp,
      type: 'NOTIFICATION',
      label: n.title || n.type,
      notificationId: n.notificationId
    });
  }
  return events.sort((a, b) => String(b.ts).localeCompare(String(a.ts))).slice(0, 50);
}

function buildRecommendations(openIncidents, profiles, threatLevel, patterns, integrity) {
  const recs = [];
  const surfaceActions = surface.buildRecommendedActions(
    threatLevel,
    patterns,
    integrity?.integrityStatus || integrity?.status
  );

  for (const inc of openIncidents.slice(0, 10)) {
    const profile = matchProfile(inc.incidentId, profiles);
    const incPatterns = threatPatterns.detectPatternsFromIncident(inc);
    metrics.increment('attack_patterns_detected', incPatterns.length);

    const rec = createDefenseRecommendationDto({
      incidentId: inc.incidentId,
      priority: inc.severity === 'CRITICAL' ? 'CRITICAL' : threatLevel,
      attackPattern: incPatterns[0] || 'Reconnaissance',
      threatLevel,
      securityMode: modeManager.resolveModeFromThreatLevel(threatLevel),
      title: `Defense Recommendation — ${inc.classification}`,
      summary: inc.summary || `Incidente ${inc.incidentId} — análise consultiva SEC-10`,
      recommended_actions: surfaceActions,
      evidence_refs: (inc.evidence || []).slice(0, 5).map((e) => e.ref || e),
      threatScore: profile?.confidence ?? inc.confidence ?? 0,
      riskScore: inc.riskScore ?? 0,
      integrityStatus: integrity?.integrityStatus || integrity?.status || 'UNKNOWN'
    });
    recs.push(rec);
    store.addRecommendation(rec);
    metrics.increment('active_defense_recommendations');
  }

  if (recs.length === 0 && threatLevel !== 'LOW') {
    recs.push(createDefenseRecommendationDto({
      priority: threatLevel,
      attackPattern: patterns[0]?.pattern || 'Reconnaissance',
      threatLevel,
      securityMode: modeManager.resolveModeFromThreatLevel(threatLevel),
      title: 'Defense Recommendation — Ecossistema',
      summary: 'Recomendação agregada sem incidente aberto específico',
      recommended_actions: surfaceActions,
      threatScore: 0,
      riskScore: 0,
      integrityStatus: integrity?.integrityStatus || 'UNKNOWN'
    }));
  }

  return recs;
}

function evaluateDefense(opts = {}) {
  if (!flags.isSecurityActiveDefenseEnabled() && !opts.force) return null;

  const start = Date.now();
  metrics.increment('active_defense_events');
  metrics.increment('evaluations');

  const data = collectSecModulesData();
  const openIncidents = data.sec02?.open || [];
  const closedIncidents = data.sec02?.closed || [];
  const profiles = data.sec03?.profiles || [];
  const integrity = data.sec04?.lastReport || {};
  const notifications = data.sec05?.notifications || [];
  const sec06History = data.sec06?.history || [];

  const patterns = threatPatterns.detectPatternsFromIncidents(openIncidents);
  const campaigns = threatPatterns.detectCampaigns([...openIncidents, ...closedIncidents]);
  for (const c of campaigns) {
    store.upsertCampaign(c.campaignId, c);
    if (c.persistent || c.repeated) metrics.increment('campaigns_detected');
  }

  if (patterns.some((p) => p.pattern === 'Distributed Scanner')) {
    metrics.increment('distributed_scans');
  }

  const escalationResult = escalation.escalateThreatLevel(
    openIncidents,
    closedIncidents,
    patterns,
    integrity
  );
  const threatLevel = escalationResult.level;
  if (threatLevel === 'CRITICAL') metrics.increment('critical_incidents');

  const logicalMode = modeManager.resolveModeFromThreatLevel(threatLevel);
  const modeChange = store.setCurrentMode(logicalMode, `threat_level_${threatLevel}`);
  if (modeChange) {
    metrics.increment('defense_state_changes');
    metrics.increment('active_defense_modes');
  }

  const recommendations = buildRecommendations(
    openIncidents,
    profiles,
    threatLevel,
    patterns,
    integrity
  );

  const primaryIncident = openIncidents[0] || null;
  const primaryProfile = primaryIncident
    ? matchProfile(primaryIncident.incidentId, profiles)
    : null;

  const operatorPackages = operatorPkg.preparePackagesForOperators({
    incident: primaryIncident,
    profile: primaryProfile,
    threatLevel,
    patterns,
    recommendations,
    integrity: {
      status: integrity.integrityStatus || 'UNKNOWN',
      score: integrity.integrityScore ?? null
    },
    timeline: buildTimeline(openIncidents, notifications),
    campaign: campaigns[0] || null
  });

  const preparedNotifications = adapters.prepareAllAdapters(operatorPackages);

  const dashboard = createActiveDefenseDashboardDto({
    active_defense_enabled: flags.isSecurityActiveDefenseEnabled(),
    defense_mode: flags.activeDefenseMode(),
    currentMode: store.getCurrentMode(),
    threatLevel,
    attackPatterns: patterns,
    integrity: {
      status: integrity.integrityStatus || 'UNKNOWN',
      score: integrity.integrityScore ?? null
    },
    notifications: {
      pending: (data.sec05?.pending || []).slice(0, 10),
      prepared: preparedNotifications
    },
    recommendations,
    evidence: {
      incidents: openIncidents.slice(0, 10).map((i) => ({
        incidentId: i.incidentId,
        severity: i.severity
      })),
      campaigns
    },
    timeline: buildTimeline(openIncidents, notifications),
    operatorPackages,
    modules_snapshot: {
      sec01: data.sec01?.enabled ?? false,
      sec02: data.sec02?.enabled ?? false,
      sec03: data.sec03?.enabled ?? false,
      sec04: data.sec04?.enabled ?? false,
      sec05: data.sec05?.enabled ?? false,
      sec06: data.sec06?.enabled ?? false,
      sec07: data.sec07?.enabled ?? false,
      sec06_responses: sec06History.length
    },
    metrics: {
      escalation: escalationResult,
      ...metrics.getSnapshot()
    }
  });

  store.recordEvaluation({ threatLevel, patterns, recommendations });
  store.setLastDashboard(dashboard);
  metrics.recordEvaluationTime(Date.now() - start);

  return freezeDto(dashboard);
}

module.exports = {
  evaluateDefense,
  buildRecommendations,
  buildTimeline
};
