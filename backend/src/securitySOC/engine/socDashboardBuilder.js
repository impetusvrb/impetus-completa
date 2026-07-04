'use strict';

/**
 * SEC-07 — SOC Dashboard Builder (orquestrador read-only).
 */

const flags = require('../config/securitySOCFlags');
const metrics = require('../metrics/socMetrics');
const { createSecuritySOCDto, freezeSOC } = require('../dto/securitySOCDto');
const { createOperationsDashboardDto } = require('../dto/operationsDashboardDto');
const { createExecutiveDashboardDto } = require('../dto/executiveDashboardDto');
const { collectAllModulesData } = require('../engine/socDataCollector');
const {
  computeOverallSecurityScore,
  resolveThreatLevel,
  resolveSocStatus,
  buildGlobalIndicators
} = require('../engine/socScoreCalculator');
const { buildExecutiveTimeline } = require('../engine/executiveTimelineBuilder');
const { buildExecutiveSummary } = require('../engine/executiveSummaryBuilder');

let cache = { payload: null, expires: 0 };

function buildSOC(opts = {}) {
  if (!flags.isSecuritySOCEnabled() && !opts.force) return null;

  const start = Date.now();
  const now = Date.now();

  if (!opts.force && cache.payload && cache.expires > now) {
    return cache.payload;
  }

  metrics.increment('soc_summary_generated');

  const data = collectAllModulesData();
  const overallScore = computeOverallSecurityScore(data);
  const threatLevel = resolveThreatLevel(data);
  const integrityStatus = data.sec04?.lastReport?.integrityStatus || 'UNKNOWN';
  const socStatus = resolveSocStatus(overallScore, threatLevel, integrityStatus);
  const indicators = buildGlobalIndicators(data, overallScore, threatLevel);
  const timeline = buildExecutiveTimeline(data);
  const executiveSummary = buildExecutiveSummary(data, indicators, socStatus);

  const operationalDashboard = buildOperationsDashboard(data);
  const executiveDashboard = buildExecutiveDashboard(data, indicators, socStatus, executiveSummary);

  const recommendedResponses = (data.sec06?.history || []).slice(0, 10).map((r) => ({
    responseId: r.responseId,
    incidentId: r.incidentId,
    mode: r.currentMode,
    level: r.recommendedLevel,
    status: r.executionStatus
  }));

  const dto = createSecuritySOCDto({
    soc_enabled: flags.isSecuritySOCEnabled(),
    socStatus,
    overallSecurityScore: overallScore,
    currentThreatLevel: threatLevel,
    currentIntegrity: {
      status: integrityStatus,
      score: data.sec04?.lastReport?.integrityScore ?? null
    },
    activeIncidents: summarizeIncidents(data.sec02?.open || []),
    resolvedIncidents: summarizeIncidents(data.sec02?.closed || []),
    pendingNotifications: summarizeNotifications(data.sec05?.pending || []),
    recommendedResponses,
    runtimeHealth: {
      processes: data.sec04?.lastReport?.runtimeValidation?.processHealth || {},
      passed: data.sec04?.lastReport?.runtimeValidation?.passed ?? null
    },
    baselineCompliance: {
      passed: data.sec04?.lastReport?.hashValidation?.passed ?? null,
      matched: data.sec04?.lastReport?.hashValidation?.matched ?? null,
      total: data.sec04?.lastReport?.hashValidation?.total ?? null,
      percentage: computeBaselinePct(data)
    },
    timeline,
    executiveSummary,
    globalIndicators: indicators,
    operationalDashboard,
    executiveDashboard,
    modules_snapshot: {
      sec01_enabled: data.sec01?.enabled ?? false,
      sec02_enabled: data.sec02?.enabled ?? false,
      sec03_enabled: data.sec03?.enabled ?? false,
      sec04_enabled: data.sec04?.enabled ?? false,
      sec05_enabled: data.sec05?.enabled ?? false,
      sec06_enabled: data.sec06?.enabled ?? false
    }
  });

  const frozen = freezeSOC(dto);
  cache = { payload: frozen, expires: now + flags.cacheTtlMs() };
  metrics.recordRenderTime(Date.now() - start);

  return frozen;
}

function summarizeIncidents(incidents) {
  return incidents.slice(0, 20).map((i) => ({
    incidentId: i.incidentId,
    severity: i.severity,
    classification: i.classification,
    status: i.status,
    firstSeen: i.firstSeen,
    lastSeen: i.lastSeen,
    requestCount: i.metrics?.requestCount
  }));
}

function summarizeNotifications(notifications) {
  return notifications.slice(0, 20).map((n) => ({
    notificationId: n.notificationId,
    incidentId: n.incidentId,
    severity: n.severity,
    title: n.title,
    acknowledged: n.acknowledged
  }));
}

function computeBaselinePct(data) {
  const hv = data.sec04?.lastReport?.hashValidation;
  if (!hv || !hv.total) return null;
  return Math.round(((hv.matched || 0) / hv.total) * 100);
}

function buildOperationsDashboard(data) {
  return createOperationsDashboardDto({
    active_incidents: summarizeIncidents(data.sec02?.open || []),
    closed_incidents: summarizeIncidents(data.sec02?.closed || []),
    alerts: (data.sec05?.pending || []).filter((n) => n.severity === 'CRITICAL' || n.severity === 'HIGH'),
    notifications: summarizeNotifications(data.sec05?.notifications || []),
    pending_notifications: summarizeNotifications(data.sec05?.pending || []),
    suggested_responses: (data.sec06?.history || []).slice(0, 10),
    health: data.sec04?.lastReport?.runtimeValidation || {},
    integrity: {
      status: data.sec04?.lastReport?.integrityStatus,
      score: data.sec04?.lastReport?.integrityScore,
      findings: (data.sec04?.lastReport?.criticalFindings || []).slice(0, 5)
    },
    baseline: data.sec04?.lastReport?.hashValidation || {},
    observatory_metrics: data.sec01?.audit?.metrics || {},
    correlation_metrics: data.sec02?.metrics || {},
    threat_profiles: (data.sec03?.profiles || []).slice(0, 10).map((p) => ({
      threatProfileId: p.threatProfileId,
      incidentId: p.incidentId,
      primaryAssessment: p.primaryAssessment,
      riskLevel: p.riskLevel
    })),
    response_history: (data.sec06?.history || []).slice(0, 10)
  });
}

function buildExecutiveDashboard(data, indicators, socStatus, summary) {
  const relevant = (data.sec02?.incidents || [])
    .filter((i) => ['CRITICAL', 'HIGH'].includes(i.severity))
    .slice(0, 5)
    .map((i) => summarizeIncidents([i])[0]);

  return createExecutiveDashboardDto({
    kpis: indicators,
    risk: {
      threat_level: indicators.threat_level,
      open_critical: (data.sec02?.open || []).filter((i) => i.severity === 'CRITICAL').length,
      pending_critical: (data.sec05?.pending || []).filter((n) => n.severity === 'CRITICAL').length
    },
    evolution: buildEvolution(data),
    trend: computeTrend(data),
    relevant_incidents: relevant,
    overall_state: socStatus,
    executive_summary: summary,
    threat_level: indicators.threat_level,
    integrity_score: indicators.integrity_score,
    baseline_compliance_pct: computeBaselinePct(data)
  });
}

function buildEvolution(data) {
  const points = [];
  for (const inc of (data.sec02?.closed || []).slice(0, 7)) {
    points.push({ date: (inc.lastSeen || '').slice(0, 10), type: 'incident_closed', severity: inc.severity });
  }
  for (const inc of (data.sec02?.open || []).slice(0, 3)) {
    points.push({ date: (inc.firstSeen || '').slice(0, 10), type: 'incident_open', severity: inc.severity });
  }
  return points.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

function computeTrend(data) {
  const open = (data.sec02?.open || []).length;
  const critical = (data.sec02?.open || []).filter((i) => i.severity === 'CRITICAL').length;
  if (critical > 0) return 'elevating';
  if (open > 2) return 'elevating';
  if (open === 0) return 'stable';
  return 'stable';
}

function invalidateCache() {
  cache = { payload: null, expires: 0 };
}

module.exports = {
  buildSOC,
  buildOperationsDashboard,
  buildExecutiveDashboard,
  invalidateCache
};
