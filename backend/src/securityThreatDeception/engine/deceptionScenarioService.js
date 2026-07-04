'use strict';

/**
 * SEC-16 — Deception Scenario Engine.
 * Cada cenário produz apenas um plano certificado.
 */

const store = require('../store/threatDeceptionStore');
const metrics = require('../metrics/threatDeceptionMetrics');
const honeypot = require('./honeypotProfileService');

const SCENARIO_TYPES = Object.freeze([
  'scanner_seeks_env',
  'scanner_seeks_git',
  'admin_enumeration',
  'api_discovery',
  'backup_hunting',
  'login_bruteforce'
]);

const SCENARIO_MAP = {
  scanner_seeks_env: {
    type: 'scanner_seeks_env',
    title: 'Scanner procura .env',
    profileId: 'fake_env',
    triggerClassifications: ['PATH_ENUMERATION', 'CREDENTIAL_SCAN'],
    pathPatterns: ['.env']
  },
  scanner_seeks_git: {
    type: 'scanner_seeks_git',
    title: 'Scanner procura .git',
    profileId: 'fake_git',
    triggerClassifications: ['PATH_ENUMERATION', 'RECONNAISSANCE'],
    pathPatterns: ['.git']
  },
  admin_enumeration: {
    type: 'admin_enumeration',
    title: 'Enumeração de /admin',
    profileId: 'fake_admin',
    triggerClassifications: ['PATH_ENUMERATION', 'API_PROBE'],
    pathPatterns: ['/admin']
  },
  api_discovery: {
    type: 'api_discovery',
    title: 'Descoberta de APIs',
    profileId: 'fake_api',
    triggerClassifications: ['API_ENUMERATION', 'API_PROBE'],
    pathPatterns: ['/api/']
  },
  backup_hunting: {
    type: 'backup_hunting',
    title: 'Procura por backups',
    profileId: 'fake_backup',
    triggerClassifications: ['PATH_ENUMERATION', 'GENERIC_SCAN'],
    pathPatterns: ['backup', '.sql']
  },
  login_bruteforce: {
    type: 'login_bruteforce',
    title: 'Brute-force em login',
    profileId: 'fake_admin',
    triggerClassifications: ['CREDENTIAL_SCAN', 'BRUTEFORCE'],
    pathPatterns: ['login', 'auth']
  }
};

function incidentMatchesScenario(incident, scenario) {
  if (scenario.triggerClassifications.includes(incident.classification)) return true;
  const endpoints = (incident.affectedComponents || []).map((e) => String(e).toLowerCase());
  return scenario.pathPatterns.some((pat) =>
    endpoints.some((ep) => ep.includes(pat.toLowerCase()))
  );
}

function buildScenarioFromTemplate(template, incident) {
  const profile = honeypot.getProfile(template.profileId);
  const scenario = {
    schema_version: 'deception_scenario_v1',
    scenarioId: `scn-${template.type}-${incident?.incidentId || Date.now()}`,
    scenarioType: template.type,
    title: template.title,
    incidentId: incident?.incidentId || null,
    honeypotProfile: profile,
    planOnly: true,
    deployed: false,
    auto_execute: false,
    description: `Cenário certificado — ${template.title}`,
    createdAt: new Date().toISOString()
  };
  store.setScenario(scenario.scenarioId, scenario);
  metrics.increment('deception_candidates');
  return scenario;
}

function buildScenariosFromContext(incidents, sec15Dashboard) {
  const built = [];
  const seen = new Set();

  for (const inc of incidents || []) {
    for (const template of Object.values(SCENARIO_MAP)) {
      if (!incidentMatchesScenario(inc, template)) continue;
      const key = `${template.type}:${inc.incidentId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      built.push(buildScenarioFromTemplate(template, inc));
    }
  }

  if (sec15Dashboard?.scannerDetected && built.length === 0) {
    built.push(buildScenarioFromTemplate(SCENARIO_MAP.scanner_seeks_env, null));
  }

  return built;
}

module.exports = {
  SCENARIO_TYPES,
  SCENARIO_MAP,
  incidentMatchesScenario,
  buildScenarioFromTemplate,
  buildScenariosFromContext
};
