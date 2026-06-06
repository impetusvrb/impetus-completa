'use strict';

/**
 * AIOI-P3.2 — Intelligence Compliance Service (READ ONLY)
 *
 * Avalia presença e coerência das camadas P2.1–P3.1 — composição exclusiva.
 */

const { isValidUUID } = require('../../utils/security');
const auditMetrics = require('./aioiAuditabilityMetrics');
const governanceReadModel = require('./aioiGovernanceReadModelService');
const predictiveReadModel = require('./aioiPredictiveGovernanceReadModelService');
const maturityReadModel = require('./aioiExecutiveMaturityReadModelService');
const strategicReadModel = require('./aioiStrategicReadModelService');
const valueReadModel = require('./aioiValueReadModelService');
const resilienceReadModel = require('./aioiResilienceReadModelService');
const scenarioReadModel = require('./aioiScenarioReadModelService');
const digitalTwinReadModel = require('./aioiDigitalTwinReadModelService');
const executiveCommandReadModel = require('./aioiExecutiveCommandReadModelService');
const trustReadModel = require('./aioiTrustReadModelService');
const assuranceReadModel = require('./aioiAssuranceReadModelService');

const COMPLIANCE_LAYERS = Object.freeze([
  { key: 'P2.1', check: r => r?.governance_read_model },
  { key: 'P2.2', check: r => r?.predictive_governance_read_model },
  { key: 'P2.3', check: r => r?.executive_maturity_read_model },
  { key: 'P2.4', check: r => r?.strategic_read_model },
  { key: 'P2.5', check: r => r?.value_read_model },
  { key: 'P2.6', check: r => r?.resilience_read_model },
  { key: 'P2.7', check: r => r?.scenario_read_model },
  { key: 'P2.8', check: r => r?.digital_twin_read_model },
  { key: 'P2.9', check: r => r?.executive_command_read_model },
  { key: 'P3.0', check: r => r?.trust_read_model },
  { key: 'P3.1', check: r => r?.assurance_read_model }
]);

function _extractLayerData(results) {
  return {
    governance_read_model:           results[0].ok ? results[0] : null,
    predictive_governance_read_model: results[1].ok ? results[1] : null,
    executive_maturity_read_model:   results[2].ok ? results[2] : null,
    strategic_read_model:            results[3].ok ? results[3] : null,
    value_read_model:                results[4].ok ? results[4] : null,
    resilience_read_model:           results[5].ok ? results[5] : null,
    scenario_read_model:             results[6].ok ? results[6] : null,
    digital_twin_read_model:         results[7].ok ? results[7] : null,
    executive_command_read_model:    results[8].ok ? results[8] : null,
    trust_read_model:                results[9].ok ? results[9] : null,
    assurance_read_model:            results[10].ok ? results[10] : null
  };
}

function computeComplianceScore(layerData) {
  let present = 0;
  for (const layer of COMPLIANCE_LAYERS) {
    if (layer.check(layerData)) present++;
  }

  let score = Math.round((present / COMPLIANCE_LAYERS.length) * 85);

  const assurance = layerData.assurance_read_model?.assurance_read_model?.intelligence_assurance;
  if (assurance?.assurance_score >= 70) score += 8;
  else if (assurance?.assurance_score >= 40) score += 4;

  const trust = layerData.trust_read_model?.trust_read_model?.intelligence_trust;
  if (trust?.trust_score >= 70) score += 7;
  else if (trust?.trust_score >= 40) score += 3;

  return auditMetrics.clampScore(score);
}

function buildIntelligenceCompliance(layerData) {
  const compliance_score = computeComplianceScore(layerData);
  return {
    compliance_score,
    compliance_status: auditMetrics.classifyComplianceStatus(compliance_score)
  };
}

async function getIntelligenceCompliance(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const results = await Promise.all([
      governanceReadModel.getGovernanceReadModel(companyId),
      predictiveReadModel.getPredictiveGovernanceReadModel(companyId),
      maturityReadModel.getExecutiveMaturityReadModel(companyId),
      strategicReadModel.getStrategicReadModel(companyId),
      valueReadModel.getValueReadModel(companyId),
      resilienceReadModel.getResilienceReadModel(companyId),
      scenarioReadModel.getScenarioReadModel(companyId),
      digitalTwinReadModel.getDigitalTwinReadModel(companyId),
      executiveCommandReadModel.getExecutiveCommandReadModel(companyId),
      trustReadModel.getTrustReadModel(companyId),
      assuranceReadModel.getAssuranceReadModel(companyId)
    ]);

    const failures = results.filter(r => !r.ok);
    if (failures.length === results.length) {
      auditMetrics.recordError(companyId, 'getIntelligenceCompliance', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const layerData = _extractLayerData(results);
    const intelligence_compliance = buildIntelligenceCompliance(layerData);
    auditMetrics.recordComplianceAnalyzed(companyId);
    return { ok: true, intelligence_compliance };

  } catch (err) {
    auditMetrics.recordError(companyId, 'getIntelligenceCompliance', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  COMPLIANCE_LAYERS,
  computeComplianceScore,
  buildIntelligenceCompliance,
  getIntelligenceCompliance
};
