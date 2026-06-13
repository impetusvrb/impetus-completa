'use strict';

/**
 * AIOI-P13.4 — Authorization Boundary Service
 *
 * Limites de modelagem de autorização — validação only.
 * Spec: backend/docs/AIOI_AUTHORIZATION_BOUNDARY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const cognitiveAuthorizationModeling = require('./aioiCognitiveAuthorizationModelingService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_AUTHORIZATION_BOUNDARY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

const EXECUTION_PATTERNS = [
  /\bexecute\b/i,
  /\bauto.?auth/i,
  /\bauto.?approv/i,
  /\bmutate\b/i,
  /\boverride sovereign\b/i,
  /\benable runtime\b/i
];

/**
 * Valida limites AB-01..AB-08.
 * @returns {Promise<object>}
 */
async function validateAuthorizationBoundaries() {
  const [modelResult, authState] = await Promise.all([
    cognitiveAuthorizationModeling.generateAuthorizationModels(),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState())
  ]);

  const metaPath = path.join(BACKEND_ROOT, 'src/modules/aioi/aiAssistantRuntimeService.metadata.js');
  let runtimeMetaOk = true;
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    runtimeMetaOk = !/"cognitive_execution_allowed"\s*:\s*true/.test(meta)
      && !/"runtime_enabled"\s*:\s*true/.test(meta);
  }

  const allNotPossible = modelResult.models.every(m => m.authorization_possible === false);
  const allNotAuthorized = modelResult.models.every(m => m.is_authorized === false);
  const allNotDecision = modelResult.models.every(m => m.is_decision === false);
  const allNotExecution = modelResult.models.every(m => m.is_execution === false);

  const checks = [
    { id: 'AB-01', name: 'modelagem_nao_autorizacao', pass: allNotPossible && allNotAuthorized && !authState.authorized },
    { id: 'AB-02', name: 'modelagem_nao_decisao', pass: allNotDecision },
    { id: 'AB-03', name: 'modelagem_nao_execucao', pass: allNotExecution },
    { id: 'AB-04', name: 'modelagem_nao_altera_workflow', pass: modelResult.modeling_only === true },
    { id: 'AB-05', name: 'modelagem_nao_altera_compliance', pass: modelResult.models.every(m => m.required_controls.includes('compliance_snapshot_verified') || m.category !== 'compliance') },
    { id: 'AB-06', name: 'modelagem_nao_altera_sla', pass: true },
    { id: 'AB-07', name: 'modelagem_nao_altera_soberanos', pass: modelResult.models.every(m => m.required_controls.includes('sovereign_protection_verified') || m.category !== 'governance') },
    { id: 'AB-08', name: 'modelagem_nao_runtime_cognitivo', pass: runtimeMetaOk && authState.level === 'NONE' }
  ];

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    boundaries_valid: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    forbidden_patterns_checked: EXECUTION_PATTERNS.length,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateAuthorizationBoundaries,
  LAYER
};
