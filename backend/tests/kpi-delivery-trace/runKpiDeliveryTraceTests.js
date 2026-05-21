'use strict';
const { traceKpiDelivery } = require('../../src/runtimeDeliveryAudit/kpiDeliveryTrace');
let p = 0,
  f = 0;
function a(c, m) {
  if (c) {
    p++;
    console.log('  PASS', m);
  } else {
    f++;
    console.log('  FAIL', m);
  }
}
const r = traceKpiDelivery(
  { original_kpis: [{ key: 'oee' }], final_kpis: [{ key: 'oee' }] },
  { domain_axis: 'quality', hierarchy_tier: 'coordination' }
);
a(r.kpi_delivery_audit.final_kpis.includes('oee'), 'kpi trace');
process.exit(f ? 1 : 0);
