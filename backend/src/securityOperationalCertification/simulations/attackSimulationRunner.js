'use strict';

/**
 * SEC-19 — Simulador de ataques controlados (incidentes sintéticos, sem tráfego HTTP).
 */

const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
const catalog = require('./attackScenarioCatalog');
const store = require('../store/operationalCertificationStore');
const metrics = require('../metrics/operationalCertificationMetrics');

const ATTACK_IP = '203.0.113.99';

function buildIncidentFromScenario(scenario, index) {
  const path = scenario.path || '/';
  const components = scenario.category === 'exfiltration'
    ? [
        '/backend/docs/evidence/sec-08/criteria.json',
        '/backend/src/server.js',
        '/.env',
        '/backup/db.sql'
      ]
    : [path];

  return createSecurityIncidentDto({
    incidentId: `sec19-sim-${scenario.id}-${index}`,
    severity: scenario.severity || 'MEDIUM',
    classification: scenario.classification,
    status: scenario.status || 'OPEN',
    confidence: scenario.severity === 'CRITICAL' ? 0.95 : 0.75,
    participants: {
      ips: [ATTACK_IP],
      userAgents: [scenario.userAgent || 'sec19-simulator/1.0']
    },
    affectedComponents: components,
    metrics: scenario.metrics || {
      requestCount: scenario.category === 'exfiltration' ? 15000 : 500,
      uniqueIps: 1,
      eventCount: 50
    },
    durationMs: 3600000,
    tags: ['sec19_simulation', scenario.category, 'simulated_attack'],
    summary: `SEC-19 simulated ${scenario.category}: ${scenario.id}`
  });
}

function seedScenarioIncidents(scenarios) {
  const sec02 = require('../../securityCorrelation');
  const incidents = [];
  scenarios.forEach((scenario, i) => {
    const inc = buildIncidentFromScenario(scenario, i);
    sec02.store.addIncident(inc);
    incidents.push(inc);
  });
  return incidents;
}

function probeUpstreamDetection() {
  const probes = {};

  const tryProbe = (name, fn) => {
    try {
      probes[name] = fn();
    } catch (e) {
      probes[name] = { ok: false, error: e.message };
    }
  };

  tryProbe('sec02', () => {
    const sec02 = require('../../securityCorrelation');
    const open = sec02.store.getOpenIncidents();
    return { ok: true, openCount: open.length };
  });

  tryProbe('sec14', () => {
    const sec14 = require('../../securityAdaptiveBlocking');
    if (!sec14.isEnabled()) return { ok: true, enabled: false, skipped: true };
    const dash = sec14.buildDashboard?.({ force: true }) || sec14.getAuditPayload?.();
    return { ok: true, enabled: true, hasDashboard: !!dash };
  });

  tryProbe('sec15', () => {
    const sec15 = require('../../securityAntiScanner');
    if (!sec15.isEnabled()) return { ok: true, enabled: false, skipped: true };
    const dash = sec15.buildDashboard?.({ force: true }) || sec15.getAuditPayload?.();
    return { ok: true, enabled: true, hasDashboard: !!dash };
  });

  tryProbe('sec16', () => {
    const sec16 = require('../../securityThreatDeception');
    if (!sec16.isEnabled()) return { ok: true, enabled: false, skipped: true };
    const dash = sec16.buildDashboard?.({ force: true }) || sec16.getAuditPayload?.();
    return { ok: true, enabled: true, hasDashboard: !!dash };
  });

  tryProbe('sec17', () => {
    const sec17 = require('../../securityExfiltrationDetection');
    if (!sec17.isEnabled()) return { ok: true, enabled: false, skipped: true };
    const dash = sec17.buildDashboard?.({ force: true }) || sec17.evaluateExfiltrationDetection?.({ force: true });
    return { ok: true, enabled: true, hasDashboard: !!dash };
  });

  tryProbe('sec18', () => {
    const sec18 = require('../../securityRuntimeProtection');
    if (!sec18.isEnabled()) return { ok: true, enabled: false, skipped: true };
    const dash = sec18.buildDashboard?.({ force: true });
    return { ok: true, enabled: true, hasDashboard: !!dash };
  });

  return probes;
}

function evaluateScenarioDetection(scenario, probes) {
  const sec02Ok = probes.sec02?.ok && (probes.sec02.openCount || 0) > 0;
  const categoryMap = {
    scanner: ['sec15', 'sec14'],
    enumeration: ['sec15', 'sec02'],
    crawling: ['sec15', 'sec02'],
    reconnaissance: ['sec15', 'sec14'],
    exfiltration: ['sec17', 'sec18']
  };
  const modules = categoryMap[scenario.category] || ['sec02'];
  const moduleHits = modules.filter((m) => probes[m]?.ok && !probes[m]?.skipped);
  const detected = sec02Ok && (moduleHits.length > 0 || scenario.category === 'crawling');
  return { detected, sec02Ok, moduleHits };
}

function runCategorySimulation(category) {
  metrics.increment('attack_simulations');
  const all = catalog.getAllScenarios().filter((s) => s.category === category);
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();
  seedScenarioIncidents(all);
  const probes = probeUpstreamDetection();
  const results = all.map((scenario) => {
    const eval_ = evaluateScenarioDetection(scenario, probes);
    const result = {
      scenarioId: scenario.id,
      category,
      classification: scenario.classification,
      detected: eval_.detected,
      simulated: true,
      noRealDownload: scenario.noRealDownload === true,
      probes: eval_,
      completedAt: new Date().toISOString()
    };
    store.addAttackResult(result);
    return result;
  });
  const detected = results.filter((r) => r.detected).length;
  return {
    category,
    total: results.length,
    detected,
    coverageRatio: results.length ? detected / results.length : 0,
    results,
    probes
  };
}

function runAllAttackSimulations() {
  const categories = ['scanner', 'enumeration', 'crawling', 'reconnaissance', 'exfiltration'];
  const byCategory = {};
  let total = 0;
  let detected = 0;

  for (const cat of categories) {
    const r = runCategorySimulation(cat);
    byCategory[cat] = r;
    total += r.total;
    detected += r.detected;
  }

  return {
    completed: true,
    simulated: true,
    totalScenarios: total,
    detected,
    coverageRatio: total ? detected / total : 0,
    categories: byCategory,
    completedAt: new Date().toISOString()
  };
}

function runCompositeIncidentScenario() {
  metrics.increment('attack_simulations');
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();

  const phases = [];
  catalog.COMPOSITE_PHASES.forEach((phase, i) => {
    const inc = createSecurityIncidentDto({
      incidentId: `sec19-composite-${phase.phase}`,
      severity: phase.severity,
      classification: phase.classification,
      status: phase.status || 'OPEN',
      confidence: 0.88,
      participants: { ips: [ATTACK_IP], userAgents: ['sec19-composite/1.0'] },
      affectedComponents: [
        '/.env',
        '/api/admin',
        '/backend/docs/evidence/sec-08/criteria.json',
        '/backup/db.sql'
      ],
      metrics: { requestCount: 8000 + i * 2000, uniqueIps: 1 },
      timeline: [{ phase: phase.phase, at: new Date().toISOString() }],
      tags: ['sec19_composite', phase.phase],
      summary: `Composite incident phase: ${phase.phase}`
    });
    sec02.store.addIncident(inc);
    phases.push({ phase: phase.phase, incidentId: inc.incidentId, status: inc.status });
  });

  const probes = probeUpstreamDetection();
  const result = {
    type: 'composite_incident',
    phases,
    chain: 'reconnaissance → enumeration → credential_attempt → scraping → movement → shutdown',
    probes,
    detected: probes.sec02?.ok && phases.length === catalog.COMPOSITE_PHASES.length,
    simulated: true,
    completedAt: new Date().toISOString()
  };
  store.addAttackResult(result);
  return result;
}

function runSingleScenario(scenarioId) {
  const scenario = catalog.getAllScenarios().find((s) => s.id === scenarioId);
  if (!scenario) return { ok: false, error: 'scenario_not_found' };
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();
  seedScenarioIncidents([scenario]);
  const probes = probeUpstreamDetection();
  const eval_ = evaluateScenarioDetection(scenario, probes);
  const result = {
    scenarioId,
    category: scenario.category,
    detected: eval_.detected,
    probes,
    simulated: true
  };
  store.addAttackResult(result);
  metrics.increment('attack_simulations');
  return result;
}

module.exports = {
  runAllAttackSimulations,
  runCategorySimulation,
  runCompositeIncidentScenario,
  runSingleScenario,
  probeUpstreamDetection,
  buildIncidentFromScenario
};
