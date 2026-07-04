'use strict';

/**
 * SEC-16 — Threat Deception Engine.
 * Consome SEC-14 e SEC-15 read-only; nunca altera runtime.
 */

const flags = require('../config/securityThreatDeceptionFlags');
const metrics = require('../metrics/threatDeceptionMetrics');
const store = require('../store/threatDeceptionStore');
const collector = require('../collectors/secDeceptionCollector');
const honeypot = require('./honeypotProfileService');
const scenarios = require('./deceptionScenarioService');
const engagement = require('./engagementAnalysisService');
const evidence = require('./deceptionEvidenceService');
const planner = require('./threatDeceptionPlanner');
const { createThreatDeceptionDashboardDto, freezeDto } = require('../dto/threatDeceptionDto');

function getIncidents(context) {
  const open = context?.sec02?.open || [];
  const closed = context?.sec02?.closed || [];
  return [...open, ...closed];
}

function evaluateThreatDeception(opts = {}) {
  const start = Date.now();
  const enabled = flags.isSecurityThreatDeceptionEnabled();
  const context = collector.collectDeceptionContext();
  const incidents = getIncidents(context);
  const sec14Dashboard = context.sec14?.dashboard || null;
  const sec15Dashboard = context.sec15?.dashboard || null;

  const builtScenarios = scenarios.buildScenariosFromContext(incidents, sec15Dashboard);
  const engagementProfile = engagement.analyzeEngagement(
    incidents,
    sec14Dashboard,
    sec15Dashboard,
    builtScenarios
  );
  const evidenceEnrichment = evidence.enrichEvidence(
    incidents,
    builtScenarios,
    engagementProfile,
    sec14Dashboard
  );
  const deceptionPlans = planner.generateDeceptionPlans(
    builtScenarios,
    engagementProfile,
    evidenceEnrichment
  );

  const deceptionStatus = planner.resolveDeceptionStatus(engagementProfile, builtScenarios);
  const topScenario = builtScenarios[0] || null;
  const topPlan = deceptionPlans.find((p) => p.action !== 'no_action') || deceptionPlans[0] || null;

  const dashboard = freezeDto(createThreatDeceptionDashboardDto({
    enabled,
    mode: flags.deceptionMode(),
    deceptionStatus,
    deceptionConfidence: engagementProfile.deceptionConfidence,
    engagementLevel: engagementProfile.engagementLevel,
    fakeResourceRecommended: topScenario?.honeypotProfile?.profileId || topPlan?.fakeResourceRecommended || null,
    evidenceGain: Math.round((evidenceEnrichment.evidenceGain || 0) * 100) / 100,
    recommendedScenario: topScenario?.scenarioType || null,
    approvalRequired: flags.requireApproval(),
    honeypotProfiles: honeypot.getAllProfiles(),
    scenarios: builtScenarios.slice(0, 20),
    engagement: engagementProfile,
    evidence: evidenceEnrichment,
    deceptionPlans: deceptionPlans.slice(0, 20),
    modules_snapshot: {
      sec02: { enabled: context.sec02?.enabled, incidents: incidents.length },
      sec14: { enabled: context.sec14?.enabled },
      sec15: { enabled: context.sec15?.enabled }
    },
    metrics: metrics.getSnapshot()
  }));

  store.setLastDashboard(dashboard);
  metrics.increment('evaluations');
  metrics.recordEvaluationTime(Date.now() - start);

  return dashboard;
}

module.exports = { evaluateThreatDeception, getIncidents };
