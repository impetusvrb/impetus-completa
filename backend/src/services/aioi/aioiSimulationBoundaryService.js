'use strict';

/**
 * AIOI-P14.4 — Simulation Boundary Service
 *
 * Limites de simulação cognitiva — validação only.
 * Spec: backend/docs/AIOI_SIMULATION_BOUNDARY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const cognitiveSimulation = require('./aioiCognitiveSimulationService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_SIMULATION_BOUNDARY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

const EXECUTION_PATTERNS = [
  /\bexecute\b/i,
  /\bauto.?approv/i,
  /\bauto.?auth/i,
  /\bmutate\b/i,
  /\boverride sovereign\b/i,
  /\benable runtime\b/i
];

/**
 * Valida limites SB-01..SB-08.
 * @returns {Promise<object>}
 */
async function validateSimulationBoundaries() {
  const [simResult, authState] = await Promise.all([
    cognitiveSimulation.generateControlledSimulations(),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState())
  ]);

  const metaPath = path.join(BACKEND_ROOT, 'src/modules/aioi/aiAssistantRuntimeService.metadata.js');
  let runtimeMetaOk = true;
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    runtimeMetaOk = !/"cognitive_execution_allowed"\s*:\s*true/.test(meta)
      && !/"runtime_enabled"\s*:\s*true/.test(meta);
  }

  const textViolations = [];
  for (const sim of simResult.simulations) {
    const texts = [sim.scenario_description, JSON.stringify(sim.simulated_outcomes)];
    for (const text of texts) {
      for (const pattern of EXECUTION_PATTERNS) {
        if (pattern.test(text)) {
          textViolations.push({ simulation_id: sim.simulation_id, pattern: pattern.source });
        }
      }
    }
  }

  const allNotExecution = simResult.simulations.every(s => s.is_execution === false);
  const allNotDecision = simResult.simulations.every(s => s.is_decision === false);
  const allNotAuthorized = simResult.simulations.every(s => s.is_authorized === false);
  const allNoRealEffects = simResult.simulations.every(s => s.produces_real_effects === false);
  const allIsolated = simResult.simulations.every(s => s.simulation_scope === 'ISOLATED_HYPOTHETICAL');

  const checks = [
    { id: 'SB-01', name: 'simulacao_nao_execucao', pass: allNotExecution && allNoRealEffects && textViolations.length === 0 },
    { id: 'SB-02', name: 'simulacao_nao_decisao', pass: allNotDecision },
    { id: 'SB-03', name: 'simulacao_nao_autorizacao', pass: allNotAuthorized && !authState.authorized },
    { id: 'SB-04', name: 'simulacao_nao_altera_workflow', pass: simResult.simulations.every(s => s.simulated_outcomes.workflow_mutation === false) },
    { id: 'SB-05', name: 'simulacao_nao_altera_compliance', pass: simResult.simulations.every(s => s.simulated_outcomes.compliance_mutation === false) },
    { id: 'SB-06', name: 'simulacao_nao_altera_sla', pass: simResult.simulations.every(s => s.simulated_outcomes.sla_mutation === false) },
    { id: 'SB-07', name: 'simulacao_nao_altera_soberanos', pass: simResult.simulations.every(s => s.simulated_outcomes.sovereign_mutation === false) },
    { id: 'SB-08', name: 'simulacao_nao_runtime_cognitivo', pass: runtimeMetaOk && authState.level === 'NONE' && allIsolated }
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
    text_violations: textViolations,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateSimulationBoundaries,
  LAYER
};
