'use strict';

const hitl = require('../config/sz4HitlPolicies');
module.exports = { envelope: (a, u) => hitl.buildHitlEnvelope(a, u) };
