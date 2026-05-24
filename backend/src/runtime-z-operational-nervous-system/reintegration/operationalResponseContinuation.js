'use strict';

module.exports = { continue: (ctx) => ({ continuation_score: ctx?.continuation_score || 0.5 }) };
