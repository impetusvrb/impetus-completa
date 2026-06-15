'use strict';

/**
 * AIOI-P1S.3 — Enterprise Milestone Certification
 * READ ONLY · certifica o encerramento formal da Linha P1 como marco enterprise.
 */

const baselineClosure = require('./aioiBaselineClosureService');
const historicalArchive = require('./aioiHistoricalArchiveRegistryService');
const operationalIntegrity = require('./aioiOperationalIntegrityService');
const continuousWorker = require('./aioiContinuousWorkerService');
const { ENTERPRISE_BASELINE_PHASE_COUNT, ENTERPRISE_BASELINE_RANGE } = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_ENTERPRISE_MILESTONE';
const MILESTONE_ID = 'IMPETUS-AIOI-LINE-P1-ENTERPRISE-MILESTONE-2026.06';

const MILESTONE_DECLARATION = Object.freeze({
  milestone: 'LINHA_P1_ENCERRADA',
  description: 'A Linha P1 (P1A→P1R, 18 fases) encontra-se certificada, aceite, ' +
    'congelada, preservada, reproduzível, recuperável, auditável e historicamente arquivada.',
  baseline_range: ENTERPRISE_BASELINE_RANGE,
  total_phases: ENTERPRISE_BASELINE_PHASE_COUNT,
  release_id: 'IMPETUS-AIOI-P1-ENTERPRISE-RELEASE-2026.06',
  archive_id: 'IMPETUS-AIOI-LINE-P1-HISTORICAL-ARCHIVE-2026.06',
  governance_mode: 'READ_ONLY_GOVERNANCE_ONLY',
  runtime_status: 'NOT_ACTIVE',
  next_allowed: ['F49/TRUTH_VALIDATION', 'GEMINI_STRESS_CERTIFICATION', 'AIOI_P0_OPERATIONAL']
});

async function generateMilestoneStatus() {
  const closure = await baselineClosure.generateClosureStatus();
  const archive = historicalArchive.getHistoricalArchiveRegistry();
  const integrity = operationalIntegrity.validateRuntimeInvariants();

  const enterpriseMilestoneCertified = closure.baseline_closed === true
    && archive.historical_archive_ready === true
    && integrity.ok === true;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    enterprise_milestone_certified: enterpriseMilestoneCertified,
    milestone_id: MILESTONE_ID,
    milestone_status: enterpriseMilestoneCertified ? 'CERTIFIED' : 'PENDING',
    milestone_declaration: MILESTONE_DECLARATION,
    checks: {
      baseline_closed: closure.baseline_closed === true,
      historical_archive: archive.historical_archive_ready === true,
      invariants_valid: integrity.ok === true
    },
    closure,
    archive,
    integrity,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateMilestoneStatus,
  MILESTONE_DECLARATION,
  MILESTONE_ID,
  LAYER
};
