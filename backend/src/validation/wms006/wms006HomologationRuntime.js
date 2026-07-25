'use strict';

const { runAllEndToEndScenarios } = require('../wms005/wms005ScenarioRunner');
const { compareWithWms005Baseline } = require('./wms006RegressionBaseline');
const { validateControlledActivation } = require('./wms006ControlledActivation');
const { runCrossDomainCertification } = require('./wms006CrossDomainCertification');
const { buildProductionReadinessChecklist } = require('./wms006ProductionReadinessChecklist');
const { buildBaselineCandidateManifest } = require('./wms006BaselineCandidateManifest');
const { logWms006Event, getWms006ObservabilitySnapshot } = require('./wms006Observability');

async function runFrozenHomologation(ctx = {}) {
  const t0 = Date.now();
  const issues = [];

  const activation = validateControlledActivation();
  if (!activation.valid) issues.push('controlled_activation_failed');

  let e2e = { ok: false, results: [], skipped: true };
  if (ctx.skip_e2e !== true) {
    try {
      const ran = await runAllEndToEndScenarios(ctx);
      e2e = { ...ran, skipped: false, error: null };
    } catch (err) {
      e2e = { ok: false, results: [], skipped: false, error: err.message };
      issues.push('e2e_failed');
    }
  } else {
    issues.push('e2e_skipped');
  }

  const regression = compareWithWms005Baseline(e2e.results);
  if (!regression.valid && !ctx.skip_e2e) issues.push('wms005_regression');

  const crossDomain = await runCrossDomainCertification(ctx);
  if (!crossDomain.valid) issues.push('cross_domain_certification_failed');

  const checklist = buildProductionReadinessChecklist({
    regression,
    cross_domain: crossDomain,
    evidence_pending: ctx.evidence_pending === true
  });
  if (!checklist.all_pass && !ctx.evidence_pending) issues.push('production_readiness_incomplete');

  const manifest = buildBaselineCandidateManifest();

  const valid = issues.filter((i) => i !== 'e2e_skipped').length === 0 && (e2e.ok || ctx.skip_e2e);

  logWms006Event({
    event: 'FROZEN_HOMOLOGATION',
    valid,
    issues_count: issues.length,
    duration_ms: Date.now() - t0,
    telemetry: getWms006ObservabilitySnapshot(10).length
  });

  return Object.freeze({
    ok: valid,
    valid,
    phase: 'WMS-006',
    category: 'Frozen Homologation',
    issues,
    activation,
    e2e,
    regression,
    cross_domain: crossDomain,
    checklist,
    baseline_candidate_manifest: manifest,
    architecture_frozen: true,
    duration_ms: Date.now() - t0
  });
}

module.exports = {
  runFrozenHomologation
};
