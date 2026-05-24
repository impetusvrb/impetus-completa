'use strict';

const nlp = require('../_core/sz4EntityExtractor');
module.exports = { resolveIntent: (text) => nlp.inferIntent(nlp.extractEntities(text), text) };
