'use strict';

const f = require('../config/sz4FeatureFlags');
module.exports = { ms: () => f.cognitiveThrottleMs() };
