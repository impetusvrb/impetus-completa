'use strict';

/**
 * AIOI-P1S.1 — Baseline Closure Service
 * READ ONLY · valida encerramento formal da baseline P1A→P1R.
 */

const baselineRegistry = require('./aioiBaselineRegistryService');
const baselineFreeze = require('./aioiBaselineFreezeService');
const releaseAcceptance = require('./aioiReleaseAcceptanceService');
const enterpriseReleaseRegistry = require('./aioiEnterpriseReleaseRegistryService');
const continuousWorker = require('./aioiContinuousWorkerService');
const { ENTERPRISE_BASELINE_PHASE_COUNT, ENTERPRISE_BASELINE_RANGE } = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_BASELINE_CLOSURE';
const CLOSURE_IDENTIFIER = 'IMPETUS-AIOI-P1-LINE-CLOSURE-2026.06';

async function generateClosureStatus() {
  const registry = baselineRegistry.getBaselineRegistry();
  const freeze = baselineFreeze.generateFreezeStatus();
  const acceptance = await releaseAcceptance.generateAcceptanceStatus();
  const releaseReg = enterpriseReleaseRegistry.getReleaseRegistry();

  const baselineClosed = registry.baseline_registered === true
    && freeze.baseline_frozen === true
    && freeze.governance_only === true
    && acceptance.release_accepted === true
    && releaseReg.release_registered === true;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    baseline_closed: baselineClosed,
    closure_identifier: CLOSURE_IDENTIFIER,
    closure_status: baselineClosed ? 'CLOSED' : 'PENDING',
    checks: {
      registry_complete: registry.baseline_registered === true,
      baseline_frozen: freeze.baseline_frozen === true,
      governance_only: freeze.governance_only === true,
      release_accepted: acceptance.release_accepted === true,
      release_registered: releaseReg.release_registered === true
    },
    registry,
    freeze,
    acceptance,
    release_registry: releaseReg,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    line_p1_status: baselineClosed ? 'LINHA_P1_ENCERRADA' : 'LINHA_P1_PENDENTE',
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateClosureStatus,
  CLOSURE_IDENTIFIER,
  LAYER
};
