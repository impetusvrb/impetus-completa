'use strict';

/**
 * AIOI-P14.5 — Simulation Safety Service
 *
 * Regras de segurança para simulação — READ ONLY.
 * Spec: backend/docs/AIOI_SIMULATION_SAFETY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const cognitiveSimulation = require('./aioiCognitiveSimulationService');
const simulationBoundary = require('./aioiSimulationBoundaryService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_SIMULATION_SAFETY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

/**
 * Valida regras SS-01..SS-08.
 * @returns {Promise<object>}
 */
async function validateSimulationSafety() {
  const [simResult, boundaries, authState] = await Promise.all([
    cognitiveSimulation.generateControlledSimulations(),
    simulationBoundary.validateSimulationBoundaries(),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState())
  ]);

  const metaPath = path.join(BACKEND_ROOT, 'src/modules/aioi/aiAssistantRuntimeService.metadata.js');
  let runtimeMetaOk = true;
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    runtimeMetaOk = !/"cognitive_execution_allowed"\s*:\s*true/.test(meta);
  }

  const checks = [
    { id: 'SS-01', name: 'sem_execucao_real', pass: simResult.no_real_effects && simResult.simulations.every(s => s.is_execution === false) },
    { id: 'SS-02', name: 'sem_alteracao_estado', pass: simResult.simulations.every(s => s.simulated_outcomes.state_mutation === false) },
    { id: 'SS-03', name: 'sem_alteracao_workflow', pass: boundaries.checks.find(c => c.id === 'SB-04')?.pass !== false },
    { id: 'SS-04', name: 'sem_alteracao_compliance', pass: boundaries.checks.find(c => c.id === 'SB-05')?.pass !== false },
    { id: 'SS-05', name: 'sem_alteracao_sla', pass: boundaries.checks.find(c => c.id === 'SB-06')?.pass !== false },
    { id: 'SS-06', name: 'sem_alteracao_soberanos', pass: boundaries.checks.find(c => c.id === 'SB-07')?.pass !== false },
    { id: 'SS-07', name: 'sem_autorizacao_operacional', pass: !authState.authorized && simResult.simulations.every(s => s.is_authorized === false) },
    { id: 'SS-08', name: 'sem_runtime_cognitivo', pass: runtimeMetaOk && !authState.invariants.cognitive_execution_allowed }
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
  validateSimulationSafety,
  LAYER
};
