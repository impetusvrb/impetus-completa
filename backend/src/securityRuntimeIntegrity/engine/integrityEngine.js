'use strict';

/**
 * SEC-04 — Runtime Integrity Engine (orquestrador).
 * Read-only — compara estado actual vs SECURITY-BASELINE-01.
 */

const flags = require('../config/securityRuntimeIntegrityFlags');
const { loadBaseline, repoRoot } = require('../baseline/baselineLoader');
const { validateHashes } = require('../validators/hashValidator');
const { validateRuntime } = require('../validators/runtimeValidator');
const { validateConfiguration } = require('../validators/configValidator');
const { validateFilesystem } = require('../validators/filesystemValidator');
const { validateNetwork } = require('../validators/networkValidator');
const {
  computeIntegrityScore,
  deriveIntegrityStatus,
  buildRecommendations
} = require('../engine/integrityScoreCalculator');
const { createRuntimeIntegrityDto, freezeReport } = require('../dto/runtimeIntegrityDto');
const store = require('../store/integrityReportStore');
const metrics = require('../metrics/integrityMetrics');

function getCurrentGitHead() {
  if (process.env.SEC04_SKIP_GIT_CHECK === 'true') return null;
  try {
    const { execSync } = require('child_process');
    return execSync('git rev-parse HEAD 2>/dev/null', { encoding: 'utf8', cwd: repoRoot(), timeout: 5000 }).trim();
  } catch (_e) {
    return null;
  }
}

/**
 * Executa verificação completa de integridade.
 * @param {object} [ctx] — contexto mock para testes
 * @returns {object|null}
 */
function runIntegrityCheck(ctx = {}) {
  if (!flags.isSecurityRuntimeIntegrityEnabled() && !ctx.force) return null;

  metrics.increment('integrity_checks');

  try {
    const baseline = ctx.baseline || loadBaseline();
    const hashValidation = validateHashes(baseline, ctx);
    const configurationValidation = validateConfiguration(baseline, ctx);
    const runtimeValidation = validateRuntime(baseline, ctx);
    const filesystemValidation = validateFilesystem(baseline, ctx);
    const networkValidation = validateNetwork(baseline, ctx);

    const validations = {
      hash: hashValidation,
      configuration: configurationValidation,
      runtime: runtimeValidation,
      filesystem: filesystemValidation,
      network: networkValidation
    };

    if (hashValidation.passed) metrics.increment('baseline_matches');
    if (configurationValidation.findings.some((f) => f.code.includes('DRIFT'))) {
      metrics.increment('configuration_drifts');
    }
    if (runtimeValidation.findings.some((f) => ['SCRIPT_CHANGED', 'UNEXPECTED_RESTARTS'].includes(f.code))) {
      metrics.increment('runtime_drifts');
    }
    if (filesystemValidation.findings.length > 0) metrics.increment('filesystem_drifts');
    if (networkValidation.findings.length > 0) metrics.increment('network_drifts');

    const allFindings = [
      ...hashValidation.findings,
      ...configurationValidation.findings,
      ...runtimeValidation.findings,
      ...filesystemValidation.findings,
      ...networkValidation.findings
    ];

    const criticalFindings = allFindings.filter((f) => f.severity === 'CRITICAL');
    const warnings = allFindings.filter((f) => f.severity === 'WARNING' || f.severity === 'INFO');

    const integrityScore = computeIntegrityScore(validations);
    metrics.setIntegrityScore(integrityScore);

    const integrityStatus = deriveIntegrityStatus(integrityScore, criticalFindings);
    const gitHeadCurrent = ctx.gitHeadCurrent != null ? ctx.gitHeadCurrent : getCurrentGitHead();

    const report = createRuntimeIntegrityDto({
      integrityStatus,
      baselineVersion: baseline.version,
      baselineTimestamp: baseline.frozenAt,
      gitHeadBaseline: baseline.gitHead,
      gitHeadCurrent,
      integrityScore,
      criticalFindings,
      warnings,
      hashValidation,
      configurationValidation,
      runtimeValidation,
      filesystemValidation,
      networkValidation,
      recommendations: buildRecommendations(validations, integrityStatus)
    });

    store.setLastReport(report);
    return freezeReport(report);
  } catch (e) {
    metrics.increment('integrity_failures');
    throw e;
  }
}

module.exports = { runIntegrityCheck, getCurrentGitHead };
