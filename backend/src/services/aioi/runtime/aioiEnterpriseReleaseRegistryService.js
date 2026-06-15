'use strict';

/**
 * AIOI-P1R.2 — Enterprise Release Registry
 * READ ONLY · cataloga release enterprise oficial P1A–P1Q.
 */

const baselineRegistry = require('./aioiBaselineRegistryService');
const releaseManifest = require('./aioiReleaseManifestService');
const {
  ENTERPRISE_BASELINE_PHASES,
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE
} = require('./aioiEnterprisePhaseChain');
const continuousWorker = require('./aioiContinuousWorkerService');

const LAYER = 'AIOI_ENTERPRISE_RELEASE_REGISTRY';
const RELEASE_IDENTIFIER = 'IMPETUS-AIOI-P1-ENTERPRISE-RELEASE-2026.06';
const RELEASE_VERSION = 'P1A-P1Q-2026.06';

function getCertificationChain() {
  return ENTERPRISE_BASELINE_PHASES.map(p => ({
    phase: p.id,
    verdict: p.verdict,
    doc: p.doc,
    dependencies: p.deps
  }));
}

function getReleaseRegistry() {
  const registry = baselineRegistry.getBaselineRegistry();
  const manifest = releaseManifest.generateReleaseManifest();
  const chain = baselineRegistry.validateBaselineChain();

  const releaseRegistered = registry.baseline_registered === true
    && chain.phases_present === ENTERPRISE_BASELINE_PHASE_COUNT
    && manifest.certified === true;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    release_registered: releaseRegistered,
    release_identifier: RELEASE_IDENTIFIER,
    release_version: RELEASE_VERSION,
    release_status: releaseRegistered ? 'ACCEPTED' : 'PENDING',
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    phases: ENTERPRISE_BASELINE_PHASE_COUNT,
    certification_chain: getCertificationChain(),
    chain,
    manifest,
    registry,
    p1_line_closure: 'P1A-P1Q enterprise release — Linha P1 encerrada formalmente (governança)',
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getCertificationChain,
  getReleaseRegistry,
  RELEASE_IDENTIFIER,
  RELEASE_VERSION,
  LAYER
};
