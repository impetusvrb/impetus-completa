'use strict';

/**
 * AIOI-P2.8 — Operational State Service (READ ONLY)
 *
 * Estado atual consolidado — composição P2.1/P2.3/P2.4/P2.5/P2.6, sem reimplementação.
 */

const { isValidUUID } = require('../../utils/security');
const twinMetrics = require('./aioiDigitalTwinMetrics');
const snapshotService = require('./aioiExecutiveSnapshotService');
const tenantHealthService = require('./aioiTenantHealthService');
const maturityService = require('./aioiMaturityAnalysisService');
const alignmentService = require('./aioiStrategicAlignmentService');
const valueService = require('./aioiOperationalValueService');
const resilienceService = require('./aioiOperationalResilienceService');

function buildOperationalState({
  snapshot,
  tenantHealth,
  maturity,
  strategicAlignment,
  operationalValue,
  operationalResilience
}) {
  return {
    executive_snapshot:   snapshot,
    governance_status:    tenantHealth.status,
    maturity_level:       maturity.level,
    strategic_alignment:  strategicAlignment,
    operational_value:    operationalValue,
    resilience_status:    operationalResilience.resilience_status
  };
}

async function getOperationalState(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [snapshotRes, healthRes, maturityRes, alignmentRes, valueRes, resilienceRes] =
      await Promise.all([
        snapshotService.getExecutiveSnapshot(companyId),
        tenantHealthService.getTenantHealth(companyId),
        maturityService.getOperationalMaturity(companyId),
        alignmentService.getStrategicAlignment(companyId),
        valueService.getOperationalValue(companyId),
        resilienceService.getOperationalResilience(companyId)
      ]);

    const failures = [snapshotRes, healthRes, maturityRes, alignmentRes, valueRes, resilienceRes]
      .filter(r => !r.ok);
    if (failures.length) {
      twinMetrics.recordError(companyId, 'getOperationalState', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const operational_state = buildOperationalState({
      snapshot:            snapshotRes.snapshot,
      tenantHealth:        healthRes.tenant_health,
      maturity:            maturityRes.maturity,
      strategicAlignment:  alignmentRes.strategic_alignment,
      operationalValue:    valueRes.operational_value,
      operationalResilience: resilienceRes.operational_resilience
    });

    twinMetrics.recordOperationalStateAnalyzed(companyId);
    return { ok: true, operational_state };

  } catch (err) {
    twinMetrics.recordError(companyId, 'getOperationalState', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildOperationalState,
  getOperationalState
};
