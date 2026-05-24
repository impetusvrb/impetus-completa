'use strict';

const gf = require('../config/sz4GovernanceFlags');
module.exports = { evaluate: (p) => gf.enforceAssistiveOnly(p), sanitize: gf.sanitizeExecutionPlan };
