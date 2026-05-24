'use strict';

module.exports = { recover: (task) => ({ ...task, continuity_state: 'recovered' }) };
