'use strict';

/**
 * AIOI-P1N.5 — Documentation Consistency Service
 * READ ONLY · valida cadeia canónica P1A–P1N (14 fases).
 */

const fs = require('fs');
const path = require('path');
const {
  ENTERPRISE_BASELINE_PHASES,
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE,
  detectStalePhaseCount
} = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_DOCUMENTATION_CONSISTENCY';
const DOCS_DIR = path.join(__dirname, '../../../../docs');

const PHASE_CHAIN = ENTERPRISE_BASELINE_PHASES;

function _readDoc(filename) {
  try {
    return fs.readFileSync(path.join(DOCS_DIR, filename), 'utf8');
  } catch {
    return null;
  }
}

function validateDocumentationPresence() {
  const phases = PHASE_CHAIN.map(p => {
    const content = _readDoc(p.doc);
    const present = content !== null;
    const hasVerdict = present && /PASS|Veredito/i.test(content);
    return { ...p, present, has_verdict: hasVerdict };
  });
  const allPresent = phases.every(p => p.present);
  const allVerdicts = phases.every(p => p.has_verdict);
  return {
    phases,
    all_present: allPresent,
    all_verdicts: allVerdicts,
    phases_total: PHASE_CHAIN.length,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT
  };
}

function validateCertificationChain() {
  const presence = validateDocumentationPresence();
  const certified = new Set(presence.phases.filter(p => p.present).map(p => p.id));
  const violations = [];

  for (const phase of PHASE_CHAIN) {
    for (const dep of phase.deps) {
      if (!certified.has(dep)) {
        violations.push({ phase: phase.id, missing_dependency: dep });
      }
    }
  }

  const phaseCountDrift = detectStalePhaseCount(presence.phases_total, 'documentation_presence');
  if (phaseCountDrift) {
    violations.push({ type: 'phase_count_drift', ...phaseCountDrift });
  }
  if (presence.phases_total !== ENTERPRISE_BASELINE_PHASE_COUNT) {
    violations.push({
      type: 'phase_count_mismatch',
      reported: presence.phases_total,
      expected: ENTERPRISE_BASELINE_PHASE_COUNT,
      range: ENTERPRISE_BASELINE_RANGE
    });
  }

  return {
    chain_valid: violations.length === 0 && presence.all_present,
    phases_total: PHASE_CHAIN.length,
    phases_present: certified.size,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    phase_count_canonical: presence.phases_total === ENTERPRISE_BASELINE_PHASE_COUNT,
    violations
  };
}

function validateCriteriaCoverage() {
  const enterpriseDocs = PHASE_CHAIN.filter(p => p.doc.includes('ENTERPRISE') || p.id === 'P1A');
  let covered = 0;
  const details = [];
  for (const phase of enterpriseDocs) {
    const content = _readDoc(phase.doc);
    const hasCriteria = content && (/Critério|criteria|PASS/i.test(content));
    if (hasCriteria) covered += 1;
    details.push({ phase: phase.id, criteria_documented: !!hasCriteria });
  }
  return {
    coverage_percent: enterpriseDocs.length ? Math.round((covered / enterpriseDocs.length) * 100) : 0,
    details
  };
}

function generateDocumentationStatus() {
  const presence = validateDocumentationPresence();
  const chain = validateCertificationChain();
  const criteria = validateCriteriaCoverage();

  const documentationConsistent = presence.all_present
    && chain.chain_valid
    && chain.phase_count_canonical
    && chain.phases_present === ENTERPRISE_BASELINE_PHASE_COUNT
    && criteria.coverage_percent >= 80;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    documentation_consistent: documentationConsistent,
    presence,
    certification_chain: chain,
    criteria_coverage: criteria,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  validateDocumentationPresence,
  validateCertificationChain,
  validateCriteriaCoverage,
  generateDocumentationStatus,
  PHASE_CHAIN,
  LAYER
};
