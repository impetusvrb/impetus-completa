'use strict';

const store = require('../_core/sz4TenantStore');
module.exports = { list: (tid) => store.listWorkflows(tid) };
