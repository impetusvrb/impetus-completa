'use strict';

/**
 * APPSEC-02A — Operational Readiness Orchestrator
 * Gera evidências formais em docs/evidence/appsec-02a/
 */

const fs = require('fs');
const path = require('path');
const { generateSecretCleanupReport } = require('./secretCleanupEngine');
const { validateRuntimeConfigurationReadiness } = require('./runtimeConfigurationReadiness');
const { generateDependencyUpgradePlan } = require('./dependencyUpgradePlanner');
const { validateRestartReadiness } = require('./runtimeRestartValidator');
const { generateConfidenceReport } = require('./confidenceLevelEngine');
const { evaluateExternalRedTeamReadiness } = require('./externalRedTeamReadiness');

const EVIDENCE_DIR = path.join(__dirname, '../../docs/evidence/appsec-02a');

/**
 * @param {object} [options]
 */
async function buildOperationalReadinessBundle(options = {}) {
  const repoRoot = options.repoRoot || path.join(__dirname, '../../..');
  const backendRoot = path.join(repoRoot, 'backend');
  const started = Date.now();

  const secret_cleanup = generateSecretCleanupReport({ backendRoot });
  const runtime_config = validateRuntimeConfigurationReadiness({ repoRoot });
  const dependency_plan = generateDependencyUpgradePlan(repoRoot);
  const restart_validation = await validateRestartReadiness(options);

  let appsec02_validation = null;
  try {
    const appsec02 = require('../securityApplicationValidation');
    appsec02_validation = await appsec02.runValidation({ persist: false, backendRoot });
  } catch (e) {
    appsec02_validation = { error: e.message, decision: 'UNKNOWN' };
  }

  const operational = { secret_cleanup, runtime_config };
  const confidence_level = generateConfidenceReport(appsec02_validation, operational);

  const bundle = {
    schema_version: 'appsec_02a_bundle_v1',
    program: 'APPSEC-02A',
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - started,
    secret_cleanup,
    runtime_config,
    dependency_plan,
    restart_validation,
    appsec02_validation,
    confidence_level,
    residual_risk_level: appsec02_validation?.scores?.residual_risk || 'medium',
    unsafe_acknowledged: options.unsafe_acknowledged === true
  };

  bundle.external_redteam_readiness = evaluateExternalRedTeamReadiness(bundle);

  if (options.persist !== false) {
    bundle.evidence_paths = persistEvidence(bundle);
  }

  return bundle;
}

function persistEvidence(bundle) {
  const paths = [];
  try {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const write = (name, data) => {
      const p = path.join(EVIDENCE_DIR, name);
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
      paths.push(p);
      return p;
    };
    write('secret-cleanup-report.json', bundle.secret_cleanup);
    write('runtime-readiness.json', bundle.runtime_config);
    write('dependency-plan.json', bundle.dependency_plan);
    write('restart-validation.json', bundle.restart_validation);
    write('confidence-level.json', bundle.confidence_level);
    write('external-redteam-readiness.json', bundle.external_redteam_readiness);
    write('appsec02-rerun.json', {
      decision: bundle.appsec02_validation?.decision,
      scores: bundle.appsec02_validation?.scores,
      comparison_summary: bundle.appsec02_validation?.scores?.comparison_summary
    });
    const latest = path.join(EVIDENCE_DIR, 'readiness-latest.json');
    fs.writeFileSync(latest, JSON.stringify(bundle, null, 2));
    paths.push(latest);
  } catch (e) {
    console.warn('[APPSEC-02A] persist:', e.message);
  }
  return paths;
}

function getLatestBundleSync() {
  const p = path.join(EVIDENCE_DIR, 'readiness-latest.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

module.exports = {
  EVIDENCE_DIR,
  buildOperationalReadinessBundle,
  getLatestBundleSync
};
