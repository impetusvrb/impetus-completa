'use strict';

module.exports = { continueWorkflow: (wf) => ({ ...wf, continuity_state: 'continued' }) };
