'use strict';

/**
 * SEC-20 — Enterprise Security v2 Operational Certification (read-only).
 */

const flags = require('./config/securityCertificationV2Flags');
const consolidator = require('./engine/certificationConsolidator');
const collector = require('./collectors/evidenceCollector');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = path.resolve(__dirname, '../../docs/evidence/sec-20');

function getAuditPayload() {
  const regressionSummary = collector.readJsonIfExists(
    path.join(EVIDENCE_DIR, 'regression-summary.json')
  );
  const latest = collector.readJsonIfExists(path.join(EVIDENCE_DIR, 'certification-latest.json'));

  const dashboard =
    latest?.dashboard ||
    consolidator.buildCertificationDashboard({
      enabled: flags.isSecurityCertificationV2Enabled(),
      regressionSummary,
      outstandingNCs: latest?.ncs || []
    });

  return {
    ok: true,
    phase: 'SEC-20',
    read_only: true,
    enabled: flags.isSecurityCertificationV2Enabled(),
    dashboard,
    evidence: {
      criteria: collector.readJsonIfExists(path.join(EVIDENCE_DIR, 'criteria.json')),
      regressionSummary,
      operationalReadiness: collector.readJsonIfExists(
        path.join(EVIDENCE_DIR, 'operational-readiness.json')
      ),
      phases: collector.collectPhaseEvidence()
    },
    disclaimer:
      'SEC-20 — certificação de encerramento; evidências reais consolidadas; nenhuma alteração runtime'
  };
}

function writeEvidencePackage(packageData) {
  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const ts = new Date().toISOString();
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'certification-latest.json'), JSON.stringify(packageData, null, 2));
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, `certification-${ts.replace(/[:.]/g, '-')}.json`),
    JSON.stringify(packageData, null, 2)
  );
  if (packageData.criteria) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'criteria.json'), JSON.stringify(packageData.criteria, null, 2));
  }
  if (packageData.regressionSummary) {
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'regression-summary.json'),
      JSON.stringify(packageData.regressionSummary, null, 2)
    );
  }
  if (packageData.readiness) {
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'operational-readiness.json'),
      JSON.stringify(packageData.readiness, null, 2)
    );
  }
}

module.exports = {
  isEnabled: flags.isSecurityCertificationV2Enabled,
  flags,
  collector,
  consolidator,
  getAuditPayload,
  buildDashboard: consolidator.buildCertificationDashboard,
  writeEvidencePackage
};
