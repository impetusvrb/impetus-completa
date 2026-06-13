'use strict';

/**
 * AIOI-P14.7 — Executive Simulation Report Service
 *
 * Relatório executivo de simulação cognitiva — READ ONLY.
 */

const cognitiveSimulation = require('./aioiCognitiveSimulationService');
const simulationCatalog = require('./aioiSimulationCatalogService');
const simulationEvidence = require('./aioiSimulationEvidenceService');
const simulationBoundary = require('./aioiSimulationBoundaryService');
const simulationSafety = require('./aioiSimulationSafetyService');
const simulationReadiness = require('./aioiSimulationReadinessService');
const authorityRegistry = require('./aioiCognitiveAuthorityRegistryService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_EXECUTIVE_SIMULATION_REPORT';

/**
 * Gera relatório executivo consolidado de simulação cognitiva.
 * @returns {Promise<object>}
 */
async function generateExecutiveSimulationReport() {
  const [simulations, catalog, evidence, boundaries, safety, readiness, registry, authState] = await Promise.all([
    cognitiveSimulation.generateControlledSimulations(),
    simulationCatalog.getSimulationCatalog(),
    simulationEvidence.getSimulationEvidenceChains(),
    simulationBoundary.validateSimulationBoundaries(),
    simulationSafety.validateSimulationSafety(),
    simulationReadiness.validateSimulationReadiness(),
    Promise.resolve(authorityRegistry.getCognitiveAuthorityRegistry()),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState())
  ]);

  const categoryBreakdown = {};
  for (const s of simulations.simulations) {
    categoryBreakdown[s.category] = (categoryBreakdown[s.category] || 0) + 1;
  }

  return {
    ok: true,
    layer: LAYER,
    simulation_summary: {
      total_simulations:  simulations.simulation_count,
      categories:         simulations.simulations.map(s => s.category),
      all_isolated:       simulations.all_isolated,
      no_real_effects:    simulations.no_real_effects,
      simulation_scope:   'ISOLATED_HYPOTHETICAL'
    },
    scenario_summary: {
      category_breakdown: categoryBreakdown,
      all_reversible:     simulations.simulations.every(s => s.simulated_outcomes.reversible === true),
      pending_human:      simulations.simulations.every(s => s.simulated_outcomes.projected_human_review === 'pending')
    },
    evidence_summary: {
      traceable_count:   evidence.traceable_count,
      total_simulations: evidence.total_simulations,
      all_have_evidence: evidence.all_have_evidence
    },
    governance_summary: {
      org_protected:      registry.org_sovereigns_protected,
      protected_count:    registry.protected_domains.length,
      catalog_total:      catalog.total_simulations,
      boundaries_valid:   boundaries.boundaries_valid,
      authorized:         authState.authorized
    },
    safety_summary: {
      safety_valid: safety.safety_valid,
      pass_count:   safety.pass_count,
      total_checks: safety.total_checks
    },
    simulation_readiness_summary: {
      simulation_readiness: readiness.simulation_readiness,
      pass_count:           readiness.pass_count,
      total_checks:         readiness.total_checks
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateExecutiveSimulationReport,
  LAYER
};
