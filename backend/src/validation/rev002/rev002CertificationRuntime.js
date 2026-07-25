'use strict';

const { logWms006Event } = require('../wms006/wms006Observability');
const { validateManifestIntegrity } = require('./rev002ManifestValidator');
const { validateGapFinalReview } = require('./rev002GapFinalReview');
const { validateEvidenceIntegrity } = require('./rev002EvidenceIntegrity');
const { validateReproducibility } = require('./rev002Reproducibility');
const { validateArchitectureConformanceReview } = require('./rev002ArchitectureReview');
const { compareWithWms005Baseline } = require('../wms006/wms006RegressionBaseline');
const { runAllEndToEndScenarios } = require('../wms005/wms005ScenarioRunner');

function _logRev002(event) {
  logWms006Event({ ...event, layer: 'REV-002' });
}

function _resolveVerdict(ctx = {}) {
  const blockers = ctx.blockers || [];
  const conditions = ctx.conditions || [];

  if (blockers.length > 0) return 'BASELINE-SUPPLY-v2.0 REJECTED';
  if (conditions.length > 0) return 'BASELINE-SUPPLY-v2.0 CERTIFIED WITH CONDITIONS';
  return 'BASELINE-SUPPLY-v2.0 CERTIFIED';
}

async function runBaselineCertification(ctx = {}) {
  const t0 = Date.now();
  const blockers = [];
  const conditions = [];
  const mode = 'READ_ONLY';

  const manifest = validateManifestIntegrity();
  if (!manifest.valid) blockers.push(...manifest.issues);

  const gaps = validateGapFinalReview();
  if (!gaps.valid) blockers.push(...gaps.issues);
  if (gaps.partial_accepted.length) {
    conditions.push('GAP-LOG-001/002 PARTIAL — risco residual aceite');
  }

  const evidence = validateEvidenceIntegrity();
  if (!evidence.valid) blockers.push(...evidence.missing.map((m) => `evidence:${m}`));

  const reproducibility = validateReproducibility();
  if (!reproducibility.valid) blockers.push(...reproducibility.implicit_dependencies);

  const architecture = await validateArchitectureConformanceReview();
  if (!architecture.valid) blockers.push(...architecture.issues);

  let e2e = { ok: false, results: [] };
  if (ctx.skip_e2e !== true) {
    try {
      const ran = await runAllEndToEndScenarios(ctx);
      e2e = { ...ran, skipped: false };
    } catch (err) {
      blockers.push(`e2e:${err.message}`);
    }
  }

  const regression = compareWithWms005Baseline(e2e.results);
  if (!regression.valid && ctx.skip_e2e !== true) blockers.push('wms005_regression');

  const driftNotes = (manifest.checks || [])
    .filter((c) => c.manifest_snapshot_drift)
    .map((c) => c.id);
  if (driftNotes.length) {
    conditions.push('Manifest snapshot drift (evidence exists; flag stale in JSON)');
  }

  const verdict = _resolveVerdict({ blockers, conditions });
  const approved =
    verdict === 'BASELINE-SUPPLY-v2.0 CERTIFIED' || verdict === 'BASELINE-SUPPLY-v2.0 CERTIFIED WITH CONDITIONS';

  _logRev002({
    event: 'BASELINE_CERTIFICATION',
    verdict,
    blockers: blockers.length,
    conditions: conditions.length,
    duration_ms: Date.now() - t0
  });

  return Object.freeze({
    ok: approved,
    approved,
    verdict,
    mode,
    phase: 'REV-002',
    blockers,
    conditions,
    manifest,
    gaps,
    evidence,
    reproducibility,
    architecture,
    e2e,
    regression,
    duration_ms: Date.now() - t0,
    authorize_baseline_creation: verdict.startsWith('BASELINE-SUPPLY-v2.0 CERTIFIED')
  });
}

module.exports = {
  runBaselineCertification
};
