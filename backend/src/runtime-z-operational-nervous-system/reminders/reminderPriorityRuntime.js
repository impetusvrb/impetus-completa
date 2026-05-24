'use strict';

const nlp = require('../_core/sz4EntityExtractor');
module.exports = { priority: (entities) => nlp.classifyPriority(entities || {}) };
