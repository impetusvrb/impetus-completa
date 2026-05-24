'use strict';

module.exports = { applyFallback: ({ tenantId, error }) => ({ skipped: true, fallback: true, tenant_id: tenantId, error }) };
