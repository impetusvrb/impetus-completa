'use strict';

const { isPilotTenant, listPilotTenants, getPilotTenant } = require('./pilotTenantRegistry');
const { assessPilotTenantReadiness } = require('./pilotTenantReadiness');
const { assessPilotGovernanceHealth } = require('./pilotTenantGovernanceHealth');
const { assessPilotRollbackSafety } = require('./pilotTenantRollbackSafety');

function supervisePilotTenant(tenantId, user, ctx = {}) {
  return {
    tenant_id: tenantId,
    pilot: isPilotTenant(tenantId),
    registry: getPilotTenant(tenantId),
    readiness: assessPilotTenantReadiness(tenantId, user, ctx),
    health: assessPilotGovernanceHealth(tenantId, user, ctx),
    rollback: assessPilotRollbackSafety(tenantId, ctx),
    all_pilots: listPilotTenants()
  };
}

module.exports = { supervisePilotTenant };
