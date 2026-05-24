'use strict';

const p = require('../config/sz4ObservationPolicy');
module.exports = { score: (text, ctx) => p.shouldObserveMessage(text, ctx).relevance_score };
