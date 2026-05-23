'use strict';

const DENIED = /apr\/pt|loto|ncr-\d|operador\s+\w+|linha_[a-z]|sensor_id|scrap_qty|throughput turno/i;

function validateExecutiveGovernance(payload = {}, consolidated = {}) {
  const blob = JSON.stringify({ payload, centers: consolidated.centers });
  const operational_leak = DENIED.test(blob);
  return {
    governance_ok: !operational_leak,
    operational_leak_detected: operational_leak,
    strategic_aggregation_only: true
  };
}

module.exports = { validateExecutiveGovernance };
