'use strict';

const store = require('../_core/sz4TenantStore');
module.exports = { save: store.saveWorkflow, list: store.listWorkflows };
