'use strict';

/**
 * AIOI-P1O.5 — Historical Audit Chain Service
 * READ ONLY · valida cadeia P1A → P1N sem lacunas.
 */

const fs = require('fs');
const path = require('path');

const baselineRegistry = require('./aioiBaselineRegistryService');
const { ENTERPRISE_BASELINE_PHASES, ENTERPRISE_BASELINE_PHASE_COUNT } = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_HISTORICAL_AUDIT_CHAIN';
const DOCS_DIR = path.join(__dirname, '../../../../docs');

function _readDoc(filename) {
  try {
    return fs.readFileSync(path.join(DOCS_DIR, filename), 'utf8');
  } catch {
    return null;
  }
}

function validateAuditChain() {
  const phases = ENTERPRISE_BASELINE_PHASES;
  const entries = [];
  const gaps = [];

  for (const phase of phases) {
    const content = _readDoc(phase.doc);
    const present = content !== null;
    const hasVerdict = present && (new RegExp(phase.verdict.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(content)
      || /PASS|Veredito/i.test(content));
    const depsOk = phase.deps.every(dep => {
      const depPhase = phases.find(p => p.id === dep);
      return depPhase && _readDoc(depPhase.doc) !== null;
    });

    entries.push({
      phase: phase.id,
      doc: phase.doc,
      present,
      has_verdict: hasVerdict,
      dependencies_valid: depsOk,
      expected_verdict: phase.verdict
    });

    if (!present) gaps.push({ phase: phase.id, type: 'documentation_missing' });
    if (present && !hasVerdict) gaps.push({ phase: phase.id, type: 'verdict_missing' });
    if (!depsOk) gaps.push({ phase: phase.id, type: 'dependency_gap' });
  }

  return {
    audit_chain_complete: gaps.length === 0 && phases.length === ENTERPRISE_BASELINE_PHASE_COUNT,
    phases_total: phases.length,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    phases_verified: entries.filter(e => e.present && e.has_verdict && e.dependencies_valid).length,
    entries,
    gaps
  };
}

function generateAuditChainStatus() {
  const chain = validateAuditChain();
  const registryChain = baselineRegistry.validateBaselineChain();

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    audit_chain_complete: chain.audit_chain_complete && registryChain.chain_valid,
    chain,
    registry_chain: registryChain,
    baseline_range: 'P1A-P1N',
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  validateAuditChain,
  generateAuditChainStatus,
  LAYER
};
