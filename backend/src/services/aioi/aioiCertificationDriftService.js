'use strict';

/**
 * AIOI-P6.2 — Certification Drift Monitoring Service
 *
 * Monitora compliance de certificações ORG-1..5 e P1..P5 — observação only.
 * Spec: backend/docs/AIOI_CERTIFICATION_DRIFT_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');

const LAYER = 'AIOI_CERTIFICATION_DRIFT';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');

const CERTIFICATION_TARGETS = [
  { id: 'ORG-1', doc: 'AIOI_ORG_1_QUEUE_CONSOLIDATION_REPORT.md',           token: 'AIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_PASS' },
  { id: 'ORG-2', doc: 'AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_REPORT.md',    token: 'AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_PASS' },
  { id: 'ORG-3', doc: 'AIOI_ORG_3_F49_CERTIFICATION_CLOSURE_REPORT.md',     token: 'AIOI_ORG_3_F49_CERTIFICATION_CLOSURE_PASS' },
  { id: 'ORG-4', doc: 'AIOI_ORG_4_P0_PRODUCTION_PILOT_CERTIFICATION_REPORT.md', token: 'AIOI_ORG_4_P0_PRODUCTION_PILOT_CERTIFICATION_PASS' },
  { id: 'ORG-5', doc: 'AIOI_ORG_5_WORKFLOW_SLA_READINESS_REPORT.md',        token: 'AIOI_ORG_5_WORKFLOW_SLA_READINESS_PASS' },
  { id: 'P1',    doc: 'AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md', token: 'AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS' },
  { id: 'P2',    doc: 'AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_REPORT.md', token: 'AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_PASS' },
  { id: 'P3',    doc: 'AIOI_P3_PRODUCTION_PILOT_VALIDATION_REPORT.md',      token: 'AIOI_P3_PRODUCTION_PILOT_VALIDATION_CERTIFICATION_PASS' },
  { id: 'P4',    doc: 'AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_REPORT.md', token: 'AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_PASS' },
  { id: 'P5',    doc: 'AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_REPORT.md', token: 'AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_PASS' }
];

function _readDoc(name) {
  const fp = path.join(DOCS, name);
  return fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : null;
}

function _checkCertification(target) {
  const content = _readDoc(target.doc);
  const docPresent = content != null && content.length > 50;
  const tokenPresent = docPresent && content.includes(target.token);
  const pass = docPresent && tokenPresent;
  return {
    id:              target.id,
    doc:             target.doc,
    expected_token:  target.token,
    doc_present:     docPresent,
    token_present:   tokenPresent,
    compliant:       pass,
    drift_detected:  !pass,
    detail:          pass ? 'CERTIFICATION_INTACT' : (docPresent ? 'TOKEN_MISSING' : 'DOC_MISSING')
  };
}

/**
 * Detecta drift de certificações ORG-1..5 e P1..P5.
 * Sem correção automática — observação only.
 * @returns {object}
 */
function detectCertificationDrift() {
  const certifications = CERTIFICATION_TARGETS.map(_checkCertification);
  const driftCount = certifications.filter(c => c.drift_detected).length;

  const orgCompliance = certifications.filter(c => c.id.startsWith('ORG'));
  const phaseCompliance = certifications.filter(c => /^P\d$/.test(c.id));

  return {
    ok: driftCount === 0,
    layer: LAYER,
    certification_drift_detected: driftCount > 0,
    drift_count:                driftCount,
    total_certifications:       certifications.length,
    org_compliance: {
      total:    orgCompliance.length,
      compliant: orgCompliance.filter(c => c.compliant).length,
      items:    orgCompliance
    },
    phase_compliance: {
      total:    phaseCompliance.length,
      compliant: phaseCompliance.filter(c => c.compliant).length,
      items:    phaseCompliance
    },
    certifications,
    auto_correction: false,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  detectCertificationDrift,
  CERTIFICATION_TARGETS,
  LAYER
};
