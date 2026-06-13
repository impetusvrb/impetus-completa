'use strict';

/**
 * AIOI-P5.1 — Enterprise Governance Service
 *
 * Snapshot de governança enterprise — READ ONLY.
 * Spec: backend/docs/AIOI_ENTERPRISE_GOVERNANCE_SPECIFICATION.md
 */

const pilotFlags = require('./aioiPilotFlags');
const governanceDrift = require('./aioiGovernanceDriftService');
const scalabilityValidation = require('./aioiScalabilityValidationService');
const slaCompliance = require('./aioiSlaComplianceService');
const tenantCapacity = require('./aioiTenantCapacityService');

const LAYER = 'AIOI_ENTERPRISE_GOVERNANCE';

function _computeMaturityScore({ drift, scalability, sla, pilotOk }) {
  let score = 100;
  if (drift.drift_detected) score -= drift.drift_count * 10;
  if (!scalability.validated) score -= 15;
  if (sla.sla_compliance_rate < 80) score -= 10;
  if (!pilotOk) score -= 10;
  return Math.max(0, Math.min(100, score));
}

/**
 * Snapshot de compliance e governança enterprise.
 * @returns {Promise<object>}
 */
async function getGovernanceComplianceSnapshot() {
  const [drift, scalability, sla, capacity, pilotValidation] = await Promise.all([
    Promise.resolve(governanceDrift.detectGovernanceDrift()),
    scalabilityValidation.validateScalability(),
    slaCompliance.getSlaComplianceSnapshot(),
    tenantCapacity.getTenantCapacitySnapshot(),
    Promise.resolve(pilotFlags.validatePilotConfig())
  ]);

  const flags = pilotFlags.getAioiFlags();
  const maturityScore = _computeMaturityScore({
    drift,
    scalability,
    sla,
    pilotOk: pilotValidation.ok
  });

  const policyAdherence = {
    queue_sovereignty:    drift.domains.find(d => d.domain === 'Queue Sovereignty')?.pass ?? false,
    truth_sovereignty:    drift.domains.find(d => d.domain === 'Truth Sovereignty')?.pass ?? false,
    workflow_governance:  drift.domains.find(d => d.domain === 'Workflow Governance')?.pass ?? false,
    pilot_governance:     drift.domains.find(d => d.domain === 'Pilot Governance')?.pass ?? false,
    execution_governance: drift.domains.find(d => d.domain === 'Execution Governance')?.pass ?? false,
    learning_governance:  drift.domains.find(d => d.domain === 'Learning Governance')?.pass ?? false,
    runtime_invariants:   drift.domains.find(d => d.domain === 'Runtime Invariants')?.pass ?? false
  };

  const adherenceCount = Object.values(policyAdherence).filter(Boolean).length;
  const adherencePct = Math.round((adherenceCount / Object.keys(policyAdherence).length) * 10000) / 100;

  return {
    ok: true,
    layer: LAYER,
    governance_compliance_snapshot: {
      drift_detected:     drift.drift_detected,
      drift_count:        drift.drift_count,
      scalability_valid:  scalability.validated,
      sla_compliance_rate: sla.sla_compliance_rate,
      flags
    },
    governance_maturity_score: maturityScore,
    policy_adherence: {
      policies:           policyAdherence,
      adherence_pct:    adherencePct,
      all_policies_met:   adherenceCount === Object.keys(policyAdherence).length
    },
    operational_governance_summary: {
      pilot_tenant_count: capacity.pilot_tenant_count,
      avg_saturation:     capacity.aggregate.avg_saturation_score,
      sla_pressure:       capacity.aggregate.sla_pressure_total,
      aioi_enabled:       flags.IMPETUS_AIOI_ENABLED
    },
    tenant_governance_posture: capacity.tenants.map(t => ({
      company_id:       t.company_id,
      saturation_level: t.tenant_operational_saturation?.level,
      sla_pressure:     t.tenant_sla_pressure?.at_risk_or_breached,
      queue_pending:    t.tenant_queue_volume?.pending
    })),
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getGovernanceComplianceSnapshot,
  LAYER
};
