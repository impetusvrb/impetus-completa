'use strict';

module.exports = { recover: (tid, thread) => require('../_core/sz4TenantStore').getThreadContext(tid, thread) };
