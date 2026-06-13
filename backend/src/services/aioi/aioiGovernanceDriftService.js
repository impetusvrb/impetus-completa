'use strict';

/**
 * AIOI-P4.3 — Governance Drift Detection Service
 *
 * Detecção de desvios de governança — observação only, zero correção automática.
 * Spec: backend/docs/AIOI_GOVERNANCE_DRIFT_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const pilotFlags = require('./aioiPilotFlags');

const LAYER = 'AIOI_GOVERNANCE_DRIFT';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src', 'services', 'aioi');

function _readSrc(name) {
  const fp = path.join(SRC, name);
  return fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : '';
}

function _readDoc(name) {
  const fp = path.join(DOCS, name);
  return fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : '';
}

function _stripComments(c) {
  return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n');
}

function _checkDrift(id, domain, pass, detail) {
  return { id, domain, drift_detected: !pass, pass, detail };
}

/**
 * Detecta desvios de governança em todos os domínios soberanos.
 * @returns {object}
 */
function detectGovernanceDrift() {
  const flags = pilotFlags.getAioiFlags();
  const pilotValidation = pilotFlags.validatePilotConfig();
  const drifts = [];

  // Queue Sovereignty (ORG-1)
  const queueApi = _readSrc('aioiQueueApiService.js');
  const queueCode = _stripComments(queueApi).toLowerCase();
  drifts.push(_checkDrift('GD-Q01', 'Queue Sovereignty',
    queueCode.includes('aioi_executive_queue_snapshot') && !queueCode.includes('f47'),
    { queue_active: flags.IMPETUS_AIOI_QUEUE_ACTIVE, doc: !!_readDoc('AIOI_QUEUE_PRECEDENCE_CONTRACT.md') }
  ));

  // Truth Sovereignty (ORG-2)
  const ingestion = _readSrc('aioiEventIngestionService.js');
  const truthForbidden = ['industrialTruthEnforcementService'];
  const truthOk = truthForbidden.every(f => !ingestion.includes(f));
  drifts.push(_checkDrift('GD-T01', 'Truth Sovereignty',
    truthOk && ingestion.includes('truth_state'),
    { doc: !!_readDoc('AIOI_TRUTH_STAGE7_CERTIFICATION_CONTRACT.md') }
  ));

  // Workflow Governance (ORG-5)
  const classification = _readSrc('aioiClassificationEngine.js');
  drifts.push(_checkDrift('GD-W01', 'Workflow Governance',
    classification.includes("status !== 'open'") || classification.includes("status     = 'open'"),
    { doc: !!_readDoc('AIOI_WORKFLOW_GOVERNANCE_CONTRACT.md') }
  ));

  // Pilot Governance (P2)
  drifts.push(_checkDrift('GD-P01', 'Pilot Governance',
    pilotFlags.MAX_PILOT_TENANTS === 3 && !!_readDoc('AIOI_PILOT_GOVERNANCE_CONTRACT.md'),
    { pilot_config_ok: pilotValidation.ok, tenant_count: pilotValidation.pilot_tenants.length }
  ));

  // Execution Governance (P1)
  const execution = _readSrc('aioiExecutionBridgeService.js');
  drifts.push(_checkDrift('GD-E01', 'Execution Governance',
    execution.includes('validateExecutionEligibility') && execution.includes('approved_by_user_id'),
    { doc: !!_readDoc('AIOI_EXECUTION_BRIDGE_CERTIFICATION.md') }
  ));

  // Learning Governance (P1)
  const learning = _readSrc('aioiLearningBridgeService.js');
  const learningCode = _stripComments(learning).toLowerCase();
  drifts.push(_checkDrift('GD-L01', 'Learning Governance',
    learning.includes("status = 'resolved'") && !learningCode.includes('weight_version') && !learningCode.includes('rerank'),
    { doc: !!_readDoc('AIOI_LEARNING_BRIDGE_CERTIFICATION.md') }
  ));

  // Runtime invariants (P0/P8)
  const metaPath = path.join(BACKEND_ROOT, 'src/modules/aioi/aiAssistantRuntimeService.metadata.js');
  let runtimeOk = true;
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    runtimeOk = !/"cognitive_execution_allowed"\s*:\s*true/.test(meta)
      && !/"runtime_enabled"\s*:\s*true/.test(meta);
  }
  drifts.push(_checkDrift('GD-R01', 'Runtime Invariants',
    runtimeOk,
    { aioi_enabled: flags.IMPETUS_AIOI_ENABLED, runtime_cognitive: false }
  ));

  const driftCount = drifts.filter(d => d.drift_detected).length;

  return {
    ok: driftCount === 0,
    layer: LAYER,
    drift_detected: driftCount > 0,
    drift_count: driftCount,
    total_domains: drifts.length,
    domains: drifts,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  detectGovernanceDrift,
  LAYER
};
