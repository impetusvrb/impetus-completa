'use strict';

const store = require('../_core/sz4TenantStore');
module.exports = { save: store.saveTask, list: store.listTasks };
