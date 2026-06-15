'use strict';

/**
 * AIOI-P1P.3 — Baseline Consistency Service
 * READ ONLY · valida cadeia P1A→P1O (15 fases), deps, vereditos, contagem canónica.
 */

const fs = require('fs');
const path = require('path');
const {
  ENTERPRISE_BASELINE_PHASES,
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE,
  detectStalePhaseCount
} = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_BASELINE_CONSISTENCY';
const DOCS_DIR = path.join(__dirname, '../../../../docs');

function _readDoc(filename) {
  try {
    return fs.readFileSync(path.join(DOCS_DIR, filename), 'utf8');
  } catch {
    return null;
  }
}

function validateChain() {
  const entries = [];
  const violations = [];
  const presentIds = new Set();

  for (const phase of ENTERPRISE_BASELINE_PHASES) {
    const content = _readDoc(phase.doc);
    const present = content !== null;
    const hasVerdict = present && (
      new RegExp(phase.verdict.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(content)
      || /PASS|Veredito/i.test(content)
    );
    if (present) presentIds.add(phase.id);

    entries.push({
      phase: phase.id,
      doc: phase.doc,
      present,
      has_verdict: hasVerdict,
      expected_verdict: phase.verdict
    });

    if (!present) violations.push({ phase: phase.id, type: 'doc_missing' });
    if (present && !hasVerdict) violations.push({ phase: phase.id, type: 'verdict_missing' });
  }

  for (const phase of ENTERPRISE_BASELINE_PHASES) {
    for (const dep of phase.deps) {
      if (!presentIds.has(dep)) {
        violations.push({ phase: phase.id, type: 'dependency_missing', dependency: dep });
      }
    }
  }

  const phaseDrift = detectStalePhaseCount(ENTERPRISE_BASELINE_PHASES.length, 'baseline_chain');
  if (phaseDrift) violations.push({ type: 'phase_count_drift', ...phaseDrift });
  if (presentIds.size !== ENTERPRISE_BASELINE_PHASE_COUNT) {
    violations.push({
      type: 'phase_count_mismatch',
      reported: presentIds.size,
      expected: ENTERPRISE_BASELINE_PHASE_COUNT
    });
  }

  return {
    chain_valid: violations.length === 0,
    phases_total: ENTERPRISE_BASELINE_PHASES.length,
    phases_present: presentIds.size,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    phase_count_canonical: ENTERPRISE_BASELINE_PHASES.length === ENTERPRISE_BASELINE_PHASE_COUNT,
    entries,
    violations
  };
}

function generateConsistencyStatus() {
  const chain = validateChain();

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    baseline_consistent: chain.chain_valid
      && chain.phase_count_canonical
      && chain.phases_present === ENTERPRISE_BASELINE_PHASE_COUNT,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    chain,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  validateChain,
  generateConsistencyStatus,
  LAYER
};
