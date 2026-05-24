'use strict';

const { enforceAssistiveOnly } = require('../config/sz2GovernanceFlags');

function sanitizeActions(actions = []) {
  return (Array.isArray(actions) ? actions : []).map((a) => enforceAssistiveOnly(a));
}

module.exports = { sanitizeActions };
