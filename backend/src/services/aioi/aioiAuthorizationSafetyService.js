'use strict';

/**
 * AIOI-P13.5 — Authorization Safety Service
 *
 * Regras de segurança para modelagem de autorização — READ ONLY.
 * Spec: backend/docs/AIOI_AUTHORIZATION_SAFETY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const cognitiveAuthorizationModeling = require('./aioiCognitiveAuthorizationModelingService');
const authorizationBoundary = require('./aioiAuthorizationBoundaryService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_AUTHORIZATION_SAFETY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

/**
 * Valida regras AS-01..AS-08.
 * @returns {Promise<object>}
 */
async function validateAuthorizationSafety() {
  const [modelResult, boundaries, authState] = await Promise.all([
    cognitiveAuthorizationModeling.generateAuthorizationModels(),
    authorizationBoundary.validateAuthorizationBoundaries(),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState())
  ]);

  const metaPath = path.join(BACKEND_ROOT, 'src/modules/aioi/aiAssistantRuntimeService.metadata.js');
  let runtimeMetaOk = true;
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    runtimeMetaOk = !/"cognitive_execution_allowed"\s*:\s*true/.test(meta);
  }

  const checks = [
    { id: 'AS-01', name: 'sem_auto_autorizacao', pass: modelResult.models.every(m => m.authorization_possible === false) },
    { id: 'AS-02', name: 'sem_auto_execucao', pass: modelResult.models.every(m => m.is_execution === false) },
    { id: 'AS-03', name: 'sem_auto_decisao', pass: modelResult.models.every(m => m.is_decision === false) },
    { id: 'AS-04', name: 'sem_alteracao_estados', pass: modelResult.all_authorization_denied },
    { id: 'AS-05', name: 'sem_alteracao_workflow', pass: boundaries.checks.find(c => c.id === 'AB-04')?.pass !== false },
    { id: 'AS-06', name: 'sem_alteracao_compliance', pass: boundaries.checks.find(c => c.id === 'AB-05')?.pass !== false },
    { id: 'AS-07', name: 'sem_alteracao_soberanos', pass: boundaries.checks.find(c => c.id === 'AB-07')?.pass !== false },
    { id: 'AS-08', name: 'sem_runtime_cognitivo', pass: runtimeMetaOk && !authState.invariants.cognitive_execution_allowed }
  ];

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    safety_valid: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    invariants: authState.invariants,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateAuthorizationSafety,
  LAYER
};
