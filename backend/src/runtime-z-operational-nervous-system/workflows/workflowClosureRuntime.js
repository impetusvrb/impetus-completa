'use strict';

module.exports = { closePrepared: (wf) => ({ ...wf, closure_state: 'pending_hitl' }) };
