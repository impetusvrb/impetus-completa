'use strict';

module.exports = { score: (task) => ({ continuity_state: task?.continuity_state || 'active' }) };
