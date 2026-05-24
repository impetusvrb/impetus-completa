'use strict';

module.exports = { states: ['open','in_progress','blocked','done'], transition: (s, n) => ({ from: s, to: n, hitl: true }) };
