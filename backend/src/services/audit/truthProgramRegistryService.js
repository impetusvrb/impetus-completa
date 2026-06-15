'use strict';

/**
 * F49-F.2 — Truth Program Registry Service
 * READ ONLY · CONSOLIDATION ONLY
 *
 * Registo canónico das fases F47 → F49-E do programa Truth.
 * Sem execução de testes, auditorias ou mutações.
 */

const fs = require('fs');
const path = require('path');

const LAYER = 'F49_TRUTH_PROGRAM_REGISTRY';
const DOCS_DIR = path.join(__dirname, '../../../docs');

const TRUTH_PROGRAM_PHASES = Object.freeze([
  {
    id: 'F47',
    name: 'Truth Enforcement',
    family: 'truth_core',
    status_key: 'f47_truth_enforcement',
    primary_doc: 'PHASE47_TRUTH_CERTIFICATION_REPORT.md',
    supporting_docs: [
      'TRUTH_COVERAGE_FINAL_AUDIT.md',
      'TRUTH_ENFORCEMENT_FLOW_REPORT.md',
      'OPERATIONAL_TRUTH_CERTIFICATION_FINAL.md'
    ],
    expected_status: 'certified',
    verdict_patterns: [/CERTIF/i, /TRUTH.*ENFORCE/i, /SAFE/i]
  },
  {
    id: 'F47.5',
    name: 'Truth Closure',
    family: 'truth_core',
    status_key: 'f47_5_truth_closure',
    primary_doc: 'TRUTH_CLOSURE_CERTIFICATION.md',
    supporting_docs: ['TRUTH_CLOSURE_REPORT.md', 'CEO_CHAT_TRUTH_AUDIT.md', 'VOICE_TRUTH_CLOSURE_AUDIT.md'],
    expected_status: 'certified',
    verdict_patterns: [/TRUTH CLOSURE COMPLETE/i, /SAFE/i, /CERTIF/i]
  },
  {
    id: 'F48',
    name: 'Stress Validation',
    family: 'truth_core',
    status_key: 'f48_stress_validation',
    primary_doc: 'STRESS_TEST_100_QUESTIONS.md',
    supporting_docs: ['STRESS_TEST_FAILURES.md', 'F49_GEMINI_STRESS_VALIDATION.md'],
    expected_status: 'certified',
    verdict_patterns: [/READY_FOR_INDUSTRIAL_TRUTH_CERTIFICATION/i, /pass_rate/i, /CERTIF/i]
  },
  {
    id: 'F49-A',
    name: 'PM2 Root Cause Audit',
    family: 'f49_operational',
    status_key: 'f49_pm2_audit',
    primary_doc: 'F49_PM2_RESTART_ROOT_CAUSE_AUDIT.md',
    supporting_docs: [],
    expected_status: 'pass',
    verdict_patterns: [/stability_score.*100/i, /Instabilidade real:\s*0/i, /PASS/i]
  },
  {
    id: 'F49-B',
    name: 'IOE Continuity Audit',
    family: 'f49_operational',
    status_key: 'f49_ioe_audit',
    primary_doc: 'F49_IOE_INGESTION_CONTINUITY_AUDIT.md',
    supporting_docs: [],
    expected_status: 'pass',
    verdict_patterns: [/controlada/i, /NÃO/i, /100%/i, /PASS/i]
  },
  {
    id: 'F49-C',
    name: 'IOE Continuous Ingestion Checkpoint',
    family: 'f49_operational',
    status_key: 'f49_ioe_activation_checkpoint',
    primary_doc: 'F49_IOE_CONTINUOUS_INGESTION_ACTIVATION_CHECKPOINT.md',
    supporting_docs: [],
    expected_status: 'pass',
    verdict_patterns: [/checkpoint/i, /read-only/i, /PASS/i]
  },
  {
    id: 'F49-D',
    name: 'Gemini Readiness & Vision Certification',
    family: 'f49_operational',
    status_key: 'f49_gemini_certification',
    primary_doc: 'F49_GEMINI_FINAL_STATUS.md',
    supporting_docs: [
      'F49_GEMINI_READINESS_AUDIT.md',
      'F49_GEMINI_VISION_CERTIFICATION.md',
      'F49_TRI_AI_CERTIFICATION.md',
      'F49_GEMINI_STRESS_VALIDATION.md'
    ],
    expected_status: 'pass',
    verdict_patterns: [/F49_GEMINI_OPERATIONAL_CERTIFIED/i, /TRI_AI_OPERATIONAL/i, /CERTIF/i]
  },
  {
    id: 'F49-E',
    name: 'CEO Live Session Certification',
    family: 'f49_operational',
    status_key: 'f49_ceo_session',
    primary_doc: 'F49_CEO_LIVE_SESSION_CERTIFICATION.md',
    supporting_docs: [],
    expected_status: 'pass',
    verdict_patterns: [/F49_CEO_LIVE_SESSION_CERTIFIED/i, /PASS/i, /CERTIF/i]
  }
]);

function _docPath(filename) {
  return path.join(DOCS_DIR, filename);
}

function _docExists(filename) {
  try {
    return fs.existsSync(_docPath(filename));
  } catch {
    return false;
  }
}

function _readDoc(filename) {
  const p = _docPath(filename);
  if (!fs.existsSync(p)) return null;
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function _extractVerdict(content, patterns = []) {
  if (!content) return null;
  for (const pat of patterns) {
    const m = content.match(pat);
    if (m) return m[0].slice(0, 120);
  }
  const backtick = content.match(/`([A-Z0-9_]+(?:CERTIFIED|PASS|COMPLETE)[A-Z0-9_]*)`/i);
  if (backtick) return backtick[1];
  return null;
}

function _phaseEntry(phase) {
  const primaryExists = _docExists(phase.primary_doc);
  const primaryContent = primaryExists ? _readDoc(phase.primary_doc) : null;
  const supporting = (phase.supporting_docs || []).map((doc) => ({
    filename: doc,
    present: _docExists(doc)
  }));

  const verdict = _extractVerdict(primaryContent, phase.verdict_patterns);
  const docsPresent = primaryExists && supporting.filter((s) => !s.present).length === 0;

  return {
    id: phase.id,
    name: phase.name,
    family: phase.family,
    status_key: phase.status_key,
    expected_status: phase.expected_status,
    primary_doc: phase.primary_doc,
    primary_doc_present: primaryExists,
    supporting_docs: supporting,
    verdict_extracted: verdict,
    registered: primaryExists,
    evidence_complete: primaryExists
  };
}

function getTruthProgramRegistry() {
  const phases = TRUTH_PROGRAM_PHASES.map(_phaseEntry);
  const registeredPhases = phases.filter((p) => p.registered).length;

  return {
    layer: LAYER,
    mode: 'READ_ONLY_CONSOLIDATION',
    generated_at: new Date().toISOString(),
    truth_registry_complete: registeredPhases === TRUTH_PROGRAM_PHASES.length,
    registered_phases: registeredPhases,
    expected_phases: TRUTH_PROGRAM_PHASES.length,
    phases
  };
}

function getPhaseById(phaseId) {
  const phase = TRUTH_PROGRAM_PHASES.find((p) => p.id === phaseId);
  if (!phase) return null;
  return _phaseEntry(phase);
}

module.exports = {
  LAYER,
  DOCS_DIR,
  TRUTH_PROGRAM_PHASES,
  getTruthProgramRegistry,
  getPhaseById,
  docExists: _docExists,
  readDoc: _readDoc
};
