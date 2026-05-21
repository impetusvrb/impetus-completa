'use strict';

const { measureRuntimeOperationalUsefulness } = require('./runtimeOperationalUsefulness');
const { assessTenantOperationalSignalQuality } = require('./tenantOperationalSignalQuality');
const { assessGovernanceOperationalValue } = require('./governanceOperationalValue');
const { assessRuntimeDecisionUsefulness } = require('./runtimeDecisionUsefulness');

function assessOperationalUsefulness(tenantId, pack = {}, ctx = {}) {
  const usefulness = measureRuntimeOperationalUsefulness(pack);
  const signal = assessTenantOperationalSignalQuality(ctx);
  const governance_value = assessGovernanceOperationalValue(pack.maturity || {}, pack.pressure || {});
  const decisions = assessRuntimeDecisionUsefulness(usefulness);

  return {
    phase: 'Z.10',
    tenant_id: tenantId,
    usefulness,
    signal,
    governance_value,
    decisions,
    cockpit_usefulness_preserved: signal.cockpit_signal_present !== false,
    recommendation_only: true,
    auto_remediate: false
  };
}

module.exports = { assessOperationalUsefulness };
