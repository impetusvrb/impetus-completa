'use strict';
const { traceSummaryDelivery } = require('../../src/runtimeDeliveryAudit/summaryDeliveryTrace');
let f = 0;
const r = traceSummaryDelivery({ summary_text: 'SST no setor' }, { domain_axis: 'quality' });
if (!r.summary_delivery_audit.leakage_detected) {
  f = 1;
  console.log('FAIL leakage');
} else console.log('PASS summary trace');
process.exit(f);
