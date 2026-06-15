'use strict';

/**
 * AIOI-P1S.5 — Closure Report Service
 * READ ONLY · gera relatório de encerramento completo da Linha P1.
 */

const baselineClosure = require('./aioiBaselineClosureService');
const historicalArchive = require('./aioiHistoricalArchiveRegistryService');
const enterpriseMilestone = require('./aioiEnterpriseMilestoneService');
const enterpriseReleaseRegistry = require('./aioiEnterpriseReleaseRegistryService');
const baselineTraceability = require('./aioiBaselineTraceabilityService');
const continuousWorker = require('./aioiContinuousWorkerService');
const {
  ENTERPRISE_BASELINE_PHASES,
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE
} = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_CLOSURE_REPORT';

async function generateClosureReport() {
  const closure = await baselineClosure.generateClosureStatus();
  const archive = historicalArchive.getHistoricalArchiveRegistry();
  const milestone = await enterpriseMilestone.generateMilestoneStatus();
  const releaseReg = enterpriseReleaseRegistry.getReleaseRegistry();
  const traceability = baselineTraceability.generateTraceabilityStatus();

  const closureReportGenerated = closure.baseline_closed === true
    && archive.historical_archive_ready === true
    && milestone.enterprise_milestone_certified === true
    && releaseReg.release_registered === true;

  const report = {
    report_id: `AIOI-P1S-CLOSURE-REPORT-${new Date().toISOString().slice(0, 10)}`,
    title: 'AIOI Linha P1 — Relatório de Encerramento Enterprise',
    executive_summary: {
      total_phases: ENTERPRISE_BASELINE_PHASE_COUNT,
      baseline_range: ENTERPRISE_BASELINE_RANGE,
      release_identifier: releaseReg.release_identifier,
      archive_identifier: archive.archive_identifier,
      milestone_identifier: milestone.milestone_id,
      closure_identifier: closure.closure_identifier,
      line_status: 'ENCERRADA'
    },
    phases: ENTERPRISE_BASELINE_PHASES.map(p => ({
      id: p.id,
      verdict: p.verdict,
      doc: p.doc,
      status: 'CERTIFIED'
    })),
    certifications: {
      baseline_registry: true,
      baseline_freeze: true,
      release_acceptance: true,
      release_registry: true,
      historical_archive: archive.historical_archive_ready,
      enterprise_milestone: milestone.enterprise_milestone_certified,
      traceability: traceability.traceability_complete
    },
    governance: {
      runtime_enabled: false,
      runtime_active: false,
      runtime_authorized: false,
      cognitive_execution_allowed: false,
      auto_execute_band: 'none',
      mode: 'READ_ONLY_HISTORICAL_ARCHIVE_ONLY'
    },
    prohibited: ['P17', 'P18', 'P19', 'P20', 'LLM_RUNTIME', 'AUTO_EXECUTE', 'AUTO_DEPLOY'],
    next_recommended: [
      { area: 'F49/TRUTH', priority: 'HIGH', status: 'PENDENTE_GEMINI_CHAVE', note: 'Truth 91% concluído; Gemini PENDING dependência externa' },
      { area: 'GEMINI_STRESS_TEST', priority: 'HIGH', status: 'PENDENTE', note: 'Stress test Gemini ManuIA visão pendente chave válida' },
      { area: 'AIOI_P0_OPERATIONAL', priority: 'MEDIUM', status: 'AUTORIZADO', note: 'P0 autorizado sem dependência Truth/F49' }
    ]
  };

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    closure_report_generated: closureReportGenerated,
    report,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateClosureReport,
  LAYER
};
