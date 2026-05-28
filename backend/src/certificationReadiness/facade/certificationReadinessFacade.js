'use strict';

/**
 * PROMPT 31 — Certification readiness facade.
 */

const flags = require('../config/certificationReadinessFlags');
const catalog = require('../catalog/frameworkCatalog');
const evidenceCollector = require('../collectors/evidenceInventoryCollector');
const gapEngine = require('../engine/gapAnalysisEngine');
const remediationEngine = require('../engine/remediationMatrixBuilder');
const roadmapEngine = require('../engine/certificationRoadmapBuilder');
const audit = require('../observability/certificationReadinessAuditService');

function _log(event, data) {
  try {
    console.info(
      '[CERTIFICATION_READINESS]',
      JSON.stringify({ event, ts: new Date().toISOString(), mode: flags.certificationMode(), ...data })
    );
  } catch (_e) {}
}

function getHealth() {
  return {
    mode: flags.certificationMode(),
    active: flags.isCertificationReadinessActive(),
    frameworks: catalog.listFrameworks().length,
    controls: catalog.listControls().length,
    invariants: {
      additive_only: true,
      read_only_assessment: true,
      no_certification_bypass: true,
      external_auditor_required_for_formal_cert: true
    }
  };
}

async function runFullReadinessAssessment(companyId = null, frameworkFilter = null, ctx = {}) {
  if (!flags.isCertificationReadinessActive()) {
    return { ok: false, error: 'certification_readiness_inactive', mode: flags.certificationMode() };
  }

  const inventory = await evidenceCollector.collectEvidenceInventory(companyId);
  const gap_analysis = gapEngine.runGapAnalysis(inventory, frameworkFilter);
  const remediation_matrix = remediationEngine.buildRemediationMatrix(gap_analysis);
  const certification_roadmap = roadmapEngine.buildCertificationRoadmap(
    gap_analysis,
    remediation_matrix
  );

  const by_framework = {};
  for (const fw of catalog.listFrameworks()) {
    by_framework[fw.id] = gapEngine.runGapAnalysis(inventory, fw.id);
  }

  const report = {
    ok: true,
    mode: flags.certificationMode(),
    company_id: companyId,
    framework_filter: frameworkFilter,
    generated_at: new Date().toISOString(),
    evidence_inventory: inventory,
    gap_analysis,
    remediation_matrix,
    certification_roadmap,
    framework_scores: Object.fromEntries(
      Object.entries(by_framework).map(([k, v]) => [k, { overall_score: v.overall_score, gap_count: v.gap_count }])
    ),
    explainability: {
      method: 'automated_technical_readiness',
      not_formal_certification: true,
      evidence_sources: ['env_flags', 'db_counts', 'governance_modules', 'docs_manifest']
    }
  };

  _log('assessment_complete', {
    company_id: companyId,
    score: gap_analysis.overall_score,
    gaps: gap_analysis.gap_count
  });

  const snap = await audit.saveSnapshot(companyId, report);
  report.snapshot_id = snap.id;

  await audit.recordAudit({
    companyId,
    actorUserId: ctx.actorUserId,
    action: 'full_assessment',
    payload: { score: gap_analysis.overall_score, snapshot_id: snap.id }
  });

  return report;
}

module.exports = {
  getHealth,
  runFullReadinessAssessment,
  listFrameworks: catalog.listFrameworks,
  listControls: catalog.listControls
};
