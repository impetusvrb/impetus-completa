'use strict';

module.exports = { score: (signals) => ({ pressure: Math.min(1, (signals||[]).length / 5) }) };
