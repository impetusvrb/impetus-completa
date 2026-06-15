'use strict';

/**
 * AIOI-P1S.2 — Historical Archive Registry
 * READ ONLY · cataloga o arquivo histórico oficial da Linha P1.
 */

const baselineRegistry = require('./aioiBaselineRegistryService');
const releaseManifest = require('./aioiReleaseManifestService');
const enterpriseReleaseRegistry = require('./aioiEnterpriseReleaseRegistryService');
const {
  ENTERPRISE_BASELINE_PHASES,
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE
} = require('./aioiEnterprisePhaseChain');
const continuousWorker = require('./aioiContinuousWorkerService');

const LAYER = 'AIOI_HISTORICAL_ARCHIVE_REGISTRY';
const ARCHIVE_IDENTIFIER = 'IMPETUS-AIOI-LINE-P1-HISTORICAL-ARCHIVE-2026.06';
const ARCHIVE_VERSION = 'P1A-P1R-ARCHIVE-2026.06';

function buildArchiveCertificationChain() {
  return ENTERPRISE_BASELINE_PHASES.map(p => ({
    phase: p.id,
    verdict: p.verdict,
    doc: p.doc,
    archived: true,
    archive_status: 'CERTIFIED'
  }));
}

function getHistoricalArchiveRegistry() {
  const registry = baselineRegistry.getBaselineRegistry();
  const manifest = releaseManifest.generateReleaseManifest();
  const releaseReg = enterpriseReleaseRegistry.getReleaseRegistry();
  const chain = buildArchiveCertificationChain();

  const historicalArchiveReady = registry.baseline_registered === true
    && manifest.certified === true
    && releaseReg.release_registered === true
    && chain.length === ENTERPRISE_BASELINE_PHASE_COUNT;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    historical_archive_ready: historicalArchiveReady,
    archive_identifier: ARCHIVE_IDENTIFIER,
    archive_version: ARCHIVE_VERSION,
    archive_status: historicalArchiveReady ? 'ARCHIVED' : 'PENDING',
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    phases_archived: chain.length,
    certification_chain: chain,
    release_identifier: releaseReg.release_identifier,
    manifest,
    registry,
    p1_line_history: {
      line: 'P1',
      range: ENTERPRISE_BASELINE_RANGE,
      phases: ENTERPRISE_BASELINE_PHASE_COUNT,
      release_id: releaseReg.release_identifier,
      archive_id: ARCHIVE_IDENTIFIER,
      closure_date: '2026-06',
      status: 'HISTORICALLY_ARCHIVED'
    },
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getHistoricalArchiveRegistry,
  buildArchiveCertificationChain,
  ARCHIVE_IDENTIFIER,
  ARCHIVE_VERSION,
  LAYER
};
