'use strict';

/**
 * AIOI-P6.5 — Operational Risk Register Service
 *
 * Registo de riscos operacionais enterprise — READ ONLY.
 * Spec: backend/docs/AIOI_OPERATIONAL_RISK_REGISTER_SPECIFICATION.md
 */

const governanceDrift = require('./aioiGovernanceDriftService');
const certificationDrift = require('./aioiCertificationDriftService');
const operationalHealth = require('./aioiOperationalHealthService');
const slaCompliance = require('./aioiSlaComplianceService');
const tenantCapacity = require('./aioiTenantCapacityService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const productionStability = require('./aioiProductionStabilityService');

const LAYER = 'AIOI_OPERATIONAL_RISK_REGISTER';

function _riskLevel(score) {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 15) return 'LOW';
  return 'MINIMAL';
}

/**
 * Registo consolidado de riscos operacionais.
 * @returns {Promise<object>}
 */
async function getOperationalRiskRegister() {
  const [health, sla, capacity, analytics, drift, certDrift, stability] = await Promise.all([
    operationalHealth.getHealthSnapshot(),
    slaCompliance.getSlaComplianceSnapshot(),
    tenantCapacity.getTenantCapacitySnapshot(),
    complianceAnalytics.getComplianceAnalytics(),
    Promise.resolve(governanceDrift.detectGovernanceDrift()),
    Promise.resolve(certificationDrift.detectCertificationDrift()),
    Promise.resolve(productionStability.getStabilitySnapshot())
  ]);

  const governanceRisk = {
    drift_detected:              drift.drift_detected,
    drift_count:                 drift.drift_count,
    certification_drift_detected: certDrift.certification_drift_detected,
    certification_drift_count:   certDrift.drift_count,
    score: drift.drift_count * 15 + certDrift.drift_count * 10,
    level: _riskLevel(drift.drift_count * 15 + certDrift.drift_count * 10)
  };

  const operationalRisk = {
    health_status:    health.status,
    failed_cycles:    stability.failed_cycles,
    outbox_failed:    health.outbox_failed,
    worker_running:   health.worker_running,
    score: (health.status === 'DEGRADED' ? 40 : 0)
      + (stability.failed_cycles > 0 ? 20 : 0)
      + (health.outbox_failed > 5 ? 25 : 0),
    level: _riskLevel(
      (health.status === 'DEGRADED' ? 40 : 0)
      + (stability.failed_cycles > 0 ? 20 : 0)
    )
  };

  const slaRisk = {
    breached:         sla.sla_breached,
    at_risk:          sla.sla_at_risk,
    compliance_rate:  sla.sla_compliance_rate,
    score: sla.sla_breached * 20 + sla.sla_at_risk * 5,
    level: _riskLevel(sla.sla_breached * 20 + sla.sla_at_risk * 5)
  };

  const saturatedTenants = capacity.tenants.filter(
    t => t.tenant_operational_saturation?.level === 'WARNING'
      || t.tenant_operational_saturation?.level === 'CRITICAL'
  ).length;

  const capacityRisk = {
    avg_saturation:   capacity.aggregate.avg_saturation_score,
    saturated_tenants: saturatedTenants,
    sla_pressure:     capacity.aggregate.sla_pressure_total,
    score: Math.round(capacity.aggregate.avg_saturation_score * 0.5)
      + saturatedTenants * 15
      + capacity.aggregate.sla_pressure_total * 5,
    level: _riskLevel(Math.round(capacity.aggregate.avg_saturation_score * 0.5) + saturatedTenants * 15)
  };

  const tenantRisk = {
    pilot_tenant_count: capacity.pilot_tenant_count,
    tenants_at_risk:    capacity.tenants.filter(t => t.tenant_sla_pressure?.at_risk_or_breached).length,
    score: capacity.tenants.filter(t => t.tenant_sla_pressure?.at_risk_or_breached).length * 20,
    level: _riskLevel(capacity.tenants.filter(t => t.tenant_sla_pressure?.at_risk_or_breached).length * 20)
  };

  const complianceRisk = {
    overall_score:          analytics.overall_compliance_score,
    governance_compliance:  analytics.governance_compliance,
    workflow_compliance:    analytics.workflow_compliance,
    score: Math.max(0, 100 - analytics.overall_compliance_score),
    level: _riskLevel(Math.max(0, 100 - analytics.overall_compliance_score))
  };

  const categoryScores = [
    governanceRisk.score,
    operationalRisk.score,
    slaRisk.score,
    capacityRisk.score,
    tenantRisk.score,
    complianceRisk.score
  ];
  const riskScore = Math.min(100, Math.round(categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length));

  const riskTrend = analytics.compliance_trends?.dlq_trend === 'UP'
    || analytics.compliance_trends?.health_trend === 'DOWN'
    ? 'ELEVATING'
    : analytics.compliance_trends?.sla_trend === 'UP'
      ? 'IMPROVING'
      : 'STABLE';

  return {
    ok: true,
    layer: LAYER,
    governance_risk:   governanceRisk,
    operational_risk:  operationalRisk,
    sla_risk:          slaRisk,
    capacity_risk:     capacityRisk,
    tenant_risk:       tenantRisk,
    compliance_risk:   complianceRisk,
    risk_trend:        riskTrend,
    risk_score:        riskScore,
    risk_level:        _riskLevel(riskScore),
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getOperationalRiskRegister,
  LAYER
};
